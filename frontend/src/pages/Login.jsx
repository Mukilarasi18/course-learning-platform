import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const user = await login(email, password);
      navigate(user.role === 'admin' ? '/admin' : '/dashboard');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="container page">
      <div className="card auth-box">
        <h2 className="mb-16">Log In</h2>
        {error && <div className="alert error">{error}</div>}
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Email</label>
            <input type="email" required value={email} onChange={e => setEmail(e.target.value)} placeholder="[email protected]" />
          </div>
          <div className="form-group">
            <label>Password</label>
            <input type="password" required value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" />
          </div>
          <button className="btn full" disabled={loading}>{loading ? 'Logging in…' : 'Log In'}</button>
        </form>
        <p className="muted mt-16" style={{ fontSize: '0.85rem' }}>
          Demo admin: [email protected] / Admin@123<br />
          Demo student: [email protected] / Student@123
        </p>
        <p className="mt-16">No account? <Link to="/register">Sign up</Link></p>
      </div>
    </div>
  );
}
