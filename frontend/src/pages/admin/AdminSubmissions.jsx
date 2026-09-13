import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../../api';

export default function AdminSubmissions() {
  const { type, id } = useParams(); // type: 'task' | 'project'
  const [submissions, setSubmissions] = useState([]);
  const [grades, setGrades] = useState({});
  const [savedIds, setSavedIds] = useState({});

  const base = type === 'task' ? 'assignments/tasks' : 'assignments/projects';
  const gradeBase = type === 'task' ? 'assignments/task-submissions' : 'assignments/project-submissions';

  function load() {
    api.get(`/${base}/${id}/submissions`).then(res => setSubmissions(res.submissions));
  }
  useEffect(load, [type, id]);

  function updateGrade(subId, field, value) {
    setGrades({ ...grades, [subId]: { ...(grades[subId] || {}), [field]: value } });
  }

  async function saveGrade(sub) {
    const g = grades[sub.id] || {};
    await api.put(`/${gradeBase}/${sub.id}/grade`, {
      grade: g.grade !== undefined ? Number(g.grade) : sub.grade,
      feedback: g.feedback !== undefined ? g.feedback : sub.feedback
    });
    setSavedIds({ ...savedIds, [sub.id]: true });
    setTimeout(() => setSavedIds(prev => ({ ...prev, [sub.id]: false })), 2000);
    load();
  }

  return (
    <div className="container page">
      <Link to={-1} onClick={(e) => { e.preventDefault(); window.history.back(); }} className="muted">← Back</Link>
      <h2 className="mt-16 mb-24">Review Submissions ({type})</h2>

      {submissions.length === 0 && <p className="muted">No submissions yet.</p>}

      {submissions.map(sub => (
        <div key={sub.id} className="card mb-16">
          <div className="flex-between mb-8">
            <div>
              <strong>{sub.student_name}</strong>
              <p className="muted" style={{ fontSize: '0.8rem' }}>{sub.student_email} · Submitted {new Date(sub.submitted_at).toLocaleString()}</p>
            </div>
            {sub.grade !== null && sub.grade !== undefined && <span className="badge success">Graded: {sub.grade}</span>}
          </div>

          {sub.text_answer && <p className="mb-8"><strong>Answer:</strong> {sub.text_answer}</p>}
          {sub.notes && <p className="mb-8"><strong>Notes:</strong> {sub.notes}</p>}
          {sub.file_url && <p className="mb-8"><a href={sub.file_url} target="_blank" rel="noreferrer">📎 View submitted file</a></p>}

          <div className="grid" style={{ gridTemplateColumns: '120px 1fr auto', alignItems: 'end', gap: 12 }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label>Marks</label>
              <input type="number" defaultValue={sub.grade ?? ''} onChange={e => updateGrade(sub.id, 'grade', e.target.value)} />
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label>Feedback</label>
              <input defaultValue={sub.feedback ?? ''} onChange={e => updateGrade(sub.id, 'feedback', e.target.value)} placeholder="Comments for the student…" />
            </div>
            <button className="btn small" onClick={() => saveGrade(sub)}>{savedIds[sub.id] ? '✓ Saved' : 'Save Grade'}</button>
          </div>
        </div>
      ))}
    </div>
  );
}
