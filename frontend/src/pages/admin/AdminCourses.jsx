import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../api';

export default function AdminCourses() {
  const [courses, setCourses] = useState([]);
  const [form, setForm] = useState({ title: '', description: '', thumbnail_url: '', category: '', level: 'Beginner' });
  const [error, setError] = useState('');
  const [creating, setCreating] = useState(false);

  function load() {
    api.get('/courses').then(res => setCourses(res.courses));
  }
  useEffect(load, []);

  async function handleCreate(e) {
    e.preventDefault();
    setError('');
    setCreating(true);
    try {
      await api.post('/courses', form);
      setForm({ title: '', description: '', thumbnail_url: '', category: '', level: 'Beginner' });
      load();
    } catch (err) {
      setError(err.message);
    } finally {
      setCreating(false);
    }
  }

  async function handleDelete(id) {
    if (!confirm('Delete this course and all its content? This cannot be undone.')) return;
    await api.del(`/courses/${id}`);
    load();
  }

  return (
    <div className="container page">
      <h2 className="mb-24">Manage Courses</h2>

      <div className="card mb-32">
        <h3 className="mb-16">Add New Course</h3>
        {error && <div className="alert error">{error}</div>}
        <form onSubmit={handleCreate}>
          <div className="form-group">
            <label>Title</label>
            <input required value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} />
          </div>
          <div className="form-group">
            <label>Description</label>
            <textarea rows={3} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
          </div>
          <div className="grid" style={{ gridTemplateColumns: '1fr 1fr 1fr' }}>
            <div className="form-group">
              <label>Category</label>
              <input value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} />
            </div>
            <div className="form-group">
              <label>Level</label>
              <select value={form.level} onChange={e => setForm({ ...form, level: e.target.value })}>
                <option>Beginner</option><option>Intermediate</option><option>Advanced</option>
              </select>
            </div>
            <div className="form-group">
              <label>Thumbnail URL</label>
              <input value={form.thumbnail_url} onChange={e => setForm({ ...form, thumbnail_url: e.target.value })} placeholder="https://…" />
            </div>
          </div>
          <button className="btn" disabled={creating}>{creating ? 'Creating…' : 'Create Course'}</button>
        </form>
      </div>

      <h3 className="mb-16">All Courses</h3>
      <div className="grid">
        {courses.map(c => (
          <div key={c.id} className="card">
            <h3>{c.title}</h3>
            <p className="muted" style={{ fontSize: '0.85rem' }}>{c.category} · {c.level}</p>
            <div className="flex gap-8 mt-16 flex-wrap">
              <Link to={`/admin/courses/${c.id}`}><button className="btn small">Manage</button></Link>
              <Link to={`/admin/roster/${c.id}`}><button className="btn small secondary">Roster</button></Link>
              <button className="btn small danger" onClick={() => handleDelete(c.id)}>Delete</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
