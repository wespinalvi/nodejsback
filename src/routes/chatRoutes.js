const express = require('express');
const router = express.Router();

// Simple health route for chat module
router.get('/status', (req, res) => {
  res.json({ ok: true, module: 'chat' });
});

module.exports = router;
