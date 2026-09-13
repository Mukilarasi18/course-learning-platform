const express = require('express');
const db = require('../db');
const { authenticate, requireRole } = require('../middleware/auth');
const { checkAndIssueCertificate, getCourseProgress } = require('../services/certificateService');

const router = express.Router();

// Student: list my certificates
router.get('/my', authenticate, requireRole('student'), (req, res) => {
  const certs = db.prepare('SELECT * FROM certificates WHERE student_id = ? ORDER BY issued_at DESC').all(req.user.id);
  res.json({ certificates: certs });
});

// Student: get/generate certificate for a specific course (if eligible)
router.get('/course/:courseId', authenticate, requireRole('student'), (req, res) => {
  let cert = db.prepare('SELECT * FROM certificates WHERE student_id = ? AND course_id = ?').get(req.user.id, req.params.courseId);
  if (!cert) {
    cert = checkAndIssueCertificate(req.user.id, req.params.courseId);
  }
  if (!cert) {
    const progress = getCourseProgress(req.user.id, req.params.courseId);
    return res.status(404).json({ error: 'Course not yet complete', progress });
  }
  res.json({ certificate: cert });
});

// Admin: manually issue a certificate regardless of progress
router.post('/issue', authenticate, requireRole('admin'), (req, res) => {
  const { student_id, course_id } = req.body;
  const existing = db.prepare('SELECT * FROM certificates WHERE student_id = ? AND course_id = ?').get(student_id, course_id);
  if (existing) return res.json({ certificate: existing });

  const student = db.prepare('SELECT * FROM users WHERE id = ?').get(student_id);
  const course = db.prepare('SELECT * FROM courses WHERE id = ?').get(course_id);
  if (!student || !course) return res.status(404).json({ error: 'Student or course not found' });

  const { v4: uuidv4 } = require('uuid');
  const uid = `CERT-${new Date().getFullYear()}-${uuidv4().split('-')[0].toUpperCase()}`;
  const info = db.prepare(`INSERT INTO certificates (certificate_uid, student_id, course_id, student_name, course_title) VALUES (?,?,?,?,?)`)
    .run(uid, student_id, course_id, student.name, course.title);
  res.status(201).json({ certificate: db.prepare('SELECT * FROM certificates WHERE id = ?').get(info.lastInsertRowid) });
});

// Admin: list all issued certificates
router.get('/admin/all', authenticate, requireRole('admin'), (req, res) => {
  const certs = db.prepare(`
    SELECT c.*, u.email as student_email FROM certificates c JOIN users u ON c.student_id = u.id
    ORDER BY c.issued_at DESC
  `).all();
  res.json({ certificates: certs });
});

// Admin: revoke/delete a certificate
router.delete('/:id', authenticate, requireRole('admin'), (req, res) => {
  db.prepare('DELETE FROM certificates WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

// PUBLIC: verify a certificate by its unique ID — no auth required
router.get('/verify/:uid', (req, res) => {
  const cert = db.prepare('SELECT * FROM certificates WHERE certificate_uid = ?').get(req.params.uid.trim());
  if (!cert) return res.status(404).json({ valid: false, error: 'No certificate found with this ID' });
  res.json({
    valid: true,
    certificate: {
      certificate_uid: cert.certificate_uid,
      student_name: cert.student_name,
      course_title: cert.course_title,
      issued_at: cert.issued_at
    }
  });
});

module.exports = router;
