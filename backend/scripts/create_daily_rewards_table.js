/**
 * Create Daily Rewards Table
 * Run: node scripts/create_daily_rewards_table.js
 */

require('dotenv').config();
const mysql = require('mysql2/promise');

async function createTable() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'picoen'
  });

  console.log('Connected to database...');

  const sql = `
    CREATE TABLE IF NOT EXISTS user_daily_rewards (
      id INT PRIMARY KEY AUTO_INCREMENT,
      user_id INT NOT NULL UNIQUE,
      
      streak_count INT DEFAULT 1 NOT NULL,
      last_claimed_at DATE NULL,
      
      total_claims INT DEFAULT 0 NOT NULL,
      total_gold_earned INT DEFAULT 0 NOT NULL,
      total_gems_earned INT DEFAULT 0 NOT NULL,
      
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      
      INDEX idx_user_id (user_id),
      INDEX idx_last_claimed (last_claimed_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `;

  try {
    await connection.execute(sql);
    console.log('✅ Table user_daily_rewards created successfully!');
  } catch (error) {
    if (error.code === 'ER_TABLE_EXISTS_ERROR') {
      console.log('ℹ️  Table already exists');
    } else {
      console.error('❌ Error:', error.message);
    }
  }

  await connection.end();
  console.log('Done!');
}

createTable();
