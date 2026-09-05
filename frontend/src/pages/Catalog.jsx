import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';

export default function Catalog() {
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');

  useEffect(() => {
    api.get('/courses').then(res => setCourses(res.courses)).finally(() => setLoading(false));
  }, []);

  const filtered = courses.filter(c =>
    c.title.toLowerCase().includes(query.toLowerCase()) ||
    (c.category || '').toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div className="container page">
      <div className="flex-between mb-24 flex-wrap gap-12">
        <h2>Course Catalogue</h2>
        <input style={{ maxWidth: 280 }} placeholder="Search courses…" value={query} onChange={e => setQuery(e.target.value)} />
      </div>

      {loading && <p className="muted">Loading courses…</p>}
      {!loading && filtered.length === 0 && <p className="muted">No courses found.</p>}

      <div className="grid">
        {filtered.map(course => (
          <div className="card course-card" key={course.id}>
            <img src={course.thumbnail_url || 'https://picsum.photos/seed/' + course.id + '/600/360'} alt={course.title} />
            <span className="badge info mb-8">{course.category || 'General'} · {course.level}</span>
            <h3>{course.title}</h3>
            <p>{course.description}</p>
            <div className="flex-between">
              <span className="muted" style={{ fontSize: '0.8rem' }}>{course.lesson_count} lessons · {course.enrolled_count} enrolled</span>
              <Link to={`/courses/${course.id}`}><button className="btn small">View</button></Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
