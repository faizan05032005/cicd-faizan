// config/db.js
// Central MySQL connection pool. Every route imports this instead of
// creating its own connection, so upgrading (e.g. switching to a read
// replica, adding SSL, pooling limits) only needs to happen in one place.

const mysql = require('mysql2/promise');
require('dotenv').config();

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'sadhixapp_db',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

// Quick helper to test connectivity at startup and log a clear error
// instead of the app silently failing on the first request.
async function testConnection() {
  try {
    const conn = await pool.getConnection();
    console.log('✅ MySQL connected:', process.env.DB_HOST);
    conn.release();
  } catch (err) {
    console.error('❌ MySQL connection failed:', err.message);
  }
}

module.exports = { pool, testConnection };
