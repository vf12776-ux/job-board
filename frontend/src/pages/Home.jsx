// frontend/src/pages/Home.jsx
import React from 'react';
import { useAuth } from '../contexts/AuthContext';

const Home = () => {
  const { user } = useAuth();
  return (
    <div>
      <h1>Доска заявок</h1>
      {user ? (
        <p>Добро пожаловать, {user.email} (роль: {user.role})</p>
      ) : (
        <p>Пожалуйста, войдите или зарегистрируйтесь</p>
      )}
    </div>
  );
};

export default Home;