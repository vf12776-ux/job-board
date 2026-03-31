import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';

export default function OrdersFeed() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const { token, user } = useAuth();

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/orders`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Ошибка загрузки');
      const data = await res.json();
      setOrders(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const respond = async (orderId) => {
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/orders/${orderId}/respond`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Не удалось откликнуться');
      fetchOrders();
    } catch (err) {
      alert(err.message);
    }
  };

  if (loading) return <div className="loader"></div>;
  if (error) return <div className="error">Ошибка: {error}</div>;

  return (
    <div>
      <h1 style={{ marginBottom: '1rem' }}>Открытые заявки</h1>
      <div className="orders-grid">
        {orders.length === 0 ? (
          <p>Нет открытых заявок</p>
        ) : (
          orders.map(order => (
            <div key={order.id} className="order-card">
              <div className="order-title">{order.title}</div>
              <div className="order-description">{order.description}</div>
              <div className="order-meta">
                <span className="order-city">{order.city}</span>
                <span className={`order-status ${order.status === 'open' ? 'status-open' : ''}`}>
                  {order.status === 'open' ? 'Открыта' : 'Закрыта'}
                </span>
              </div>
              {user.role === 'candidate' && order.status === 'open' && (
                <button className="btn btn-primary" onClick={() => respond(order.id)}>
                  Откликнуться
                </button>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}