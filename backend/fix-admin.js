const db = require('./db');

const info = db.prepare("UPDATE users SET email = ? WHERE role = 'admin'")
  .run('admin@learnhub.local');

console.log('Rows updated:', info.changes);

const users = db.prepare('SELECT id, email, role FROM users').all();
console.log(users);