// routes/auth.js
// Handles account creation and login.
// Passwords are never stored as plain text - only a bcrypt hash is saved.
// On successful login, a JWT is issued and stored in an httpOnly cookie,
// so the browser sends it automatically on future requests.

const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { pool } = require('../config/db');

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-me';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// POST /api/auth/signup - create a new account
router.post('/signup', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }
  if (!isValidEmail(email)) {
    return res.status(400).json({ error: 'Please enter a valid email address' });
  }
  if (password.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters' });
  }

  try {
    const [existing] = await pool.query('SELECT id FROM users WHERE email = ?', [email]);
    if (existing.length > 0) {
      return res.status(409).json({ error: 'An account with this email already exists. Please log in instead.' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const [result] = await pool.query(
      'INSERT INTO users (email, password_hash) VALUES (?, ?)',
      [email, passwordHash]
    );

    const token = jwt.sign({ id: result.insertId, email }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
    res.cookie('token', token, { httpOnly: true, sameSite: 'lax', maxAge: 7 * 24 * 60 * 60 * 1000 });

    res.status(201).json({ message: 'Account created', user: { id: result.insertId, email } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/auth/login - log in to an existing account
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  try {
    const [rows] = await pool.query('SELECT * FROM users WHERE email = ?', [email]);
    if (rows.length === 0) {
      return res.status(401).json({ error: 'No account found with this email. Please create one.' });
    }

    const user = rows[0];
    const passwordMatches = await bcrypt.compare(password, user.password_hash);
    if (!passwordMatches) {
      return res.status(401).json({ error: 'Incorrect password' });
    }

    const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
    res.cookie('token', token, { httpOnly: true, sameSite: 'lax', maxAge: 7 * 24 * 60 * 60 * 1000 });

    res.json({ message: 'Logged in', user: { id: user.id, email: user.email } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/auth/logout - clear the session cookie
router.post('/logout', (req, res) => {
  res.clearCookie('token');
  res.json({ message: 'Logged out' });
});

// GET /api/auth/me - check who's currently logged in (used by the page to decide what to show)
router.get('/me', (req, res) => {
  const token = req.cookies?.token;
  if (!token) return res.status(401).json({ error: 'Not logged in' });

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    res.json({ user: { id: decoded.id, email: decoded.email } });
  } catch (err) {
    res.status(401).json({ error: 'Session expired, please log in again' });
  }
});

// Middleware other routes can use to require login (import { requireAuth } from this file)
function requireAuth(req, res, next) {
  const token = req.cookies?.token;
  if (!token) return res.status(401).json({ error: 'Not logged in' });
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch (err) {
    res.status(401).json({ error: 'Session expired, please log in again' });
  }
}

module.exports = { router, requireAuth };
