const User = require('../models/User');
const Session = require('../models/Session');
const jwt = require('../utils/jwt');

class AuthService {
  async register(email, password, role = 'user') {
    try {
      // Check if user already exists
      const existingUser = await User.findOne({ email });
      if (existingUser) {
        throw new Error('User already exists with this email');
      }

      // Create new user
      const user = new User({
        email,
        password,
        role
      });

      await user.save();
      return user;
    } catch (error) {
      throw error;
    }
  }

  async login(email, password, userAgent = '', ipAddress = '') {
    try {
      // Find user by email
      const user = await User.findOne({ email, isActive: true });
      if (!user) {
        throw new Error('Invalid credentials');
      }

      // Check password
      const isPasswordValid = await user.comparePassword(password);
      if (!isPasswordValid) {
        throw new Error('Invalid credentials');
      }

      // Generate token pair
      const tokenData = jwt.generateTokenPair({
        sub: user._id.toString(),
        email: user.email,
        role: user.role,
        tenantId: user._id.toString() // Use user ID as tenant ID for isolation
      });

      // Create session
      const session = new Session({
        userId: user._id,
        token: tokenData.accessToken,
        refreshToken: tokenData.refreshToken,
        userAgent,
        ipAddress,
        expiresAt: new Date(Date.now() + tokenData.expiresIn * 1000),
        refreshExpiresAt: new Date(Date.now() + tokenData.refreshExpiresIn * 1000)
      });

      await session.save();

      // Update user's last login
      await user.updateLastLogin();

      return {
        user,
        session,
        tokens: tokenData
      };
    } catch (error) {
      throw error;
    }
  }

  async refreshToken(refreshToken) {
    try {
      // Verify refresh token
      const decoded = jwt.verifyRefreshToken(refreshToken);
      
      // Find session
      const session = await Session.findOne({
        refreshToken,
        isActive: true
      }).populate('userId');

      if (!session || !session.isValid()) {
        throw new Error('Invalid or expired refresh token');
      }

      // Generate new token pair
      const tokenData = jwt.generateTokenPair({
        sub: session.userId._id.toString(),
        email: session.userId.email,
        role: session.userId.role,
        tenantId: session.userId._id.toString()
      });

      // Update session
      session.token = tokenData.accessToken;
      session.refreshToken = tokenData.refreshToken;
      session.expiresAt = new Date(Date.now() + tokenData.expiresIn * 1000);
      session.refreshExpiresAt = new Date(Date.now() + tokenData.refreshExpiresIn * 1000);
      session.lastUsed = new Date();

      await session.save();

      return {
        user: session.userId,
        tokens: tokenData
      };
    } catch (error) {
      throw error;
    }
  }

  async logout(token) {
    try {
      // Find and deactivate session
      const session = await Session.findOne({ token, isActive: true });
      if (session) {
        session.isActive = false;
        await session.save();
      }
      return true;
    } catch (error) {
      throw error;
    }
  }

  async logoutAll(userId) {
    try {
      // Deactivate all sessions for user
      await Session.updateMany(
        { userId, isActive: true },
        { isActive: false }
      );
      return true;
    } catch (error) {
      throw error;
    }
  }

  async validateSession(token) {
    try {
      // Verify JWT token
      const decoded = jwt.verify(token);
      
      // Find active session
      const session = await Session.findOne({
        token,
        isActive: true
      }).populate('userId');

      if (!session || !session.isValid()) {
        throw new Error('Invalid or expired session');
      }

      // Update last used
      await session.refresh();

      return {
        user: session.userId,
        session,
        decoded
      };
    } catch (error) {
      throw error;
    }
  }

  async getUserSessions(userId) {
    try {
      const sessions = await Session.find({
        userId,
        isActive: true
      }).sort({ lastUsed: -1 });

      return sessions;
    } catch (error) {
      throw error;
    }
  }

  async cleanupExpiredSessions() {
    try {
      const result = await Session.deleteMany({
        $or: [
          { expiresAt: { $lt: new Date() } },
          { isActive: false }
        ]
      });
      return result.deletedCount;
    } catch (error) {
      throw error;
    }
  }
}

module.exports = new AuthService();