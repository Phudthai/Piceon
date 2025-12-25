const { testConnection, closePool } = require('./config/database');
require('dotenv').config();

async function verify() {
  console.log('Testing database connection...');
  const success = await testConnection();
  if (success) {
    console.log('Verification SUCCESS: Database connected.');
  } else {
    console.error('Verification FAILED: Database connection failed.');
  }
  await closePool();
}

verify();
