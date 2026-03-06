import express from 'express';
import { createServer as createViteServer } from 'vite';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import jwt from 'jsonwebtoken';
import { db, initDb } from './src/server/db.js';
import { setupSocket } from './src/server/socket.js';
import { initFirebaseAdmin, admin } from './src/server/firebaseAdmin.js';
import authRoutes from './src/server/routes/auth.js';
import adminRoutes from './src/server/routes/admin.js';
import friendRoutes from './src/server/routes/friends.js';
import crypto from 'crypto';

dotenv.config();

// Initialize Firebase Admin for Push Notifications
initFirebaseAdmin();

const PORT = 3000;

async function startServer() {
  const app = express();
  const httpServer = createServer(app);
  
  // Initialize DB
  await initDb();

  // Setup Socket.io
  const io = new Server(httpServer, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST']
    }
  });
  setupSocket(io);

  app.use(cors());
  app.use(express.json());

  // Debug Push Route
  app.post('/api/debug/push', async (req, res) => {
    const { userId, type } = req.body;
    
    try {
      const user = await db.prepare('SELECT fcm_token FROM users WHERE id = ?').get(userId) as any;
      if (!user || !user.fcm_token) {
        return res.status(404).json({ error: 'User not found or no token' });
      }

      let payload: any = { token: user.fcm_token };
      const callId = crypto.randomUUID();

      switch (type) {
        case 'standard':
          payload.notification = {
            title: 'Test Notification',
            body: 'This is a standard notification',
          };
          payload.android = {
            priority: 'high',
            notification: {
              channelId: 'default',
            }
          };
          break;
        case 'data_only':
          payload.data = {
            type: 'test_data',
            message: 'Silent data push',
            timestamp: String(Date.now())
          };
          payload.android = {
            priority: 'high',
          };
          break;
        case 'call_full_screen':
          payload.data = {
            type: 'incoming_call',
            callId,
            callerId: '1',
            callerName: 'Test Caller (FSI)',
            isVideo: 'true'
          };
          payload.android = {
            priority: 'high',
            ttl: 0,
          };
          break;
        case 'call_notification':
          payload.notification = {
            title: 'Входящий звонок',
            body: 'Нажмите, чтобы ответить',
          };
          payload.data = {
            type: 'incoming_call',
            callId,
            callerId: '1',
            callerName: 'Test Caller (Notif)',
            isVideo: 'true'
          };
          payload.android = {
            priority: 'high',
            notification: {
              channelId: 'call_channel',
              priority: 'high',
              visibility: 'public',
              icon: 'ic_launcher',
              clickAction: 'FCM_PLUGIN_ACTIVITY',
            }
          };
          break;
        default:
          return res.status(400).json({ error: 'Invalid type' });
      }

      const response = await admin.messaging().send(payload);
      res.json({ success: true, response });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: String(error) });
    }
  });

  // API Routes
  app.use('/api/auth', authRoutes);
  app.use('/api/admin', adminRoutes);
  app.use('/api/friends', friendRoutes);

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static('dist'));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve('dist/index.html'));
    });
  }

  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
