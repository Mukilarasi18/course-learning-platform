const Database = require('better-sqlite3');
const path = require('path');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

const const dbPath = process.env.DB_PATH || path.join(__dirname, 'lms.db');
const db = new Database(dbPath);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'student', -- 'student' | 'admin'
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS courses (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  description TEXT,
  thumbnail_url TEXT,
  category TEXT,
  level TEXT,
  published INTEGER DEFAULT 1,
  created_by INTEGER,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (created_by) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS modules (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  course_id INTEGER NOT NULL,
  title TEXT NOT NULL,
  order_index INTEGER DEFAULT 0,
  FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS lessons (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  module_id INTEGER NOT NULL,
  title TEXT NOT NULL,
  video_url TEXT,
  content TEXT,
  resource_url TEXT,
  order_index INTEGER DEFAULT 0,
  FOREIGN KEY (module_id) REFERENCES modules(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS enrollments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  student_id INTEGER NOT NULL,
  course_id INTEGER NOT NULL,
  enrolled_at TEXT DEFAULT (datetime('now')),
  UNIQUE(student_id, course_id),
  FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS lesson_progress (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  student_id INTEGER NOT NULL,
  lesson_id INTEGER NOT NULL,
  completed INTEGER DEFAULT 0,
  completed_at TEXT,
  UNIQUE(student_id, lesson_id),
  FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (lesson_id) REFERENCES lessons(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS tasks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  course_id INTEGER NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  due_date TEXT,
  max_marks INTEGER DEFAULT 100,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS task_submissions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  task_id INTEGER NOT NULL,
  student_id INTEGER NOT NULL,
  file_url TEXT,
  text_answer TEXT,
  submitted_at TEXT DEFAULT (datetime('now')),
  grade INTEGER,
  feedback TEXT,
  graded_at TEXT,
  UNIQUE(task_id, student_id),
  FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
  FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS quizzes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  course_id INTEGER NOT NULL,
  title TEXT NOT NULL,
  pass_percentage INTEGER DEFAULT 60,
  feedback_mode TEXT DEFAULT 'immediate', -- 'immediate' | 'delayed'
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS quiz_questions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  quiz_id INTEGER NOT NULL,
  question_text TEXT NOT NULL,
  order_index INTEGER DEFAULT 0,
  FOREIGN KEY (quiz_id) REFERENCES quizzes(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS quiz_options (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  question_id INTEGER NOT NULL,
  option_text TEXT NOT NULL,
  is_correct INTEGER DEFAULT 0,
  FOREIGN KEY (question_id) REFERENCES quiz_questions(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS quiz_attempts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  quiz_id INTEGER NOT NULL,
  student_id INTEGER NOT NULL,
  score INTEGER,
  total INTEGER,
  passed INTEGER,
  submitted_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (quiz_id) REFERENCES quizzes(id) ON DELETE CASCADE,
  FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS quiz_attempt_answers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  attempt_id INTEGER NOT NULL,
  question_id INTEGER NOT NULL,
  selected_option_id INTEGER,
  is_correct INTEGER DEFAULT 0,
  FOREIGN KEY (attempt_id) REFERENCES quiz_attempts(id) ON DELETE CASCADE,
  FOREIGN KEY (question_id) REFERENCES quiz_questions(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS projects (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  course_id INTEGER NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  max_marks INTEGER DEFAULT 100,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS project_submissions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id INTEGER NOT NULL,
  student_id INTEGER NOT NULL,
  file_url TEXT,
  notes TEXT,
  submitted_at TEXT DEFAULT (datetime('now')),
  grade INTEGER,
  feedback TEXT,
  graded_at TEXT,
  UNIQUE(project_id, student_id),
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
  FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS certificates (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  certificate_uid TEXT UNIQUE NOT NULL,
  student_id INTEGER NOT NULL,
  course_id INTEGER NOT NULL,
  student_name TEXT NOT NULL,
  course_title TEXT NOT NULL,
  issued_at TEXT DEFAULT (datetime('now')),
  UNIQUE(student_id, course_id),
  FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE
);
`);

// Seed an admin user and a demo course if DB is empty
const userCount = db.prepare('SELECT COUNT(*) c FROM users').get().c;
if (userCount === 0) {
  const adminHash = bcrypt.hashSync('Admin@123', 10);
  const studentHash = bcrypt.hashSync('Student@123', 10);
  const insertUser = db.prepare('INSERT INTO users (name, email, password_hash, role) VALUES (?,?,?,?)');
  const adminId = insertUser.run('Platform Admin', 'admin@learnhub.local', adminHash, 'admin').lastInsertRowid;
  const studentId = insertUser.run('Demo Student', 'student@learnhub.com', studentHash, 'student').lastInsertRowid;

  const courseId = db.prepare(`INSERT INTO courses (title, description, thumbnail_url, category, level, created_by) VALUES (?,?,?,?,?,?)`)
    .run('Introduction to Web Development', 'Learn HTML, CSS and JavaScript from scratch and build real projects.', 'https://picsum.photos/seed/webdev/600/360', 'Development', 'Beginner', adminId).lastInsertRowid;

  const moduleId = db.prepare('INSERT INTO modules (course_id, title, order_index) VALUES (?,?,?)')
    .run(courseId, 'Getting Started', 0).lastInsertRowid;

  db.prepare('INSERT INTO lessons (module_id, title, video_url, content, order_index) VALUES (?,?,?,?,?)')
    .run(moduleId, 'Welcome & Setup', 'https://www.youtube.com/embed/dQw4w9WgXcQ', 'Set up your dev environment: install a code editor and a modern browser.', 0);
  db.prepare('INSERT INTO lessons (module_id, title, video_url, content, order_index) VALUES (?,?,?,?,?)')
    .run(moduleId, 'HTML Basics', 'https://www.youtube.com/embed/dQw4w9WgXcQ', 'Learn tags, elements, and document structure.', 1);

  const taskId = db.prepare('INSERT INTO tasks (course_id, title, description, max_marks) VALUES (?,?,?,?)')
    .run(courseId, 'Build a Simple Webpage', 'Create an HTML page with a heading, paragraph, and image. Submit the file or a link.', 100).lastInsertRowid;

  const quizId = db.prepare('INSERT INTO quizzes (course_id, title, pass_percentage, feedback_mode) VALUES (?,?,?,?)')
    .run(courseId, 'HTML Basics Quiz', 60, 'immediate').lastInsertRowid;
  const q1 = db.prepare('INSERT INTO quiz_questions (quiz_id, question_text, order_index) VALUES (?,?,?)')
    .run(quizId, 'Which tag defines the largest heading?', 0).lastInsertRowid;
  db.prepare('INSERT INTO quiz_options (question_id, option_text, is_correct) VALUES (?,?,?)').run(q1, '<h1>', 1);
  db.prepare('INSERT INTO quiz_options (question_id, option_text, is_correct) VALUES (?,?,?)').run(q1, '<h6>', 0);
  db.prepare('INSERT INTO quiz_options (question_id, option_text, is_correct) VALUES (?,?,?)').run(q1, '<head>', 0);

  db.prepare('INSERT INTO projects (course_id, title, description, max_marks) VALUES (?,?,?,?)')
    .run(courseId, 'Personal Portfolio Page', 'Build and submit a small personal portfolio using HTML/CSS.', 100);

  db.prepare('INSERT INTO enrollments (student_id, course_id) VALUES (?,?)').run(studentId, courseId);

  console.log('Seeded database with demo admin/student/course.');
  console.log('Admin login: [email protected] / Admin@123');
  console.log('Student login: [email protected] / Student@123');
}

module.exports = db;
