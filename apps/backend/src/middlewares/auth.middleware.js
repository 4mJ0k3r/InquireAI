const authService = require('../services/auth.service');

const authMiddleware = async (req, res, next) => {
  try {
    let token = null;
    
    // First, try to extract Bearer token from Authorization header
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7); // Remove 'Bearer ' prefix
    }
    
    // If no token in header, check query parameters (for EventSource compatibility)
    if (!token && req.query.token) {
      token = req.query.token;
    }
    
    console.log('🔍 Auth middleware debug:');
    console.log('  - Request URL:', req.url);
    console.log('  - Request method:', req.method);
    console.log('  - Token found:', !!token);
    console.log('  - Token source:', authHeader ? 'header' : 'query');
    console.log('  - Token length:', token ? token.length : 0);
    
    if (!token) {
      console.log('❌ No token found');
      return res.status(401).json({
        error: {
          code: 'UNAUTHORIZED',
          message: 'Missing or invalid authorization token'
        }
      });
    }
    
    // Validate session
    console.log('🔄 Validating session...');
    const { user, session, decoded } = await authService.validateSession(token);
    
    // Attach user and tenant info to request
    req.user = {
      userId: user._id.toString(),
      email: user.email,
      role: user.role,
      tenantId: user._id.toString() // Use user ID as tenant ID for data isolation
    };
    
    req.session = session;
    req.token = token;
    
    next();
  } catch (error) {
    console.log('❌ Auth middleware error:');
    console.log('  - Error message:', error.message);
    console.log('  - Error stack:', error.stack);
    return res.status(401).json({
      error: {
        code: 'UNAUTHORIZED',
        message: error.message || 'Invalid or expired token'
      }
    });
  }
};

module.exports = authMiddleware;