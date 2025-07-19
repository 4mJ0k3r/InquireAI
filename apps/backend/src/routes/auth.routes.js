const express = require('express');
const jwt = require('../utils/jwt');

const router = express.Router();

// POST /auth/login
router.post('/login', (req, res) => {
  const { email } = req.body;
  
  if (!email) {
    return res.status(400).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Email is required'
      }
    });
  }
  
  // Create fake user object
  const user = { userId: 'u_demo', email, role: 'admin' };
  const tenantId = 'demo';
  
  // Sign JWT token
  const token = jwt.sign({ sub: user.userId, tenantId, role: user.role });
  
  // Respond with token, user, and tenant info
  res.json({
    token,
    user,
    tenant: { tenantId }
  });
});

module.exports = router;