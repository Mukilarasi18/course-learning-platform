import React, { useState } from 'react';
import { api } from '../api';

export default function VerifyCertificate() {
  const [uid, setUid] = useState('');
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError(''); setResult(null);
    setLoading(true);
    try {
      const res = await api.get(`/certificates/verify/${encodeURIComponent(uid.trim())}`);
      setResult(res.certificate);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="container page">
      <div className="card auth-box">
        <h2 className="mb-8">Verify a Certificate</h2>
        <p className="muted mb-16">Enter a certificate ID to confirm its authenticity.</p>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Certificate ID</label>
            <input required value={uid} onChange={e => setUid(e.target.value)} placeholder="CERT-2026-XXXXXXXX" />
          </div>
          <button className="btn full" disabled={loading}>{loading ? 'Checking…' : 'Verify'}</button>
        </form>

        {error && <div className="alert error mt-16">{error}</div>}

        {result && (
          <div className="card mt-16" style={{ background: '#f0fdf4', borderColor: 'var(--success)' }}>
            <span className="badge success mb-8">✓ Valid Certificate</span>
            <p><strong>Student:</strong> {result.student_name}</p>
            <p><strong>Course:</strong> {result.course_title}</p>
            <p><strong>Issued:</strong> {new Date(result.issued_at).toLocaleDateString()}</p>
            <p><strong>Certificate ID:</strong> {result.certificate_uid}</p>
          </div>
        )}
      </div>
    </div>
  );
}
