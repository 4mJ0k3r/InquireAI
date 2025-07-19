const errorMiddleware = (err, req, res, next) => {
  console.error('Error:', err);
  
  // Default error response
  let status = 500;
  let errorResponse = {
    error: {
      code: 'INTERNAL_SERVER_ERROR',
      message: 'An unexpected error occurred'
    }
  };
  
  // Handle specific error types
  if (err.name === 'ValidationError') {
    status = 400;
    errorResponse.error.code = 'VALIDATION_ERROR';
    errorResponse.error.message = err.message;
  } else if (err.name === 'UnauthorizedError' || err.message.includes('token')) {
    status = 401;
    errorResponse.error.code = 'UNAUTHORIZED';
    errorResponse.error.message = 'Authentication failed';
  } else if (err.status) {
    status = err.status;
    errorResponse.error.message = err.message || errorResponse.error.message;
  }
  
  res.status(status).json(errorResponse);
};

module.exports = errorMiddleware;