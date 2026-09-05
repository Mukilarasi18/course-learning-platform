import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../api';

export default function TaskPage() {
  const { id } = useParams();
  const [task, setTask] = useState(null);
  const [submission, setSubmission] = useState(null);
  const [text, setText] = useState('');
  const [file, setFile] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [submitting, setSubmitting] = useState(false);

  function load() {
    api.get(`/assignments/tasks/${id}`).then(res => setTask(res.task));
    api.get(`/assignments/tasks/${id}/my-submission`).then(res => setSubmission(res.submission));
  }
  useEffect(load, [id]);

  async function handleSubmit(e) {
    e.preventDefault();
    setError(''); setSuccess('');
    if (!file && !text.trim()) { setError('Provide a file or a text answer.'); return; }
    setSubmitting(true);
    try {
      const formData = new FormData();
      if (file) formData.append('file', file);
      if (text) formData.append('text_answer', text);
      await api.postForm(`/assignments/tasks/${id}/submit`, formData);
      setSuccess('Submission received!');
      setText(''); setFile(null);
      load();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  if (!task) return <div className="container page">Loading…</div>;

  return (
    <div className="container page">
      <Link to={`/courses/${task.course_id}`} className="muted">← Back to course</Link>
      <div className="card mt-16 mb-24">
        <h2>{task.title}</h2>
        <p className="muted">{task.description}</p>
        <p className="muted" style={{ fontSize: '0.8rem' }}>Max marks: {task.max_marks}{task.due_date ? ` · Due: ${task.due_date}` : ''}</p>
      </div>

      {submission && submission.grade !== null && submission.grade !== undefined && (
        <div className="card mb-24">
          <h3>Grade & Feedback</h3>
          <p className="badge success">{submission.grade} / {task.max_marks}</p>
          {submission.feedback && <p className="mt-8">{submission.feedback}</p>}
        </div>
      )}

      <div className="card">
        <h3 className="mb-16">{submission ? 'Update Your Submission' : 'Submit Your Work'}</h3>
        {error && <div className="alert error">{error}</div>}
        {success && <div className="alert success">{success}</div>}
        {submission && (
          <p className="muted mb-16" style={{ fontSize: '0.85rem' }}>
            Last submitted: {new Date(submission.submitted_at).toLocaleString()}
            {submission.file_url && <> · <a href={submission.file_url} target="_blank" rel="noreferrer">View uploaded file</a></>}
          </p>
        )}
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Text Answer / Link (optional if uploading a file)</label>
            <textarea rows={4} value={text} onChange={e => setText(e.target.value)} placeholder="Paste your answer or a link to your work…" />
          </div>
          <div className="form-group">
            <label>Upload File (optional)</label>
            <input type="file" onChange={e => setFile(e.target.files[0])} />
          </div>
          <button className="btn" disabled={submitting}>{submitting ? 'Submitting…' : 'Submit Task'}</button>
        </form>
      </div>
    </div>
  );
}
