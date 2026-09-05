const db = require('../db');
const { v4: uuidv4 } = require('uuid');

// Computes a student's progress across all elements of a course.
function getCourseProgress(studentId, courseId) {
  const totalLessons = db.prepare(`
    SELECT COUNT(*) c FROM lessons l JOIN modules m ON l.module_id = m.id WHERE m.course_id = ?
  `).get(courseId).c;
  const completedLessons = db.prepare(`
    SELECT COUNT(*) c FROM lesson_progress lp
    JOIN lessons l ON lp.lesson_id = l.id JOIN modules m ON l.module_id = m.id
    WHERE m.course_id = ? AND lp.student_id = ? AND lp.completed = 1
  `).get(courseId, studentId).c;

  const totalTasks = db.prepare('SELECT COUNT(*) c FROM tasks WHERE course_id = ?').get(courseId).c;
  const completedTasks = db.prepare(`
    SELECT COUNT(*) c FROM task_submissions ts JOIN tasks t ON ts.task_id = t.id
    WHERE t.course_id = ? AND ts.student_id = ?
  `).get(courseId, studentId).c;

  const totalQuizzes = db.prepare('SELECT COUNT(*) c FROM quizzes WHERE course_id = ?').get(courseId).c;
  const passedQuizzes = db.prepare(`
    SELECT COUNT(DISTINCT qa.quiz_id) c FROM quiz_attempts qa JOIN quizzes q ON qa.quiz_id = q.id
    WHERE q.course_id = ? AND qa.student_id = ? AND qa.passed = 1
  `).get(courseId, studentId).c;

  const totalProjects = db.prepare('SELECT COUNT(*) c FROM projects WHERE course_id = ?').get(courseId).c;
  const submittedProjects = db.prepare(`
    SELECT COUNT(*) c FROM project_submissions ps JOIN projects p ON ps.project_id = p.id
    WHERE p.course_id = ? AND ps.student_id = ?
  `).get(courseId, studentId).c;

  const totalItems = totalLessons + totalTasks + totalQuizzes + totalProjects;
  const completedItems = completedLessons + completedTasks + passedQuizzes + submittedProjects;
  const percent = totalItems === 0 ? 0 : Math.round((completedItems / totalItems) * 100);

  return {
    lessons: { total: totalLessons, completed: completedLessons },
    tasks: { total: totalTasks, completed: completedTasks },
    quizzes: { total: totalQuizzes, completed: passedQuizzes },
    projects: { total: totalProjects, completed: submittedProjects },
    percent,
    complete: totalItems > 0 && completedItems === totalItems
  };
}

function checkAndIssueCertificate(studentId, courseId) {
  const progress = getCourseProgress(studentId, courseId);
  if (!progress.complete) return null;

  const existing = db.prepare('SELECT * FROM certificates WHERE student_id = ? AND course_id = ?').get(studentId, courseId);
  if (existing) return existing;

  const student = db.prepare('SELECT * FROM users WHERE id = ?').get(studentId);
  const course = db.prepare('SELECT * FROM courses WHERE id = ?').get(courseId);
  const uid = `CERT-${new Date().getFullYear()}-${uuidv4().split('-')[0].toUpperCase()}`;

  const info = db.prepare(`
    INSERT INTO certificates (certificate_uid, student_id, course_id, student_name, course_title)
    VALUES (?,?,?,?,?)
  `).run(uid, studentId, courseId, student.name, course.title);

  return db.prepare('SELECT * FROM certificates WHERE id = ?').get(info.lastInsertRowid);
}

module.exports = { getCourseProgress, checkAndIssueCertificate };
