import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import Layout from './components/Layout';
import Login from './pages/Login';
import Register from './pages/Register';
import OrdersFeed from './pages/OrdersFeed';
import CreateOrder from './pages/CreateOrder';
import PushNotifier from './components/PushNotifier';
import { useAuth } from './contexts/AuthContext';

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
  return (
    <BrowserRouter>
      <AuthProvider>
        <Layout>
          <PushNotifier />
          <AppRoutes />
        </Layout>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;