const express = require('express');
const db = require('../db');
const { authenticate, requireRole } = require('../middleware/auth');
const upload = require('../middleware/upload');
const { checkAndIssueCertificate } = require('../services/certificateService');

const router = express.Router();

function isEnrolled(studentId, courseId) {
  return !!db.prepare('SELECT id FROM enrollments WHERE student_id = ? AND course_id = ?').get(studentId, courseId);
}

// ===================== TASKS =====================
router.post('/tasks', authenticate, requireRole('admin'), (req, res) => {
  const { course_id, title, description, due_date, max_marks } = req.body;
  if (!course_id || !title) return res.status(400).json({ error: 'course_id and title are required' });
  const info = db.prepare('INSERT INTO tasks (course_id, title, description, due_date, max_marks) VALUES (?,?,?,?,?)')
    .run(course_id, title, description || '', due_date || null, max_marks || 100);
  res.status(201).json({ task: db.prepare('SELECT * FROM tasks WHERE id = ?').get(info.lastInsertRowid) });
});

router.put('/tasks/:id', authenticate, requireRole('admin'), (req, res) => {
  const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(req.params.id);
  if (!task) return res.status(404).json({ error: 'Task not found' });
  const { title, description, due_date, max_marks } = req.body;
  db.prepare('UPDATE tasks SET title=?, description=?, due_date=?, max_marks=? WHERE id=?')
    .run(title ?? task.title, description ?? task.description, due_date ?? task.due_date, max_marks ?? task.max_marks, task.id);
  res.json({ task: db.prepare('SELECT * FROM tasks WHERE id = ?').get(task.id) });
});

router.delete('/tasks/:id', authenticate, requireRole('admin'), (req, res) => {
  db.prepare('DELETE FROM tasks WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

// Get single task detail (enrolled students or admin)
router.get('/tasks/:id', authenticate, (req, res) => {
  const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(req.params.id);
  if (!task) return res.status(404).json({ error: 'Task not found' });
  if (req.user.role === 'student' && !isEnrolled(req.user.id, task.course_id)) {
    return res.status(403).json({ error: 'Not enrolled in this course' });
  }
  res.json({ task });
});

// Student submits a task (file + optional text)
router.post('/tasks/:id/submit', authenticate, requireRole('student'), upload.single('file'), (req, res) => {
  const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(req.params.id);
  if (!task) return res.status(404).json({ error: 'Task not found' });
  if (!isEnrolled(req.user.id, task.course_id)) return res.status(403).json({ error: 'Not enrolled in this course' });

  const fileUrl = req.file ? `/uploads/${req.file.filename}` : null;
  const { text_answer } = req.body;
  if (!fileUrl && !text_answer) return res.status(400).json({ error: 'Submit a file or a text answer' });

  db.prepare(`
    INSERT INTO task_submissions (task_id, student_id, file_url, text_answer)
    VALUES (?,?,?,?)
    ON CONFLICT(task_id, student_id) DO UPDATE SET file_url=excluded.file_url, text_answer=excluded.text_answer, submitted_at=datetime('now'), grade=NULL, feedback=NULL, graded_at=NULL
  `).run(task.id, req.user.id, fileUrl, text_answer || null);

  checkAndIssueCertificate(req.user.id, task.course_id);
  res.status(201).json({ success: true });
});

// Student: my submission for a task
router.get('/tasks/:id/my-submission', authenticate, requireRole('student'), (req, res) => {
  const sub = db.prepare('SELECT * FROM task_submissions WHERE task_id = ? AND student_id = ?').get(req.params.id, req.user.id);
  res.json({ submission: sub || null });
});

// Admin: list submissions for a task
router.get('/tasks/:id/submissions', authenticate, requireRole('admin'), (req, res) => {
  const subs = db.prepare(`
    SELECT ts.*, u.name as student_name, u.email as student_email FROM task_submissions ts
    JOIN users u ON ts.student_id = u.id WHERE ts.task_id = ? ORDER BY ts.submitted_at DESC
  `).all(req.params.id);
  res.json({ submissions: subs });
});

// Admin: grade a task submission
router.put('/task-submissions/:id/grade', authenticate, requireRole('admin'), (req, res) => {
  const { grade, feedback } = req.body;
  const sub = db.prepare('SELECT * FROM task_submissions WHERE id = ?').get(req.params.id);
  if (!sub) return res.status(404).json({ error: 'Submission not found' });
  db.prepare(`UPDATE task_submissions SET grade=?, feedback=?, graded_at=datetime('now') WHERE id=?`)
    .run(grade, feedback || '', sub.id);
  res.json({ submission: db.prepare('SELECT * FROM task_submissions WHERE id = ?').get(sub.id) });
});

// ===================== PROJECTS =====================
router.post('/projects', authenticate, requireRole('admin'), (req, res) => {
  const { course_id, title, description, max_marks } = req.body;
  if (!course_id || !title) return res.status(400).json({ error: 'course_id and title are required' });
  const info = db.prepare('INSERT INTO projects (course_id, title, description, max_marks) VALUES (?,?,?,?)')
    .run(course_id, title, description || '', max_marks || 100);
  res.status(201).json({ project: db.prepare('SELECT * FROM projects WHERE id = ?').get(info.lastInsertRowid) });
});

router.put('/projects/:id', authenticate, requireRole('admin'), (req, res) => {
  const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(req.params.id);
  if (!project) return res.status(404).json({ error: 'Project not found' });
  const { title, description, max_marks } = req.body;
  db.prepare('UPDATE projects SET title=?, description=?, max_marks=? WHERE id=?')
    .run(title ?? project.title, description ?? project.description, max_marks ?? project.max_marks, project.id);
  res.json({ project: db.prepare('SELECT * FROM projects WHERE id = ?').get(project.id) });
});

router.delete('/projects/:id', authenticate, requireRole('admin'), (req, res) => {
  db.prepare('DELETE FROM projects WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

// Get single project detail (enrolled students or admin)
router.get('/projects/:id', authenticate, (req, res) => {
  const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(req.params.id);
  if (!project) return res.status(404).json({ error: 'Project not found' });
  if (req.user.role === 'student' && !isEnrolled(req.user.id, project.course_id)) {
    return res.status(403).json({ error: 'Not enrolled in this course' });
  }
  res.json({ project });
});

router.post('/projects/:id/submit', authenticate, requireRole('student'), upload.single('file'), (req, res) => {
  const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(req.params.id);
  if (!project) return res.status(404).json({ error: 'Project not found' });
  if (!isEnrolled(req.user.id, project.course_id)) return res.status(403).json({ error: 'Not enrolled in this course' });

  const fileUrl = req.file ? `/uploads/${req.file.filename}` : null;
  const { notes } = req.body;
  if (!fileUrl && !notes) return res.status(400).json({ error: 'Submit a file or notes/link' });

  db.prepare(`
    INSERT INTO project_submissions (project_id, student_id, file_url, notes)
    VALUES (?,?,?,?)
    ON CONFLICT(project_id, student_id) DO UPDATE SET file_url=excluded.file_url, notes=excluded.notes, submitted_at=datetime('now'), grade=NULL, feedback=NULL, graded_at=NULL
  `).run(project.id, req.user.id, fileUrl, notes || null);

  checkAndIssueCertificate(req.user.id, project.course_id);
  res.status(201).json({ success: true });
});

router.get('/projects/:id/my-submission', authenticate, requireRole('student'), (req, res) => {
  const sub = db.prepare('SELECT * FROM project_submissions WHERE project_id = ? AND student_id = ?').get(req.params.id, req.user.id);
  res.json({ submission: sub || null });
});

router.get('/projects/:id/submissions', authenticate, requireRole('admin'), (req, res) => {
  const subs = db.prepare(`
    SELECT ps.*, u.name as student_name, u.email as student_email FROM project_submissions ps
    JOIN users u ON ps.student_id = u.id WHERE ps.project_id = ? ORDER BY ps.submitted_at DESC
  `).all(req.params.id);
  res.json({ submissions: subs });
});

router.put('/project-submissions/:id/grade', authenticate, requireRole('admin'), (req, res) => {
  const { grade, feedback } = req.body;
  const sub = db.prepare('SELECT * FROM project_submissions WHERE id = ?').get(req.params.id);
  if (!sub) return res.status(404).json({ error: 'Submission not found' });
  db.prepare(`UPDATE project_submissions SET grade=?, feedback=?, graded_at=datetime('now') WHERE id=?`)
    .run(grade, feedback || '', sub.id);
  res.json({ submission: db.prepare('SELECT * FROM project_submissions WHERE id = ?').get(sub.id) });
});

module.exports = router;
