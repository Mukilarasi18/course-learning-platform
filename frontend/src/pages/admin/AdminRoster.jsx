import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '../../api';
import { ProgressBar } from '../../components/Common';

export default function AdminRoster() {
  const { courseId } = useParams();
  const [students, setStudents] = useState([]);
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  function load() {
    api.get(`/enrollments/course/${courseId}/roster`).then(res => setStudents(res.students));
  }
  useEffect(load, [courseId]);

  async function handleEnroll(e) {
    e.preventDefault();
    setError(''); setSuccess('');
    try {
      await api.post('/enrollments/admin/enroll', { student_email: email, course_id: Number(courseId) });
      setSuccess(`Enrolled ${email}`);
      setEmail('');
      load();
    } catch (err) {
      setError(err.message);
    }
  }

  async function issueCertificate(studentId) {
    await api.post('/certificates/issue', { student_id: studentId, course_id: Number(courseId) });
    load();
  }

  return (
    <div className="container page">
      <h2 className="mb-24">Student Roster</h2>

      <div className="card mb-24">
        <h4 className="mb-8">Enroll a Student</h4>
        {error && <div className="alert error">{error}</div>}
        {success && <div className="alert success">{success}</div>}
        <form onSubmit={handleEnroll} className="flex gap-8">
          <input type="email" required placeholder="[email protected]" value={email} onChange={e => setEmail(e.target.value)} />
          <button className="btn">Enroll</button>
        </form>
      </div>

      <table className="card">
        <thead><tr><th>Name</th><th>Email</th><th>Progress</th><th></th></tr></thead>
        <tbody>
          {students.map(s => (
            <tr key={s.id}>
              <td>{s.name}</td>
              <td>{s.email}</td>
              <td style={{ minWidth: 160 }}>
                <ProgressBar percent={s.progress.percent} />
                <span className="muted" style={{ fontSize: '0.75rem' }}>{s.progress.percent}%</span>
              </td>
              <td>
                {s.progress.complete
                  ? <button className="btn small" onClick={() => issueCertificate(s.id)}>Issue Certificate</button>
                  : <span className="muted" style={{ fontSize: '0.8rem' }}>Not yet complete</span>}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
