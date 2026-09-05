const express = require('express');
const db = require('../db');
const { authenticate, requireRole } = require('../middleware/auth');
const upload = require('../middleware/upload');

const router = express.Router();

// ---------- Public catalogue ----------
router.get('/', (req, res) => {
  const courses = db.prepare(`
    SELECT c.*, 
      (SELECT COUNT(*) FROM enrollments e WHERE e.course_id = c.id) as enrolled_count,
      (SELECT COUNT(*) FROM modules m JOIN lessons l ON l.module_id = m.id WHERE m.course_id = c.id) as lesson_count
    FROM courses c WHERE c.published = 1 ORDER BY c.created_at DESC
  `).all();
  res.json({ courses });
});

// ---------- Course detail (public summary; full content requires enrollment/admin) ----------
router.get('/:id', (req, res) => {
  const course = db.prepare('SELECT * FROM courses WHERE id = ?').get(req.params.id);
  if (!course) return res.status(404).json({ error: 'Course not found' });

  const modules = db.prepare('SELECT * FROM modules WHERE course_id = ? ORDER BY order_index').all(course.id);
  const tasks = db.prepare('SELECT id, title, description, due_date, max_marks FROM tasks WHERE course_id = ?').all(course.id);
  const quizzes = db.prepare('SELECT id, title, pass_percentage, feedback_mode FROM quizzes WHERE course_id = ?').all(course.id);
  const projects = db.prepare('SELECT id, title, description, max_marks FROM projects WHERE course_id = ?').all(course.id);

  let enrolled = false;
  let isAdmin = false;
  const header = req.headers.authorization;
  if (header) {
    try {
      const jwt = require('jsonwebtoken');
      const { JWT_SECRET } = require('../middleware/auth');
      const payload = jwt.verify(header.replace('Bearer ', ''), JWT_SECRET);
      isAdmin = payload.role === 'admin';
      if (payload.role === 'student') {
        const e = db.prepare('SELECT id FROM enrollments WHERE student_id = ? AND course_id = ?').get(payload.id, course.id);
        enrolled = !!e;
      }
    } catch (e) { /* ignore invalid token for public view */ }
  }

  const modulesWithLessons = modules.map(m => {
    const lessons = db.prepare('SELECT * FROM lessons WHERE module_id = ? ORDER BY order_index').all(m.id);
    return {
      ...m,
      lessons: (enrolled || isAdmin) ? lessons : lessons.map(l => ({ id: l.id, title: l.title, order_index: l.order_index, locked: true }))
    };
  });

  res.json({ course, modules: modulesWithLessons, tasks, quizzes, projects, enrolled, isAdmin });
});

// ---------- Admin: create/update/delete course ----------
router.post('/', authenticate, requireRole('admin'), (req, res) => {
  const { title, description, thumbnail_url, category, level } = req.body;
  if (!title) return res.status(400).json({ error: 'Title is required' });
  const info = db.prepare(`INSERT INTO courses (title, description, thumbnail_url, category, level, created_by) VALUES (?,?,?,?,?,?)`)
    .run(title, description || '', thumbnail_url || '', category || '', level || 'Beginner', req.user.id);
  const course = db.prepare('SELECT * FROM courses WHERE id = ?').get(info.lastInsertRowid);
  res.status(201).json({ course });
});

router.put('/:id', authenticate, requireRole('admin'), (req, res) => {
  const course = db.prepare('SELECT * FROM courses WHERE id = ?').get(req.params.id);
  if (!course) return res.status(404).json({ error: 'Course not found' });
  const { title, description, thumbnail_url, category, level, published } = req.body;
  db.prepare(`UPDATE courses SET title=?, description=?, thumbnail_url=?, category=?, level=?, published=? WHERE id=?`)
    .run(
      title ?? course.title,
      description ?? course.description,
      thumbnail_url ?? course.thumbnail_url,
      category ?? course.category,
      level ?? course.level,
      published !== undefined ? (published ? 1 : 0) : course.published,
      course.id
    );
  res.json({ course: db.prepare('SELECT * FROM courses WHERE id = ?').get(course.id) });
});

router.delete('/:id', authenticate, requireRole('admin'), (req, res) => {
  db.prepare('DELETE FROM courses WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

// ---------- Admin: modules ----------
router.post('/:id/modules', authenticate, requireRole('admin'), (req, res) => {
  const { title, order_index } = req.body;
  if (!title) return res.status(400).json({ error: 'Title is required' });
  const info = db.prepare('INSERT INTO modules (course_id, title, order_index) VALUES (?,?,?)')
    .run(req.params.id, title, order_index || 0);
  res.status(201).json({ module: db.prepare('SELECT * FROM modules WHERE id = ?').get(info.lastInsertRowid) });
});

router.delete('/modules/:moduleId', authenticate, requireRole('admin'), (req, res) => {
  db.prepare('DELETE FROM modules WHERE id = ?').run(req.params.moduleId);
  res.json({ success: true });
});

// ---------- Admin: lessons (video + resources) ----------
router.post('/modules/:moduleId/lessons', authenticate, requireRole('admin'), (req, res) => {
  const { title, video_url, content, order_index } = req.body;
  if (!title) return res.status(400).json({ error: 'Title is required' });
  const info = db.prepare('INSERT INTO lessons (module_id, title, video_url, content, order_index) VALUES (?,?,?,?,?)')
    .run(req.params.moduleId, title, video_url || '', content || '', order_index || 0);
  res.status(201).json({ lesson: db.prepare('SELECT * FROM lessons WHERE id = ?').get(info.lastInsertRowid) });
});

router.put('/lessons/:lessonId', authenticate, requireRole('admin'), (req, res) => {
  const lesson = db.prepare('SELECT * FROM lessons WHERE id = ?').get(req.params.lessonId);
  if (!lesson) return res.status(404).json({ error: 'Lesson not found' });
  const { title, video_url, content, resource_url, order_index } = req.body;
  db.prepare('UPDATE lessons SET title=?, video_url=?, content=?, resource_url=?, order_index=? WHERE id=?')
    .run(
      title ?? lesson.title, video_url ?? lesson.video_url, content ?? lesson.content,
      resource_url ?? lesson.resource_url, order_index ?? lesson.order_index, lesson.id
    );
  res.json({ lesson: db.prepare('SELECT * FROM lessons WHERE id = ?').get(lesson.id) });
});

router.delete('/lessons/:lessonId', authenticate, requireRole('admin'), (req, res) => {
  db.prepare('DELETE FROM lessons WHERE id = ?').run(req.params.lessonId);
  res.json({ success: true });
});

// ---------- Student/Admin: get a single lesson (requires enrollment) ----------
router.get('/lessons/:lessonId', authenticate, (req, res) => {
  const lesson = db.prepare('SELECT * FROM lessons WHERE id = ?').get(req.params.lessonId);
  if (!lesson) return res.status(404).json({ error: 'Lesson not found' });
  const module = db.prepare('SELECT * FROM modules WHERE id = ?').get(lesson.module_id);

  if (req.user.role === 'student') {
    const enrolled = db.prepare('SELECT id FROM enrollments WHERE student_id = ? AND course_id = ?').get(req.user.id, module.course_id);
    if (!enrolled) return res.status(403).json({ error: 'You must be enrolled in this course' });
  }

  const siblingLessons = db.prepare(`
    SELECT l.id, l.title, l.order_index FROM lessons l WHERE l.module_id = ? ORDER BY l.order_index
  `).all(module.id);

  let completed = false;
  if (req.user.role === 'student') {
    const p = db.prepare('SELECT completed FROM lesson_progress WHERE student_id = ? AND lesson_id = ?').get(req.user.id, lesson.id);
    completed = !!(p && p.completed);
  }

  res.json({ lesson, module, course_id: module.course_id, siblingLessons, completed });
});

// ---------- Admin: upload a resource/video file, returns a URL ----------
router.post('/upload', authenticate, requireRole('admin'), upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
  res.json({ url: `/uploads/${req.file.filename}`, originalName: req.file.originalname });
});

// ---------- Student: mark lesson complete ----------
router.post('/lessons/:lessonId/complete', authenticate, requireRole('student'), (req, res) => {
  const lesson = db.prepare('SELECT * FROM lessons WHERE id = ?').get(req.params.lessonId);
  if (!lesson) return res.status(404).json({ error: 'Lesson not found' });
  const module = db.prepare('SELECT * FROM modules WHERE id = ?').get(lesson.module_id);
  const enrolled = db.prepare('SELECT id FROM enrollments WHERE student_id = ? AND course_id = ?').get(req.user.id, module.course_id);
  if (!enrolled) return res.status(403).json({ error: 'You must be enrolled in this course' });

  db.prepare(`
    INSERT INTO lesson_progress (student_id, lesson_id, completed, completed_at)
    VALUES (?,?,1, datetime('now'))
    ON CONFLICT(student_id, lesson_id) DO UPDATE SET completed=1, completed_at=datetime('now')
  `).run(req.user.id, lesson.id);

  require('../services/certificateService').checkAndIssueCertificate(req.user.id, module.course_id);
  res.json({ success: true });
});

module.exports = router;
