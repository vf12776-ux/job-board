import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import Layout from './components/Layout';
import Login from './pages/Login';
import Register from './pages/Register';
import OrdersFeed from './pages/OrdersFeed';
import CreateOrder from './pages/CreateOrder';
import PushNotifier from './components/PushNotifier';
import { useAuth } from './contexts/AuthContext';
import { useState, useEffect } from 'react';

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
    </Routes>
  );
}

function App() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showInstallButton, setShowInstallButton] = useState(false);

  useEffect(() => {
    const handler = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowInstallButton(true);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      deferredPrompt.userChoice.then((choiceResult) => {
        if (choiceResult.outcome === 'accepted') {
          console.log('Установлено');
        }
        setDeferredPrompt(null);
        setShowInstallButton(false);
      });
    }
  };

  return (
    <BrowserRouter>
      <div style={{ position: 'relative' }}>
        <AuthProvider>
          <Layout>
            <PushNotifier />
            <AppRoutes />
          </Layout>
        </AuthProvider>
        {showInstallButton && (
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
              cursor: 'pointer'
            }}
          >
            Установить приложение
          </button>
        )}
      </div>
    </BrowserRouter>
  );
}

export default App;