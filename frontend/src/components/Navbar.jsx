import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="navbar">
      <div className="navbar-inner">
        <Link to="/" className="brand">📚 LearnHub</Link>
        <div className="nav-links">
          <Link to="/courses">Courses</Link>
          <Link to="/verify">Verify Certificate</Link>
          {user && user.role === 'student' && <Link to="/dashboard">My Dashboard</Link>}
          {user && user.role === 'admin' && <Link to="/admin">Admin</Link>}
          {!user && <Link to="/login">Log In</Link>}
          {!user && <Link to="/register"><button className="btn small">Sign Up</button></Link>}
          {user && (
            <>
              <span className="muted" style={{ fontSize: '0.85rem' }}>{user.name}</span>
              <button className="btn secondary small" onClick={() => { logout(); navigate('/'); }}>Log Out</button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
