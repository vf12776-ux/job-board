import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export default function Layout({ children }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div>
      <nav className="navbar">
        <div className="container">
          <Link to="/" className="logo">Доска заявок</Link>
          <div className="nav-links">
            <Link to="/">Лента</Link>
            {user?.role === 'advertiser' && (
              <Link to="/create-order">Создать заявку</Link>
            )}
            {user ? (
              <div className="user-info">
                <span className="user-role">{user.role === 'advertiser' ? 'Рекламодатель' : 'Соискатель'}</span>
                <span>{user.name}</span>
                <button onClick={handleLogout} className="logout-btn">Выйти</button>
              </div>
            ) : (
              <Link to="/login">Вход</Link>
            )}
          </div>
        </div>
      </nav>
      <main className="container">
        {children}
      </main>
    </div>
  );
}