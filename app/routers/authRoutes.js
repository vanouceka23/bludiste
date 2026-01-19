const express = require('express');
const router = express.Router();
const { register, login } = require('../controllers/authController');

// Registrace
router.post('/register', (req, res) => {
  const { username, password } = req.body;
  const result = register(username, password);
  
  if (!result.success) {
    return res.status(400).json(result);
  }

  res.json(result);
});

// Přihlášení
router.post('/login', (req, res) => {
  const { username, password } = req.body;
  const result = login(username, password);
  
  if (!result.success) {
    return res.status(401).json(result);
  }

  res.json(result);
});

module.exports = router;
