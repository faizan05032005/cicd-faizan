// server.js
// Entry point. This is what "npm start" / PM2 runs (per the Jenkinsfile:
// npx pm2 start npm --name sadhixapp -- start).

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const path = require('path');
const { testConnection } = require('./config/db');

const healthRoute = require('./routes/health');
const itemsRoute = require('./routes/items');
const { router: authRoute } = require('./routes/auth');

const app = express();
const PORT = process.env.PORT || 3000;

// --- Middleware ---
app.use(cors({ origin: process.env.CORS_ORIGIN || '*', credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Serve any static assets (images, client-side JS/CSS) from /public.
// nginx can also serve these directly later if you want to offload it.
app.use(express.static(path.join(__dirname, 'public')));

// --- Routes ---
// Add new feature routes here as the app grows, e.g.:
// app.use('/api/users', require('./routes/users'));
app.use('/health', healthRoute);
app.use('/api/items', itemsRoute);
app.use('/api/auth', authRoute);

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

// --- 404 handler ---
app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// --- Central error handler ---
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong' });
});

// --- Start server ---
app.listen(PORT, async () => {
  console.log(`🚀 Sadhixapp listening on port ${PORT}`);
  await testConnection();
});
