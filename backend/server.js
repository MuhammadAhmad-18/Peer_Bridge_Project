require('dotenv').config();
const express = require('express');
const cors    = require('cors');
const path    = require('path');
const ensureSchema = require('./config/ensureSchema');

const app = express();

app.use(cors({ origin: '*' }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve uploaded files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Serve frontend
app.use(express.static(path.join(__dirname, '../frontend')));

// API routes
app.use('/api/auth',      require('./routes/auth'));
app.use('/api/posts',     require('./routes/posts'));
app.use('/api/users',     require('./routes/users'));
app.use('/api/messages',  require('./routes/messages'));
app.use('/api/resources', require('./routes/resources'));
app.use('/api/events',    require('./routes/events'));
app.use('/api/reports',   require('./routes/reports'));

// Fallback: serve index.html for any non-API route
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

// Central error handler
app.use((err, req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: err.message || 'Internal server error' });
});

const PORT = process.env.PORT || 3000;

async function start() {
  await ensureSchema();
  app.listen(PORT, () => {
    console.log(`\n  Peer Bridge backend running at http://localhost:${PORT}`);
    console.log(`  NODE_ENV = ${process.env.NODE_ENV || 'development'}\n`);
  });
}

start().catch((err) => {
  console.error('Failed to start backend:', err);
  process.exit(1);
});
