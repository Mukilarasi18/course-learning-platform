const express = require('express');
const db = require('../db');
const { authenticate, requireRole } = require('../middleware/auth');
const { getCourseProgress } = require('../services/certificateService');

const router = express.Router();

// Student enrolls in a course
router.post('/', authenticate, requireRole('student'), (req, res) => {
  const { course_id } = req.body;
  const course = db.prepare('SELECT * FROM courses WHERE id = ?').get(course_id);
  if (!course) return res.status(404).json({ error: 'Course not found' });

  const existing = db.prepare('SELECT id FROM enrollments WHERE student_id = ? AND course_id = ?').get(req.user.id, course_id);
  if (existing) return res.status(409).json({ error: 'Already enrolled' });

  db.prepare('INSERT INTO enrollments (student_id, course_id) VALUES (?,?)').run(req.user.id, course_id);
  res.status(201).json({ success: true });
});

// Student: list my enrolled courses with progress
router.get('/my', authenticate, requireRole('student'), (req, res) => {
  const rows = db.prepare(`
    SELECT c.* FROM enrollments e JOIN courses c ON e.course_id = c.id WHERE e.student_id = ?
    ORDER BY e.enrolled_at DESC
  `).all(req.user.id);

  const withProgress = rows.map(c => {
    const progress = getCourseProgress(req.user.id, c.id);
    const cert = db.prepare('SELECT certificate_uid FROM certificates WHERE student_id = ? AND course_id = ?').get(req.user.id, c.id);
    return { ...c, progress, certificate_uid: cert ? cert.certificate_uid : null };
  });

  res.json({ courses: withProgress });
});

// Student: progress for one course
router.get('/:courseId/progress', authenticate, requireRole('student'), (req, res) => {
  const progress = getCourseProgress(req.user.id, req.params.courseId);
  res.json({ progress });
});

// Admin: roster for a course
router.get('/course/:courseId/roster', authenticate, requireRole('admin'), (req, res) => {
  const students = db.prepare(`
    SELECT u.id, u.name, u.email, e.enrolled_at FROM enrollments e
    JOIN users u ON e.student_id = u.id WHERE e.course_id = ?
    ORDER BY e.enrolled_at DESC
  `).all(req.params.courseId);

  const withProgress = students.map(s => ({ ...s, progress: getCourseProgress(s.id, req.params.courseId) }));
  res.json({ students: withProgress });
});

// Admin: enroll a student manually
router.post('/admin/enroll', authenticate, requireRole('admin'), (req, res) => {
  const { student_email, course_id } = req.body;
  const student = db.prepare('SELECT * FROM users WHERE email = ? AND role = ?').get(student_email.toLowerCase(), 'student');
  if (!student) return res.status(404).json({ error: 'Student not found' });
  const existing = db.prepare('SELECT id FROM enrollments WHERE student_id = ? AND course_id = ?').get(student.id, course_id);
  if (existing) return res.status(409).json({ error: 'Already enrolled' });
  db.prepare('INSERT INTO enrollments (student_id, course_id) VALUES (?,?)').run(student.id, course_id);
  res.status(201).json({ success: true });
});

// Admin: list all students
router.get('/admin/students', authenticate, requireRole('admin'), (req, res) => {
  const students = db.prepare(`SELECT id, name, email, created_at FROM users WHERE role = 'student' ORDER BY created_at DESC`).all();
  res.json({ students });
});

module.exports = router;
