const express = require('express');
const db = require('../db');
const { authenticate, requireRole } = require('../middleware/auth');
const { checkAndIssueCertificate } = require('../services/certificateService');

const router = express.Router();

function isEnrolled(studentId, courseId) {
  return !!db.prepare('SELECT id FROM enrollments WHERE student_id = ? AND course_id = ?').get(studentId, courseId);
}

// ---------- Admin: create a quiz with questions/options in one payload ----------
// body: { course_id, title, pass_percentage, feedback_mode, questions: [{ question_text, options: [{option_text, is_correct}] }] }
router.post('/', authenticate, requireRole('admin'), (req, res) => {
  const { course_id, title, pass_percentage, feedback_mode, questions } = req.body;
  if (!course_id || !title) return res.status(400).json({ error: 'course_id and title are required' });

  const quizId = db.prepare('INSERT INTO quizzes (course_id, title, pass_percentage, feedback_mode) VALUES (?,?,?,?)')
    .run(course_id, title, pass_percentage || 60, feedback_mode || 'immediate').lastInsertRowid;

  (questions || []).forEach((q, idx) => {
    const qId = db.prepare('INSERT INTO quiz_questions (quiz_id, question_text, order_index) VALUES (?,?,?)')
      .run(quizId, q.question_text, idx).lastInsertRowid;
    (q.options || []).forEach(opt => {
      db.prepare('INSERT INTO quiz_options (question_id, option_text, is_correct) VALUES (?,?,?)')
        .run(qId, opt.option_text, opt.is_correct ? 1 : 0);
    });
  });

  res.status(201).json({ quiz: db.prepare('SELECT * FROM quizzes WHERE id = ?').get(quizId) });
});

router.delete('/:id', authenticate, requireRole('admin'), (req, res) => {
  db.prepare('DELETE FROM quizzes WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

// ---------- Admin: full quiz detail with correct answers ----------
router.get('/:id/admin', authenticate, requireRole('admin'), (req, res) => {
  const quiz = db.prepare('SELECT * FROM quizzes WHERE id = ?').get(req.params.id);
  if (!quiz) return res.status(404).json({ error: 'Quiz not found' });
  const questions = db.prepare('SELECT * FROM quiz_questions WHERE quiz_id = ? ORDER BY order_index').all(quiz.id)
    .map(q => ({ ...q, options: db.prepare('SELECT * FROM quiz_options WHERE question_id = ?').all(q.id) }));
  res.json({ quiz, questions });
});

// ---------- Student: fetch quiz for taking (no correct answers revealed) ----------
router.get('/:id/take', authenticate, requireRole('student'), (req, res) => {
  const quiz = db.prepare('SELECT * FROM quizzes WHERE id = ?').get(req.params.id);
  if (!quiz) return res.status(404).json({ error: 'Quiz not found' });
  if (!isEnrolled(req.user.id, quiz.course_id)) return res.status(403).json({ error: 'Not enrolled in this course' });

  const questions = db.prepare('SELECT id, question_text, order_index FROM quiz_questions WHERE quiz_id = ? ORDER BY order_index').all(quiz.id)
    .map(q => ({ ...q, options: db.prepare('SELECT id, option_text FROM quiz_options WHERE question_id = ?').all(q.id) }));

  const lastAttempt = db.prepare('SELECT * FROM quiz_attempts WHERE quiz_id = ? AND student_id = ? ORDER BY submitted_at DESC LIMIT 1')
    .get(quiz.id, req.user.id);

  res.json({ quiz, questions, lastAttempt: lastAttempt || null });
});

// ---------- Student: submit answers ----------
// body: { answers: [{ question_id, selected_option_id }] }
router.post('/:id/submit', authenticate, requireRole('student'), (req, res) => {
  const quiz = db.prepare('SELECT * FROM quizzes WHERE id = ?').get(req.params.id);
  if (!quiz) return res.status(404).json({ error: 'Quiz not found' });
  if (!isEnrolled(req.user.id, quiz.course_id)) return res.status(403).json({ error: 'Not enrolled in this course' });

  const { answers } = req.body;
  const questions = db.prepare('SELECT * FROM quiz_questions WHERE quiz_id = ?').all(quiz.id);
  let score = 0;
  const gradedAnswers = [];

  for (const q of questions) {
    const submitted = (answers || []).find(a => a.question_id === q.id);
    const correctOption = db.prepare('SELECT * FROM quiz_options WHERE question_id = ? AND is_correct = 1').get(q.id);
    const isCorrect = submitted && correctOption && submitted.selected_option_id === correctOption.id;
    if (isCorrect) score++;
    gradedAnswers.push({
      question_id: q.id,
      selected_option_id: submitted ? submitted.selected_option_id : null,
      correct_option_id: correctOption ? correctOption.id : null,
      is_correct: !!isCorrect
    });
  }

  const total = questions.length;
  const percent = total === 0 ? 0 : Math.round((score / total) * 100);
  const passed = percent >= quiz.pass_percentage;

  const attemptId = db.prepare('INSERT INTO quiz_attempts (quiz_id, student_id, score, total, passed) VALUES (?,?,?,?,?)')
    .run(quiz.id, req.user.id, score, total, passed ? 1 : 0).lastInsertRowid;

  gradedAnswers.forEach(a => {
    db.prepare('INSERT INTO quiz_attempt_answers (attempt_id, question_id, selected_option_id, is_correct) VALUES (?,?,?,?)')
      .run(attemptId, a.question_id, a.selected_option_id, a.is_correct ? 1 : 0);
  });

  if (passed) checkAndIssueCertificate(req.user.id, quiz.course_id);

  const responsePayload = { score, total, percent, passed, feedback_mode: quiz.feedback_mode };
  if (quiz.feedback_mode === 'immediate') {
    responsePayload.answers = gradedAnswers;
  }
  res.status(201).json(responsePayload);
});

// Student: view past attempts for a quiz (results revealed regardless of mode, after grading window)
router.get('/:id/my-attempts', authenticate, requireRole('student'), (req, res) => {
  const attempts = db.prepare('SELECT * FROM quiz_attempts WHERE quiz_id = ? AND student_id = ? ORDER BY submitted_at DESC').all(req.params.id, req.user.id);
  res.json({ attempts });
});

module.exports = router;
