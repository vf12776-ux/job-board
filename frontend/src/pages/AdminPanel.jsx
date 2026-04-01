import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';

export default function AdminPanel() {
  const { token } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/admin/users', {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(data => {
        setUsers(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [token]);

  const updateRole = async (userId, role) => {
    try {
      const res = await fetch('/api/admin/users/role', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ userId, role })
      });
      if (res.ok) {
        setUsers(users.map(u => u.id === userId ? { ...u, role } : u));
      }
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) return <div>Загрузка...</div>;

  return (
    <div>
      <h2>Панель администратора</h2>
      <table border="1" cellPadding="8" style={{ borderCollapse: 'collapse', width: '100%' }}>
        <thead>
          <tr><th>ID</th><th>Имя</th><th>Email</th><th>Роль</th><th>Действия</th></tr>
        </thead>
        <tbody>
          {users.map(user => (
            <tr key={user.id}>
              <td>{user.id}</td>
              <td>{user.name}</td>
              <td>{user.email}</td>
              <td>{user.role || 'user'}</td>
              <td>
                <button onClick={() => updateRole(user.id, 'advertiser')}>Рекламодатель</button>
                <button onClick={() => updateRole(user.id, 'user')}>Соискатель</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}