import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';
import { ProgressBar } from '../components/Common';

export default function Dashboard() {
  const [courses, setCourses] = useState([]);
  const [certificates, setCertificates] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get('/enrollments/my'),
      api.get('/certificates/my')
    ]).then(([c, cert]) => {
      setCourses(c.courses);
      setCertificates(cert.certificates);
    }).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="container page">Loading…</div>;

  return (
    <div className="container page">
      <h2 className="mb-24">My Dashboard</h2>

      {courses.length === 0 && (
        <div className="card text-center">
          <p className="muted mb-16">You haven't enrolled in any courses yet.</p>
          <Link to="/courses"><button className="btn">Browse Courses</button></Link>
        </div>
      )}

      <div className="grid mb-32">
        {courses.map(c => (
          <div key={c.id} className="card course-card">
            <h3>{c.title}</h3>
            <div className="flex-between mb-8">
              <span className="muted" style={{ fontSize: '0.8rem' }}>Progress</span>
              <span style={{ fontSize: '0.8rem' }}>{c.progress.percent}%</span>
            </div>
            <ProgressBar percent={c.progress.percent} />
            <div className="mt-16 flex gap-8 flex-wrap">
              <Link to={`/courses/${c.id}`}><button className="btn small secondary">Continue</button></Link>
              {c.certificate_uid && (
                <Link to={`/certificates/${c.id}`}><button className="btn small">🏆 Certificate</button></Link>
              )}
            </div>
          </div>
        ))}
      </div>

      {certificates.length > 0 && (
        <>
          <h3 className="mb-16">My Certificates</h3>
          <table className="card">
            <thead>
              <tr><th>Course</th><th>Certificate ID</th><th>Issued</th><th></th></tr>
            </thead>
            <tbody>
              {certificates.map(cert => (
                <tr key={cert.id}>
                  <td>{cert.course_title}</td>
                  <td>{cert.certificate_uid}</td>
                  <td>{new Date(cert.issued_at).toLocaleDateString()}</td>
                  <td><Link to={`/certificates/${cert.course_id}`}>View</Link></td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}
    </div>
  );
}
