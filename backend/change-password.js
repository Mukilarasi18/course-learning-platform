const bcrypt = require('bcryptjs');
const db = require('./db');

const newPassword = 'Mukilarasi@2007'; // <-- change this to your own password
const hash = bcrypt.hashSync(newPassword, 10);

const info = db.prepare("UPDATE users SET password_hash = ? WHERE role = 'admin'").run(hash);
console.log('Rows updated:', info.changes);