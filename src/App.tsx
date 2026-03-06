import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useStore } from './store/useStore';
import Login from './pages/Login';
import Dashboard from './pages/DashboardPage';
import Admin from './pages/Admin';
import InviteHandler from './pages/InviteHandler';
import FriendAddHandler from './pages/FriendAddHandler';
import { PushTestPage } from './pages/PushTestPage';
import { getApiUrl } from './utils/api';
import { usePushNotifications } from './hooks/usePushNotifications';

function App() {
  const { token, setUser, logout } = useStore();

  usePushNotifications();

  useEffect(() => {
    if (token) {
      // Use env var or fallback to production URL if empty (especially important for APK)
      const apiUrl = getApiUrl();
      fetch(`${apiUrl}/api/auth/me`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      .then(async res => {
        if (!res.ok) throw new Error('Invalid token');
        
        const contentType = res.headers.get("content-type");
        if (!contentType || !contentType.includes("application/json")) {
          throw new Error("Server returned non-JSON response");
        }
        
        return res.json();
      })
      .then(data => setUser(data.user))
      .catch((err) => {
        console.error("Auth check failed:", err);
        logout();
      });
    }
  }, [token, setUser, logout]);

  return (
    <BrowserRouter>
      <div className="min-h-screen bg-zinc-950 text-zinc-100 font-sans">
        <Routes>
          <Route path="/login" element={!token ? <Login /> : <Navigate to="/" />} />
          <Route path="/invite/:code" element={<InviteHandler />} />
          <Route path="/add-friend/:code" element={<FriendAddHandler />} />
          <Route path="/push-test" element={<PushTestPage />} />
          <Route path="/" element={token ? <Dashboard /> : <Navigate to="/login" />} />
          <Route path="/admin" element={token ? <Admin /> : <Navigate to="/login" />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}

export default App;
