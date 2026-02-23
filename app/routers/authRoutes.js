const express = require('express');
const router = express.Router();
const { register, login } = require('../controllers/authController');

// Registrace
router.post('/register', async (req, res) => {
  const { username, password } = req.body;
  const result = await register(username, password);
  
  if (!result.success) {
    return res.status(400).json(result);
  }

  res.json(result);
});

// Přihlášení
router.post('/login', async (req, res) => {
  const { username, password } = req.body;
  const result = await login(username, password);
  
  if (!result.success) {
    return res.status(401).json(result);
  }

  res.json(result);
});

module.exports = router;
