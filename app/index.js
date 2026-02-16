const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
const { logger } = require('./middleware/logger');
const { initDB } = require('./db');

const authRoutes = require('./routers/authRoutes');
const mazeRoutes = require('./routers/mazeRoutes');

const app = express();
const PORT = process.env.PORT || 3000;

// Inicializuj databázi
initDB();

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(logger);

// Statické soubory
app.use(express.static(path.join(__dirname, 'views')));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api', mazeRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK' });
});

// Hlavní stránka
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'index.html'));
});

// Spuštění serveru
app.listen(PORT, () => {
  console.log(`🚀 Server běží na http://localhost:${PORT}`);
  console.log(`🎮 Otevři si http://localhost:${PORT} v prohlížeči`);
});
