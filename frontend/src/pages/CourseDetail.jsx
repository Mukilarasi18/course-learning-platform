import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { api } from '../api';
import { useAuth } from '../context/AuthContext';
import { ProgressBar } from '../components/Common';

export default function CourseDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [progress, setProgress] = useState(null);
  const [error, setError] = useState('');
  const [enrolling, setEnrolling] = useState(false);
  const [tab, setTab] = useState('content');

  function load() {
    api.get(`/courses/${id}`).then(setData);
    if (user && user.role === 'student') {
      api.get(`/enrollments/${id}/progress`).then(res => setProgress(res.progress)).catch(() => {});
    }
  }

  useEffect(load, [id, user]);

  async function handleEnroll() {
    setError('');
    setEnrolling(true);
    try {
      await api.post('/enrollments', { course_id: Number(id) });
      load();
    } catch (err) {
      setError(err.message);
    } finally {
      setEnrolling(false);
    }
  }

  if (!data) return <div className="container page">Loading…</div>;
  const { course, modules, tasks, quizzes, projects, enrolled, isAdmin } = data;

  return (
    <div className="container page">
      <div className="card mb-24">
        <span className="badge info mb-8">{course.category} · {course.level}</span>
        <h1>{course.title}</h1>
        <p className="muted">{course.description}</p>

        {error && <div className="alert error">{error}</div>}

        {!user && <button className="btn" onClick={() => navigate('/login')}>Log in to Enroll</button>}
        {user && user.role === 'student' && !enrolled && (
          <button className="btn" onClick={handleEnroll} disabled={enrolling}>{enrolling ? 'Enrolling…' : 'Enroll Now'}</button>
        )}
        {user && user.role === 'student' && enrolled && progress && (
          <div className="mt-16">
            <div className="flex-between mb-8">
              <strong>Your Progress</strong>
              <span>{progress.percent}%</span>
            </div>
            <ProgressBar percent={progress.percent} />
            {progress.complete && (
              <Link to={`/certificates/${id}`}><button className="btn mt-16">🏆 View Certificate</button></Link>
            )}
          </div>
        )}
      </div>

      <div className="tabs">
        <div className={`tab ${tab === 'content' ? 'active' : ''}`} onClick={() => setTab('content')}>Lessons</div>
        <div className={`tab ${tab === 'tasks' ? 'active' : ''}`} onClick={() => setTab('tasks')}>Tasks ({tasks.length})</div>
        <div className={`tab ${tab === 'quizzes' ? 'active' : ''}`} onClick={() => setTab('quizzes')}>Quizzes ({quizzes.length})</div>
        <div className={`tab ${tab === 'projects' ? 'active' : ''}`} onClick={() => setTab('projects')}>Projects ({projects.length})</div>
      </div>

      {tab === 'content' && modules.map(mod => (
        <div key={mod.id} className="card mb-16">
          <h3 className="mb-8">{mod.title}</h3>
          {mod.lessons.map(lesson => (
            <div
              key={lesson.id}
              className={`lesson-item ${lesson.locked ? 'locked' : ''}`}
              onClick={() => !lesson.locked && navigate(`/lessons/${lesson.id}`)}
            >
              <span>▶ {lesson.title}</span>
              {lesson.locked && <span className="badge warning">Enroll to unlock</span>}
            </div>
          ))}
        </div>
      ))}

      {tab === 'tasks' && (
        <div className="grid">
          {tasks.length === 0 && <p className="muted">No tasks yet.</p>}
          {tasks.map(t => (
            <div key={t.id} className="card">
              <h3>{t.title}</h3>
              <p className="muted">{t.description}</p>
              <p className="muted" style={{ fontSize: '0.8rem' }}>Max marks: {t.max_marks}{t.due_date ? ` · Due: ${t.due_date}` : ''}</p>
              {enrolled ? <Link to={`/tasks/${t.id}`}><button className="btn small">Open Task</button></Link> : <span className="muted">Enroll to access</span>}
            </div>
          ))}
        </div>
      )}

      {tab === 'quizzes' && (
        <div className="grid">
          {quizzes.length === 0 && <p className="muted">No quizzes yet.</p>}
          {quizzes.map(q => (
            <div key={q.id} className="card">
              <h3>{q.title}</h3>
              <p className="muted" style={{ fontSize: '0.8rem' }}>Pass mark: {q.pass_percentage}% · Feedback: {q.feedback_mode}</p>
              {enrolled ? <Link to={`/quizzes/${q.id}`}><button className="btn small">Take Quiz</button></Link> : <span className="muted">Enroll to access</span>}
            </div>
          ))}
        </div>
      )}

      {tab === 'projects' && (
        <div className="grid">
          {projects.length === 0 && <p className="muted">No projects yet.</p>}
          {projects.map(p => (
            <div key={p.id} className="card">
              <h3>{p.title}</h3>
              <p className="muted">{p.description}</p>
              <p className="muted" style={{ fontSize: '0.8rem' }}>Max marks: {p.max_marks}</p>
              {enrolled ? <Link to={`/projects/${p.id}`}><button className="btn small">Submit Project</button></Link> : <span className="muted">Enroll to access</span>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
