import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import Layout from './components/Layout';
import Login from './pages/Login';
import Register from './pages/Register';
import OrdersFeed from './pages/OrdersFeed';
import CreateOrder from './pages/CreateOrder';
import PushNotifier from './components/PushNotifier';
import { useAuth } from './contexts/AuthContext';
import { useState, useEffect } from 'react';
import AdminPanel from './pages/AdminPanel';

function PrivateRoute({ children, allowedRoles }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" />;
  if (allowedRoles && !allowedRoles.includes(user.role)) return <Navigate to="/" />;
  return children;
}

function AppRoutes() {
  const { user } = useAuth();
  return (
    <Routes>
      <Route path="/login" element={!user ? <Login /> : <Navigate to="/" />} />
      <Route path="/register" element={!user ? <Register /> : <Navigate to="/" />} />
      <Route path="/" element={
        <PrivateRoute>
          <OrdersFeed />
        </PrivateRoute>
      } />
      <Route path="/create-order" element={
        <PrivateRoute allowedRoles={['advertiser']}>
          <CreateOrder />
        </PrivateRoute>
      } />
      {/* Админ-панель — отдельный маршрут */}
      <Route path="/admin" element={
        <PrivateRoute allowedRoles={['admin']}>
          <AdminPanel />
        </PrivateRoute>
      } />
    </Routes>
  );
}

function App() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showButton, setShowButton] = useState(false);

  useEffect(() => {
    // Не показываем кнопку, если уже открыто как PWA
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setShowButton(false);
      return;
    }

    const handler = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowButton(true);
    };
    window.addEventListener('beforeinstallprompt', handler);

    // Если установка произошла через меню браузера — скрываем кнопку
    const installedHandler = () => setShowButton(false);
    window.addEventListener('appinstalled', installedHandler);

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
      window.removeEventListener('appinstalled', installedHandler);
    };
  }, []);

  const handleInstall = () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      deferredPrompt.userChoice.then((choiceResult) => {
        if (choiceResult.outcome === 'accepted') {
          setShowButton(false);
        }
        setDeferredPrompt(null);
      });
    } else {
      alert('Нажмите ⋮ (три точки) в браузере → "Установить приложение"');
    }
  };

  return (
    <BrowserRouter>
      <ThemeProvider>
        <div style={{ position: 'relative' }}>
          <AuthProvider>
            <Layout>
              <PushNotifier />
              <AppRoutes />
            </Layout>
          </AuthProvider>
          {showButton && (
            <button
              onClick={handleInstall}
              style={{
                position: 'fixed',
                bottom: '20px',
                right: '20px',
                zIndex: 1000,
                padding: '12px 20px',
                background: '#007bff',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                boxShadow: '0 2px 5px rgba(0,0,0,0.2)'
              }}
            >
              📲 Установить приложение
            </button>
          )}
        </div>
      </ThemeProvider>
    </BrowserRouter>
  );
}

export default App;