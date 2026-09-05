import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../api';

export default function AdminHome() {
  const [courses, setCourses] = useState([]);
  const [students, setStudents] = useState([]);
  const [certificates, setCertificates] = useState([]);

  useEffect(() => {
    api.get('/courses').then(res => setCourses(res.courses));
    api.get('/enrollments/admin/students').then(res => setStudents(res.students));
    api.get('/certificates/admin/all').then(res => setCertificates(res.certificates));
  }, []);

  return (
    <div className="container page">
      <div className="flex-between mb-24 flex-wrap gap-12">
        <h2>Admin Dashboard</h2>
        <Link to="/admin/courses"><button className="btn">Manage Courses</button></Link>
      </div>

      <div className="grid mb-32">
        <div className="card text-center">
          <h1>{courses.length}</h1>
          <p className="muted">Courses</p>
        </div>
        <div className="card text-center">
          <h1>{students.length}</h1>
          <p className="muted">Students</p>
        </div>
        <div className="card text-center">
          <h1>{certificates.length}</h1>
          <p className="muted">Certificates Issued</p>
        </div>
      </div>

      <div className="flex-between mb-16">
        <h3>Courses</h3>
        <Link to="/admin/certificates">View All Certificates →</Link>
      </div>
      <div className="grid">
        {courses.map(c => (
          <div key={c.id} className="card">
            <h3>{c.title}</h3>
            <p className="muted" style={{ fontSize: '0.85rem' }}>{c.enrolled_count} enrolled · {c.lesson_count} lessons</p>
            <div className="flex gap-8 mt-16 flex-wrap">
              <Link to={`/admin/courses/${c.id}`}><button className="btn small">Manage Content</button></Link>
              <Link to={`/admin/roster/${c.id}`}><button className="btn small secondary">Roster</button></Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
