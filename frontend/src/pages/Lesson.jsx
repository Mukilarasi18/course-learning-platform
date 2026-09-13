import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { api } from '../api';

function toEmbedUrl(url) {
  if (!url) return '';
  if (url.includes('youtube.com/embed')) return url;
  const watch = url.match(/youtube\.com\/watch\?v=([\w-]+)/);
  if (watch) return `https://www.youtube.com/embed/${watch[1]}`;
  const short = url.match(/youtu\.be\/([\w-]+)/);
  if (short) return `https://www.youtube.com/embed/${short[1]}`;
  return url;
}

export default function Lesson() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [marking, setMarking] = useState(false);

  function load() {
    api.get(`/courses/lessons/${id}`).then(setData);
  }
  useEffect(load, [id]);

  async function markComplete() {
    setMarking(true);
    try {
      await api.post(`/courses/lessons/${id}/complete`);
      load();
    } finally {
      setMarking(false);
    }
  }

  if (!data) return <div className="container page">Loading…</div>;
  const { lesson, siblingLessons, course_id, completed } = data;
  const idx = siblingLessons.findIndex(l => l.id === lesson.id);
  const prev = siblingLessons[idx - 1];
  const next = siblingLessons[idx + 1];

  return (
    <div className="container page">
      <Link to={`/courses/${course_id}`} className="muted">← Back to course</Link>
      <h2 className="mt-16 mb-16">{lesson.title}</h2>

      {lesson.video_url && (
        <div className="video-wrap mb-24">
          <iframe src={toEmbedUrl(lesson.video_url)} title={lesson.title} allowFullScreen />
        </div>
      )}

      {lesson.content && (
        <div className="card mb-16">
          <h4 className="mb-8">Study Notes</h4>
          <p style={{ whiteSpace: 'pre-wrap' }}>{lesson.content}</p>
        </div>
      )}

      {lesson.resource_url && (
        <a className="card mb-16" style={{ display: 'block' }} href={lesson.resource_url} target="_blank" rel="noreferrer">
          📎 Download supporting material
        </a>
      )}

      <div className="flex-between mt-24 flex-wrap gap-12">
        <div className="flex gap-8">
          {prev && <button className="btn secondary" onClick={() => navigate(`/lessons/${prev.id}`)}>← Previous</button>}
          {next && <button className="btn secondary" onClick={() => navigate(`/lessons/${next.id}`)}>Next →</button>}
        </div>
        <button className="btn" onClick={markComplete} disabled={marking || completed}>
          {completed ? '✓ Completed' : marking ? 'Saving…' : 'Mark as Complete'}
        </button>
      </div>
    </div>
  );
}
