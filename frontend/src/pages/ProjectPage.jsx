import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../api';

export default function ProjectPage() {
  const { id } = useParams();
  const [project, setProject] = useState(null);
  const [submission, setSubmission] = useState(null);
  const [notes, setNotes] = useState('');
  const [file, setFile] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [submitting, setSubmitting] = useState(false);

  function load() {
    api.get(`/assignments/projects/${id}`).then(res => setProject(res.project));
    api.get(`/assignments/projects/${id}/my-submission`).then(res => setSubmission(res.submission));
  }
  useEffect(load, [id]);

  async function handleSubmit(e) {
    e.preventDefault();
    setError(''); setSuccess('');
    if (!file && !notes.trim()) { setError('Provide a file or a note/link.'); return; }
    setSubmitting(true);
    try {
      const formData = new FormData();
      if (file) formData.append('file', file);
      if (notes) formData.append('notes', notes);
      await api.postForm(`/assignments/projects/${id}/submit`, formData);
      setSuccess('Project submitted!');
      setNotes(''); setFile(null);
      load();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  if (!project) return <div className="container page">Loading…</div>;

  return (
    <div className="container page">
      <Link to={`/courses/${project.course_id}`} className="muted">← Back to course</Link>
      <div className="card mt-16 mb-24">
        <h2>{project.title}</h2>
        <p className="muted">{project.description}</p>
        <p className="muted" style={{ fontSize: '0.8rem' }}>Max marks: {project.max_marks}</p>
      </div>

      {submission && submission.grade !== null && submission.grade !== undefined && (
        <div className="card mb-24">
          <h3>Grade & Feedback</h3>
          <p className="badge success">{submission.grade} / {project.max_marks}</p>
          {submission.feedback && <p className="mt-8">{submission.feedback}</p>}
        </div>
      )}

      <div className="card">
        <h3 className="mb-16">{submission ? 'Update Your Project Submission' : 'Submit Your Project'}</h3>
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
            <label>Notes / Repo Link (optional if uploading a file)</label>
            <textarea rows={4} value={notes} onChange={e => setNotes(e.target.value)} placeholder="Describe your project or paste a link…" />
          </div>
          <div className="form-group">
            <label>Upload Project File (zip, doc, etc.)</label>
            <input type="file" onChange={e => setFile(e.target.files[0])} />
          </div>
          <button className="btn" disabled={submitting}>{submitting ? 'Submitting…' : 'Submit Project'}</button>
        </form>
      </div>
    </div>
  );
}
