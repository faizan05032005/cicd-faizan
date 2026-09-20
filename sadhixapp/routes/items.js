// routes/items.js
// Example CRUD resource. Copy this file's pattern (routes/<name>.js) whenever
// you add a new feature — e.g. routes/users.js, routes/orders.js — then
// require it in server.js. Keeps growth of the app predictable.
//
// Expects a table like:
//   CREATE TABLE items (
//     id INT AUTO_INCREMENT PRIMARY KEY,
//     name VARCHAR(255) NOT NULL,
//     created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
//   );

const express = require('express');
const router = express.Router();
const { pool } = require('../config/db');

// GET /api/items - list all
router.get('/', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM items ORDER BY id DESC');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/items/:id - get one
router.get('/:id', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM items WHERE id = ?', [req.params.id]);
    if (rows.length === 0) return res.status(404).json({ error: 'Item not found' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/items - create
router.post('/', async (req, res) => {
  const { name } = req.body;
  if (!name) return res.status(400).json({ error: 'name is required' });

  try {
    const [result] = await pool.query('INSERT INTO items (name) VALUES (?)', [name]);
    res.status(201).json({ id: result.insertId, name });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/items/:id - update
router.put('/:id', async (req, res) => {
  const { name } = req.body;
  if (!name) return res.status(400).json({ error: 'name is required' });

  try {
    const [result] = await pool.query('UPDATE items SET name = ? WHERE id = ?', [name, req.params.id]);
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Item not found' });
    res.json({ id: req.params.id, name });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/items/:id - delete
router.delete('/:id', async (req, res) => {
  try {
    const [result] = await pool.query('DELETE FROM items WHERE id = ?', [req.params.id]);
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Item not found' });
    res.status(204).send();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
