/**
 * Utility functions for standardized API responses
 */

/**
 * Send a successful response
 * @param {Object} data - Response data
 */
const successResponse = (data) => {
  return {
    success: true,
    ...data
  };
};

/**
 * Send an error response
 * @param {string} message - Error message
 * @param {string} code - Error code (optional)
 */
const errorResponse = (message, code = null) => {
  const response = {
    success: false,
    error: {
      message: message
    }
  };
  
  if (code) {
    response.error.code = code;
  }
  
  return response;
};

/**
 * Send a successful response directly to Express response object
 */
const success = (res, data, status = 200) => {
  return res.status(status).json(successResponse(data));
};

/**
 * Send an error response directly to Express response object
 */
const error = (res, code, message, status = 400) => {
  return res.status(status).json(errorResponse(message, code));
};

module.exports = {
  successResponse,
  errorResponse,
  success,
  error
};
// Optional helper functions:
// success(res, data, status=200)
// error(res, code, message, status)