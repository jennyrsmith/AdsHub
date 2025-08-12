import React, { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import ViewportPage from './pages/ViewportPage.jsx';
import Login from './pages/Login.jsx';

export default function App() {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);

  useEffect(() => {
    fetch('/auth/me')
      .then(res => res.json())
      .then(data => { if (data.ok) setUser(data.user); })
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
