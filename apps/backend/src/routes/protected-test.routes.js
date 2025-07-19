const express = require('express');
const authMiddleware = require('../middlewares/auth.middleware');

const router = express.Router();

// GET /protected-test - requires authentication
router.get('/', authMiddleware, (req, res) => {
  res.json({
    tenantId: req.tenant,
    userId: req.user.userId
  });
});

module.exports = router;