const mysql = require('mysql2/promise');
const bcrypt = require('bcrypt');
require('dotenv').config();

async function createDefaultUser() {
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
    const username = 'admin';
    const email = 'admin@piceon.com';
    const password = 'password123';
    const hashedPassword = await bcrypt.hash(password, 10);

    // Check if user exists
    const [existing] = await pool.execute('SELECT id FROM users WHERE email = ?', [email]);
    if (existing.length > 0) {
      console.log('User already exists');
      return;
    }

    // Create user
    const [result] = await pool.execute(
      `INSERT INTO users (username, email, password, gems, gold, inventory_slots, pity_counter) 
       VALUES (?, ?, ?, 300, 10000, 50, 0)`,
      [username, email, hashedPassword]
    );

    console.log(`User created successfully with ID: ${result.insertId}`);
    console.log(`Email: ${email}`);
    console.log(`Password: ${password}`);

  } catch (error) {
    console.error('Error creating user:', error);
  } finally {
    await pool.end();
  }
}

createDefaultUser();
