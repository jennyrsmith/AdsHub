import React, { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import ViewportPage from './pages/ViewportPage.jsx';
import Login from './pages/Login.jsx';

export default function App() {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);

  useEffect(() => {
    fetch('/auth/me')
      .then(res => {
        if (!res.ok) throw new Error('Not authenticated');
        return res.json();
      })
      .then(data => { 
        if (data.ok && data.user) {
          setUser(data.user); 
        }
      })
      .catch(err => {
        console.log('Not authenticated:', err.message);
        // User not authenticated, will show login page
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) return null;

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/*" element={user ? <ViewportPage /> : <Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
