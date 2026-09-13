import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../api';

export default function CertificatePage() {
  const { courseId } = useParams();
  const [cert, setCert] = useState(null);
  const [error, setError] = useState('');
  const [progress, setProgress] = useState(null);

  useEffect(() => {
    api.get(`/certificates/course/${courseId}`)
      .then(res => setCert(res.certificate))
      .catch(err => {
        setError(err.message);
        api.get(`/enrollments/${courseId}/progress`).then(res => setProgress(res.progress)).catch(() => {});
      });
  }, [courseId]);

  function handlePrint() {
    window.print();
  }

  if (error) {
    return (
      <div className="container page">
        <div className="card text-center">
          <h3>Certificate Not Yet Available</h3>
          <p className="muted">{error}</p>
          {progress && (
            <p className="muted">Overall progress: {progress.percent}% complete</p>
          )}
          <Link to={`/courses/${courseId}`}><button className="btn mt-16">Back to Course</button></Link>
        </div>
      </div>
    );
  }

  if (!cert) return <div className="container page">Loading…</div>;

  return (
    <div className="container page">
      <div className="certificate">
        <h1>Certificate of Completion</h1>
        <p className="muted">This certifies that</p>
        <div className="name">{cert.student_name}</div>
        <p className="muted">has successfully completed the course</p>
        <div className="course">{cert.course_title}</div>
        <div className="meta">
          Issued on {new Date(cert.issued_at).toLocaleDateString()} · Certificate ID: <strong>{cert.certificate_uid}</strong>
        </div>
      </div>
      <div className="flex gap-12 mt-24 text-center" style={{ justifyContent: 'center' }}>
        <button className="btn" onClick={handlePrint}>⬇ Download / Print</button>
        <Link to="/verify"><button className="btn secondary">Verify a Certificate</button></Link>
      </div>
    </div>
  );
}
