import React, { useEffect, useState } from 'react';
import { api } from '../../api';

export default function AdminCertificates() {
  const [certs, setCerts] = useState([]);

  function load() {
    api.get('/certificates/admin/all').then(res => setCerts(res.certificates));
  }
  useEffect(load, []);

  async function revoke(id) {
    if (!confirm('Revoke this certificate? This cannot be undone.')) return;
    await api.del(`/certificates/${id}`);
    load();
  }

  return (
    <div className="container page">
      <h2 className="mb-24">Issued Certificates</h2>
      <table className="card">
        <thead><tr><th>Certificate ID</th><th>Student</th><th>Course</th><th>Issued</th><th></th></tr></thead>
        <tbody>
          {certs.map(c => (
            <tr key={c.id}>
              <td>{c.certificate_uid}</td>
              <td>{c.student_name}<br /><span className="muted" style={{ fontSize: '0.75rem' }}>{c.student_email}</span></td>
              <td>{c.course_title}</td>
              <td>{new Date(c.issued_at).toLocaleDateString()}</td>
              <td><button className="btn small danger" onClick={() => revoke(c.id)}>Revoke</button></td>
            </tr>
          ))}
        </tbody>
      </table>
      {certs.length === 0 && <p className="muted">No certificates issued yet.</p>}
    </div>
  );
}
