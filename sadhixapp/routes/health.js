// routes/health.js
// Simple health endpoint. Useful for uptime checks, load balancer probes,
// and confirming the DB grant/connection actually works after deploy.

const express = require('express');
const router = express.Router();
const { pool } = require('../config/db');

router.get('/', async (req, res) => {
  const status = { app: 'ok', db: 'unknown', time: new Date().toISOString() };

  try {
    await pool.query('SELECT 1');
    status.db = 'ok';
    res.status(200).json(status);
  } catch (err) {
    status.db = 'error';
    status.error = err.message;
    res.status(503).json(status);
  }
});

module.exports = router;
