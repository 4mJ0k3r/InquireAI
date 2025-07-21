const express = require('express');
const authService = require('../services/auth.service');
const authMiddleware = require('../middlewares/auth.middleware');

const router = express.Router();

// POST /auth/register
router.post('/register', async (req, res) => {
  try {
    const { email, password, role } = req.body;
    
    // Validation
    if (!email || !password) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Email and password are required'
        }
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Password must be at least 6 characters long'
        }
      });
    }

    // Register user
    const user = await authService.register(email, password, role);

    res.status(201).json({
      message: 'User registered successfully',
      user: {
        id: user._id,
        email: user.email,
        role: user.role,
        createdAt: user.createdAt
      }
    });
  } catch (error) {
    if (error.message === 'User already exists with this email') {
      return res.status(409).json({
        error: {
          code: 'USER_EXISTS',
          message: error.message
        }
      });
    }

    res.status(500).json({
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Registration failed'
      }
    });
  }
});

// POST /auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Email and password are required'
        }
      });
    }

    // Get client info
    const userAgent = req.headers['user-agent'] || '';
    const ipAddress = req.ip || req.connection.remoteAddress || '';

    // Login user
    const { user, session, tokens } = await authService.login(email, password, userAgent, ipAddress);

    res.json({
      message: 'Login successful',
      token: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      expiresIn: tokens.expiresIn,
      user: {
        id: user._id,
        email: user.email,
        role: user.role,
        lastLogin: user.lastLogin
      },
      tenant: {
        tenantId: user._id.toString()
      }
    });
  } catch (error) {
    if (error.message === 'Invalid credentials') {
      return res.status(401).json({
        error: {
          code: 'INVALID_CREDENTIALS',
          message: 'Invalid email or password'
        }
      });
    }

    res.status(500).json({
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Login failed'
      }
    });
  }
});

// POST /auth/refresh
router.post('/refresh', async (req, res) => {
  try {
    const { refreshToken } = req.body;
    
    if (!refreshToken) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Refresh token is required'
        }
      });
    }

    // Refresh tokens
    const { user, tokens } = await authService.refreshToken(refreshToken);

    res.json({
      message: 'Token refreshed successfully',
      token: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      expiresIn: tokens.expiresIn,
      user: {
        id: user._id,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    return res.status(401).json({
      error: {
        code: 'INVALID_REFRESH_TOKEN',
        message: error.message
      }
    });
  }
});

// POST /auth/logout
router.post('/logout', authMiddleware, async (req, res) => {
  try {
    await authService.logout(req.token);
    
    res.json({
      message: 'Logout successful'
    });
  } catch (error) {
    res.status(500).json({
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Logout failed'
      }
    });
  }
});

// POST /auth/logout-all
router.post('/logout-all', authMiddleware, async (req, res) => {
  try {
    await authService.logoutAll(req.user.userId);
    
    res.json({
      message: 'All sessions logged out successfully'
    });
  } catch (error) {
    res.status(500).json({
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Logout all failed'
      }
    });
  }
});

// GET /auth/me
router.get('/me', authMiddleware, async (req, res) => {
  try {
    res.json({
      user: {
        id: req.user.userId,
        email: req.user.email,
        role: req.user.role,
        tenantId: req.user.tenantId
      },
      session: {
        id: req.session._id,
        lastUsed: req.session.lastUsed,
        expiresAt: req.session.expiresAt
      }
    });
  } catch (error) {
    res.status(500).json({
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to get user info'
      }
    });
  }
});

// GET /auth/sessions
router.get('/sessions', authMiddleware, async (req, res) => {
  try {
    const sessions = await authService.getUserSessions(req.user.userId);
    
    res.json({
      sessions: sessions.map(session => ({
        id: session._id,
        userAgent: session.userAgent,
        ipAddress: session.ipAddress,
        lastUsed: session.lastUsed,
        expiresAt: session.expiresAt,
        isActive: session.isActive,
        isCurrent: session.token === req.token
      }))
    });
  } catch (error) {
    res.status(500).json({
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to get sessions'
      }
    });
  }
});

module.exports = router;