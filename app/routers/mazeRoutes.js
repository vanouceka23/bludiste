const express = require('express');
const router = express.Router();
const { initMaze, getMaze, movePlayer } = require('../controllers/mazeController');

// Inicializace nového bludiště pro uživatele
router.post('/maze/init', (req, res) => {
  const { userId } = req.body;

  if (!userId) {
    return res.status(400).json({ success: false, error: 'UserId je povinné' });
  }

  const result = initMaze(userId);
  
  if (!result.success) {
    return res.status(400).json(result);
  }

  res.json(result);
});

// Získej bludiště a pozici hráče
router.get('/maze/:userId', (req, res) => {
  const { userId } = req.params;
  const result = getMaze(userId);

  if (!result.success) {
    return res.status(404).json(result);
  }

  res.json(result);
});

// Pohyb hráče
router.post('/maze/move', (req, res) => {
  const { userId, x, y } = req.body;

  if (!userId || x === undefined || y === undefined) {
    return res.status(400).json({ success: false, error: 'UserId, x a y jsou povinné' });
  }

  const result = movePlayer(userId, x, y);

  if (!result.success) {
    return res.status(400).json(result);
  }

  res.json(result);
});

module.exports = router;
