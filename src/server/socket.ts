import { Server, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { db } from './db.js';
import { sendPushNotification } from './firebaseAdmin.js';

const JWT_SECRET = process.env.JWT_SECRET || 'supersecretkey';

// Map of userId -> Set of socketIds
const onlineUsers = new Map<number, Set<string>>();

// Pending calls for offline users or users who haven't answered yet
// Key: calleeUserId, Value: { callerId, callerSocketId, callerName, timestamp, timeoutId }
const pendingCalls = new Map<number, { callerId: number, callerSocketId: string, callerName: string, timestamp: number, timeoutId: NodeJS.Timeout }>();

export function setupSocket(io: Server) {
  io.use((socket, next) => {
    const token = socket.handshake.auth.token;
    if (!token) return next(new Error('Authentication error'));

    jwt.verify(token, JWT_SECRET, (err: any, decoded: any) => {
      if (err) return next(new Error('Authentication error'));
      socket.data.user = decoded;
      next();
    });
  });

  io.on('connection', async (socket) => {
    const userId = socket.data.user.id;
    let friends: any[] = [];
    
    if (!onlineUsers.has(userId)) {
      onlineUsers.set(userId, new Set());
    }
    onlineUsers.get(userId)!.add(socket.id);

    // Check if there's a pending call for this user
    const pendingCall = pendingCalls.get(userId);
    if (pendingCall) {
      // Check if the caller is still online
      const callerSockets = onlineUsers.get(pendingCall.callerId);
      if (callerSockets && callerSockets.size > 0 && callerSockets.has(pendingCall.callerSocketId)) {
        // Emit incoming call to the newly connected socket
        socket.emit('call_incoming', { 
          from: pendingCall.callerId, 
          name: pendingCall.callerName, 
          fromSocketId: pendingCall.callerSocketId 
        });
      } else {
        // Caller disconnected, clean up
        clearTimeout(pendingCall.timeoutId);
        pendingCalls.delete(userId);
      }
    }

    socket.on('disconnect', () => {
      const userSockets = onlineUsers.get(userId);
      if (userSockets) {
        userSockets.delete(socket.id);
        if (userSockets.size === 0) {
          onlineUsers.delete(userId);
          // Notify friends
          const friendsToNotify = socket.data.friends || [];
          friendsToNotify.forEach((friend: any) => {
            const friendSockets = onlineUsers.get(friend.id);
            if (friendSockets) {
              friendSockets.forEach(socketId => {
                io.to(socketId).emit('friend_offline', { userId });
              });
            }
          });
        }
      }
    });

    // WebRTC Signaling
    socket.on('call_user', async (data) => {
      const { userToCall, from, name } = data;
      const targetSockets = onlineUsers.get(userToCall);
      
      // Clear any existing pending call for this user
      if (pendingCalls.has(userToCall)) {
        clearTimeout(pendingCalls.get(userToCall)!.timeoutId);
        pendingCalls.delete(userToCall);
      }

      // Create a timeout to automatically cancel the call if not answered in 45 seconds
      const timeoutId = setTimeout(() => {
        if (pendingCalls.has(userToCall)) {
          pendingCalls.delete(userToCall);
          socket.emit('call_ended', { from: userToCall, reason: 'timeout' });
          
          // Optionally send a "Missed call" push notification here
        }
      }, 45000);

      pendingCalls.set(userToCall, {
        callerId: from,
        callerSocketId: socket.id,
        callerName: name,
        timestamp: Date.now(),
        timeoutId
      });

      // Always try to send a push notification to wake up the app
      try {
        const targetUser = await db.prepare('SELECT fcm_token FROM users WHERE id = ?').get(userToCall) as any;
        if (targetUser && targetUser.fcm_token) {
          const callId = crypto.randomUUID();
          await sendPushNotification(
            targetUser.fcm_token,
            'Входящий звонок',
            `Вам звонит ${name}`,
            { 
              type: 'incoming_call', 
              callId,
              callerId: String(from), 
              callerName: name,
              fromSocketId: socket.id,
              isVideo: 'true'
            }
          );
        }
      } catch (error) {
        console.error('Error sending push notification for call:', error);
      }

      if (targetSockets && targetSockets.size > 0) {
        targetSockets.forEach(socketId => {
          io.to(socketId).emit('call_incoming', { from, name, fromSocketId: socket.id });
        });
      } else {
        // If they have no active sockets, we still sent a push, but we let the caller know they are offline
        // Wait, if we sent a push, they might come online soon. We can emit a "ringing" state.
        socket.emit('call_ringing', { message: 'Ожидание ответа...' });
      }
    });

    socket.on('call_delivered', (data) => {
      const { to } = data;
      const targetSockets = onlineUsers.get(to);
      if (targetSockets) {
        targetSockets.forEach(socketId => {
          io.to(socketId).emit('call_delivered');
        });
      }
    });

    socket.on('answer_call', (data) => {
      const { toSocketId } = data;
      
      // Clear pending call if exists
      if (pendingCalls.has(userId)) {
        clearTimeout(pendingCalls.get(userId)!.timeoutId);
        pendingCalls.delete(userId);
      }

      io.to(toSocketId).emit('call_accepted', { from: userId, fromSocketId: socket.id });
      
      // Notify other tabs of the same user to dismiss the incoming call
      const myOtherSockets = onlineUsers.get(userId);
      if (myOtherSockets) {
        myOtherSockets.forEach(id => {
          if (id !== socket.id) {
            io.to(id).emit('call_answered_elsewhere');
          }
        });
      }
    });

    socket.on('webrtc_offer', (data) => {
      const { toSocketId, offer } = data;
      io.to(toSocketId).emit('webrtc_offer', { offer, from: userId, fromSocketId: socket.id });
    });

    socket.on('webrtc_answer', (data) => {
      const { toSocketId, answer } = data;
      io.to(toSocketId).emit('webrtc_answer', { answer, from: userId, fromSocketId: socket.id });
    });

    socket.on('webrtc_ice_candidate', (data) => {
      const { toSocketId, candidate } = data;
      io.to(toSocketId).emit('webrtc_ice_candidate', { candidate, from: userId, fromSocketId: socket.id });
    });

    socket.on('end_call', (data) => {
      const { toSocketId, to } = data;
      
      // If we are ending a call we initiated that is still pending
      if (to && pendingCalls.has(to)) {
        const pendingCall = pendingCalls.get(to);
        if (pendingCall && pendingCall.callerSocketId === socket.id) {
          clearTimeout(pendingCall.timeoutId);
          pendingCalls.delete(to);
        }
      }
      
      // If we are rejecting an incoming call
      if (pendingCalls.has(userId)) {
        clearTimeout(pendingCalls.get(userId)!.timeoutId);
        pendingCalls.delete(userId);
      }

      if (toSocketId) {
        io.to(toSocketId).emit('call_ended', { from: userId, fromSocketId: socket.id });
      } else if (to) {
        // Fallback if socketId is not known
        const targetSockets = onlineUsers.get(to);
        if (targetSockets) {
          targetSockets.forEach(socketId => {
            io.to(socketId).emit('call_ended', { from: userId, fromSocketId: socket.id });
          });
        }
      }
    });

    socket.on('user_busy', (data) => {
      const { toSocketId } = data;
      if (toSocketId) {
        io.to(toSocketId).emit('user_busy', { from: userId, fromSocketId: socket.id });
      }
    });

    socket.on('set_call_emojis', (data) => {
      const { toSocketId, emojis } = data;
      if (toSocketId) {
        io.to(toSocketId).emit('call_emojis', { emojis });
      }
    });

    try {
      await updateSocketFriends(io, socket, userId);
    } catch (err) {
      console.error('Error fetching friends for socket:', err);
    }

    socket.on('refresh_friends', async () => {
      try {
        await updateSocketFriends(io, socket, userId);
      } catch (err) {
        console.error('Error refreshing friends:', err);
      }
    });
  });
}

async function updateSocketFriends(io: Server, socket: Socket, userId: number) {
  // Notify friends that this user is online
  const friends = await db.prepare(`
    SELECT u.id 
    FROM friends f
    JOIN users u ON (f.user_id_1 = u.id AND f.user_id_2 = ?) OR (f.user_id_2 = u.id AND f.user_id_1 = ?)
  `).all(userId, userId);

  // Store friends list on socket for disconnect handler
  socket.data.friends = friends;

  // Update online status for friends
  // We need to use io to emit to specific socket IDs
  
  friends.forEach((friend: any) => {
    // Check if friend is online
    // We need to access the onlineUsers map which is in the closure of setupSocket
    // But we are outside. We can pass onlineUsers or make it global in module scope (it is).
    // onlineUsers is defined in module scope.
    const friendSockets = onlineUsers.get(friend.id);
    if (friendSockets) {
      friendSockets.forEach(socketId => {
        io.to(socketId).emit('friend_online', { userId });
      });
    }
  });

  // Send current online friends to the connected user
  const onlineFriends = friends.filter((f: any) => onlineUsers.has(f.id)).map((f: any) => f.id);
  socket.emit('online_friends', onlineFriends);
}
