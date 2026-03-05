import React, { useEffect, useRef, useState } from 'react';
import { useStore } from '../store/useStore';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';

// Dynamic import helper
let GoogleAuth: any = null;

declare global {
  interface Window {
    TelegramLoginWidget: {
      dataOnauth: (user: any) => void;
    };
  }
}

export default function Login() {
  const { setToken, setUser } = useStore();
  const navigate = useNavigate();
  const location = useLocation();
  const containerRef = useRef<HTMLDivElement>(null);

  const [hasInvite, setHasInvite] = useState(false);

  useEffect(() => {
    // Initialize Google Auth dynamically
    import('@codetrix-studio/capacitor-google-auth').then(module => {
      GoogleAuth = module.GoogleAuth;
      GoogleAuth.initialize({
        grantOfflineAccess: true,
      });
    }).catch(err => {
      console.error('Failed to load Google Auth module', err);
    });

    // 1. Immediately save invite code from URL to localStorage if present
    const searchParams = new URLSearchParams(location.search);
    const urlInviteCode = searchParams.get('invite');
    
    // Migration: Check if stored invite code is actually a friend code (fix for previous bug)
    const existingStoredCode = localStorage.getItem('pending_invite_code');
    if (existingStoredCode && existingStoredCode.startsWith('friend-')) {
       localStorage.setItem('pending_friend_code', existingStoredCode.replace('friend-', ''));
       localStorage.removeItem('pending_invite_code');
    }
    
    if (urlInviteCode) {
      if (urlInviteCode.startsWith('friend-')) {
        localStorage.setItem('pending_friend_code', urlInviteCode.replace('friend-', ''));
      } else {
        localStorage.setItem('pending_invite_code', urlInviteCode);
        setHasInvite(true);
      }
    }
    
    // Check for stored app invite code
    const storedInviteCode = localStorage.getItem('pending_invite_code');
    if (storedInviteCode) {
      setHasInvite(true);
    } else {
      // Retry check after a short delay for slow mobile storage
      setTimeout(() => {
        const delayedStoredCode = localStorage.getItem('pending_invite_code');
        if (delayedStoredCode) {
          setHasInvite(true);
        }
      }, 500);
    }

    // 2. Setup Telegram widget
    window.TelegramLoginWidget = {
      dataOnauth: async (user: any) => {
        // 3. Read code dynamically at the moment of login (most reliable)
        // Priority: URL param (if not friend code) -> LocalStorage
        const currentSearchParams = new URLSearchParams(window.location.search);
        let activeInviteCode = currentSearchParams.get('invite');
        
        if (activeInviteCode && activeInviteCode.startsWith('friend-')) {
           // If URL has friend code, save it and ignore for auth
           localStorage.setItem('pending_friend_code', activeInviteCode.replace('friend-', ''));
           activeInviteCode = null;
        }
        
        if (!activeInviteCode) {
          let stored = localStorage.getItem('pending_invite_code');
          // Migration check here too just in case
          if (stored && stored.startsWith('friend-')) {
             localStorage.setItem('pending_friend_code', stored.replace('friend-', ''));
             localStorage.removeItem('pending_invite_code');
             stored = null;
          }
          activeInviteCode = stored;
        }

        try {
          const apiUrl = import.meta.env.VITE_API_URL || '';
          const response = await fetch(`${apiUrl}/api/auth/telegram`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ authData: user, inviteCode: activeInviteCode })
          });
          
          const data = await response.json();
          
          if (response.ok) {
            // Only clear code on successful login
            localStorage.removeItem('pending_invite_code');
            setToken(data.token);
            setUser(data.user);
            
            // Check for pending friend code
            const pendingFriendCode = localStorage.getItem('pending_friend_code');
            if (pendingFriendCode) {
              try {
                 await fetch('/api/friends/add', {
                   method: 'POST',
                   headers: { 
                     'Content-Type': 'application/json',
                     'Authorization': `Bearer ${data.token}`
                   },
                   body: JSON.stringify({ code: pendingFriendCode })
                 });
                 localStorage.removeItem('pending_friend_code');
              } catch (e) {
                console.error('Failed to auto-add friend after login', e);
              }
            }

            navigate('/');
          } else {
            alert(data.error || 'Ошибка входа');
          }
        } catch (err) {
          console.error('Login error:', err);
          alert('Произошла ошибка при входе.');
        }
      }
    };

    // 3. Check for Telegram Web App (Mini App) context
    const tg = (window as any).Telegram?.WebApp;
    // Check if running in Capacitor (mobile app)
    const isCapacitor = window.location.protocol === 'capacitor:' || window.location.protocol === 'http:' && window.location.hostname === 'localhost' && navigator.userAgent.includes('Android');

    if (tg && tg.initData) {
      // ... (existing Web App logic)
      tg.ready();
      
      // Check for invite code in start_param
      const startParam = tg.initDataUnsafe?.start_param;
      let activeInviteCode = startParam;
      
      // Handle 'friend-' prefix if present in start_param
      if (activeInviteCode && activeInviteCode.startsWith('friend-')) {
          localStorage.setItem('pending_friend_code', activeInviteCode.replace('friend-', ''));
          activeInviteCode = null;
      }
      
      if (!activeInviteCode) {
        activeInviteCode = localStorage.getItem('pending_invite_code');
      }
      
      if (activeInviteCode) {
        setHasInvite(true);
      }

      // Auto-login
      const apiUrl = import.meta.env.VITE_API_URL || '';
      fetch(`${apiUrl}/api/auth/telegram-webapp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ initData: tg.initData, inviteCode: activeInviteCode })
      })
      .then(res => res.json())
      .then(async (data) => {
        if (data.token) {
          localStorage.removeItem('pending_invite_code');
          setToken(data.token);
          setUser(data.user);
          
          // Check for pending friend code (from start_param or localStorage)
          const pendingFriendCode = localStorage.getItem('pending_friend_code');
          if (pendingFriendCode) {
             try {
               await fetch('/api/friends/add', {
                 method: 'POST',
                 headers: { 
                   'Content-Type': 'application/json',
                   'Authorization': `Bearer ${data.token}`
                 },
                 body: JSON.stringify({ code: pendingFriendCode })
               });
               localStorage.removeItem('pending_friend_code');
             } catch (e) {
               console.error('Failed to auto-add friend', e);
             }
          }

          navigate('/');
        } else {
          // If auto-login fails (e.g. need invite code), show error or stay on login
          if (data.error) {
             console.error('Web App Login Error:', data.error);
             // Optional: Show error to user
          }
        }
      })
      .catch(err => console.error('Web App Login Failed:', err));
    } else if (!isCapacitor) {
        // Only inject widget if NOT in Capacitor/Mobile App
        const script = document.createElement('script');
        script.src = 'https://telegram.org/js/telegram-widget.js?22';
        // Replace with your actual bot username in production
        script.setAttribute('data-telegram-login', import.meta.env.VITE_TELEGRAM_BOT_NAME || 'samplebot');
        script.setAttribute('data-size', 'large');
        script.setAttribute('data-onauth', 'TelegramLoginWidget.dataOnauth(user)');
        script.setAttribute('data-request-access', 'write');
        script.async = true;
        
        if (containerRef.current) {
          containerRef.current.innerHTML = '';
          containerRef.current.appendChild(script);
        }
    }
  }, [location, navigate, setToken, setUser]);

  // Handle mobile login button click
  const handleMobileLogin = () => {
      const botName = import.meta.env.VITE_TELEGRAM_BOT_NAME || 'samplebot';
      // Open bot with start parameter to trigger auth flow
      window.open(`https://t.me/${botName}?start=auth`, '_system');
  };

  const handleGoogleLogin = async () => {
    try {
      if (!GoogleAuth) {
        // Try to load again if not loaded
        const module = await import('@codetrix-studio/capacitor-google-auth');
        GoogleAuth = module.GoogleAuth;
        await GoogleAuth.initialize({ grantOfflineAccess: true });
      }
      
      const user = await GoogleAuth.signIn();
      
      // Get invite code
      let activeInviteCode = localStorage.getItem('pending_invite_code');
      const pendingFriendCode = localStorage.getItem('pending_friend_code');
      
      // Send to backend
      const apiUrl = import.meta.env.VITE_API_URL || '';
      const response = await fetch(`${apiUrl}/api/auth/google`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          idToken: user.authentication.idToken, 
          inviteCode: activeInviteCode 
        })
      });

      const data = await response.json();

      if (response.ok) {
        localStorage.removeItem('pending_invite_code');
        setToken(data.token);
        setUser(data.user);

        if (pendingFriendCode) {
           try {
             await fetch('/api/friends/add', {
               method: 'POST',
               headers: { 
                 'Content-Type': 'application/json',
                 'Authorization': `Bearer ${data.token}`
               },
               body: JSON.stringify({ code: pendingFriendCode })
             });
             localStorage.removeItem('pending_friend_code');
           } catch (e) {
             console.error('Failed to auto-add friend', e);
           }
        }
        navigate('/');
      } else {
        alert(data.error || 'Ошибка входа через Google');
      }
    } catch (error) {
      console.error('Google Sign-In Error:', error);
      // alert('Ошибка входа через Google');
    }
  };
  
  // Improved check for mobile environment
  const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
  const isCapacitor = window.location.protocol === 'capacitor:' || 
                      window.location.protocol === 'file:' || 
                      (window.location.hostname === 'localhost' && isMobile);

  return (
    <div className="flex items-center justify-center min-h-screen bg-zinc-950">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="p-8 bg-zinc-900 rounded-2xl shadow-xl border border-zinc-800 text-center max-w-sm w-full"
      >
        <h1 className="text-2xl font-semibold text-zinc-100 mb-2">Добро пожаловать</h1>
        <p className="text-zinc-400 mb-4 text-sm">Войдите через Telegram или Google</p>
        
        {hasInvite && (
          <div className="mb-6 py-2 px-3 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-emerald-400 text-xs font-medium flex items-center justify-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"/>
            Код приглашения применен
          </div>
        )}
        
        <div ref={containerRef} className="flex flex-col gap-3 justify-center min-h-[40px]">
          {isCapacitor && (
            <>
              <button 
                  onClick={handleGoogleLogin}
                  className="bg-white hover:bg-gray-100 text-gray-800 font-medium py-2.5 px-6 rounded-full flex items-center gap-2 transition-colors w-full justify-center shadow-sm"
              >
                  <svg width="20" height="20" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                  </svg>
                  Войти через Google
              </button>

              <div className="relative flex py-1 items-center">
                  <div className="flex-grow border-t border-zinc-700"></div>
                  <span className="flex-shrink mx-4 text-zinc-500 text-xs">ИЛИ</span>
                  <div className="flex-grow border-t border-zinc-700"></div>
              </div>

              <button 
                  onClick={handleMobileLogin}
                  className="bg-[#54a9eb] hover:bg-[#4095d6] text-white font-medium py-2.5 px-6 rounded-full flex items-center gap-2 transition-colors w-full justify-center"
              >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M20.665 3.41702L2.88502 10.274C1.67102 10.76 1.67602 11.437 2.66002 11.739L7.22402 13.162L17.78 6.50202C18.279 6.19902 18.735 6.36502 18.361 6.69702L9.81002 14.413H9.80802L9.81002 14.414L9.49502 19.102C9.95602 19.102 10.159 18.89 10.418 18.64L12.634 16.485L17.243 19.889C18.093 20.358 18.704 20.117 18.916 19.102L21.943 4.86502C22.253 3.62302 21.472 3.05902 20.665 3.41702Z" fill="currentColor"/>
                  </svg>
                  Войти через Telegram
              </button>
            </>
          )}
        </div>
      </motion.div>
    </div>
  );
}
