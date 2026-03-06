import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useStore } from './store/useStore';
import Login from './pages/Login';
import Dashboard from './pages/DashboardPage';
import Admin from './pages/Admin';
import InviteHandler from './pages/InviteHandler';
import FriendAddHandler from './pages/FriendAddHandler';
import { getApiUrl } from './utils/api';
import { usePushNotifications } from './hooks/usePushNotifications';
import { usePermissions } from './hooks/usePermissions';

function PermissionScreen({ onRequest }: { onRequest: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-6 text-center bg-zinc-950">
      <h1 className="mb-4 text-2xl font-bold text-white">Необходимы разрешения</h1>
      <p className="mb-8 text-zinc-400">Для работы приложения нам нужен доступ к камере, микрофону и уведомлениям.</p>
      <button 
        onClick={onRequest}
        className="px-6 py-3 font-semibold text-white bg-emerald-600 rounded-xl hover:bg-emerald-700"
      >
        Предоставить разрешения
      </button>
    </div>
  );
}

function App() {
  const { token, setUser, logout } = useStore();
  const { permissionsGranted, checking, requestAllPermissions } = usePermissions();

  usePushNotifications();

  useEffect(() => {
    if (token) {
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

  if (checking) return <div className="min-h-screen bg-zinc-950" />;
  if (!permissionsGranted) return <PermissionScreen onRequest={requestAllPermissions} />;

  return (
    <BrowserRouter>
      <div className="min-h-screen bg-zinc-950 text-zinc-100 font-sans">
        <Routes>
          <Route path="/login" element={!token ? <Login /> : <Navigate to="/" />} />
          <Route path="/invite/:code" element={<InviteHandler />} />
          <Route path="/add-friend/:code" element={<FriendAddHandler />} />
          <Route path="/" element={token ? <Dashboard /> : <Navigate to="/login" />} />
          <Route path="/admin" element={token ? <Admin /> : <Navigate to="/login" />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}

export default App;
