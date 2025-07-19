const jwt = require('../utils/jwt');

const authMiddleware = (req, res, next) => {
  try {
    // Extract Bearer token from Authorization header
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        error: {
          code: 'UNAUTHORIZED',
          message: 'Missing or invalid authorization header'
        }
      });
    }
    
    const token = authHeader.substring(7); // Remove 'Bearer ' prefix
    
    // Verify token
    const decoded = jwt.verify(token);
    
    // Attach user and tenant info to request
    req.user = {
      userId: decoded.sub,
      role: decoded.role
    };
    req.tenant = decoded.tenantId;
    
    next();
  } catch (error) {
    return res.status(401).json({
      error: {
        code: 'UNAUTHORIZED',
        message: 'Invalid or expired token'
      }
    });
  }
};

module.exports = authMiddleware;