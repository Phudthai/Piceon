const mysql = require('mysql2/promise');
const bcrypt = require('bcrypt');
require('dotenv').config();

async function verifyLogin() {
  const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'piceon_db',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
  });

  try {
    const email = 'admin@piceon.com';
    const password = 'password123';

    // Find user
    const [rows] = await pool.execute('SELECT * FROM users WHERE email = ?', [email]);
    if (rows.length === 0) {
      console.error('User not found');
      return;
    }

    const user = rows[0];
    const match = await bcrypt.compare(password, user.password);

    if (match) {
      console.log('Login verification SUCCESS: Password matches.');
    } else {
      console.error('Login verification FAILED: Password does not match.');
    }

  } catch (error) {
    console.error('Error verifying login:', error);
  } finally {
    await pool.end();
  }
}

verifyLogin();
