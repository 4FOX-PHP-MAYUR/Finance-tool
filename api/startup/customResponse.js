/**
 * @desc    Send any success response
 *
 * @param   {string} message
 * @param   {object | array} results
 * @param   {number} statusCode
 */
exports.c_success = (message, results, statusCode) => {
    return {
      message,
      error: false,
      code: statusCode,
      results,
    };
  };
  
  /**
   * @desc    Send any error response
   *
   * @param   {string} message
   * @param   {number} statusCode
   */
  exports.c_error = (message, statusCode) => {
    // List of common HTTP request code
    const codes = [200, 201, 400, 401, 404, 403, 422, 500];
  
    // Get matched code
    const findCode = codes.find((code) => code == statusCode);
  
    if (!findCode) statusCode = 500;
    else statusCode = findCode;
  
    return {
      message,
      code: statusCode,
      error: true,
    };
  };
  
  /**
   * @desc    Send any validation response
   *
   * @param   {object | array} errors
   */
  exports.c_validate = (message) => {
    return {
      message,
      error: true,
      code: 400,
    };
  };


  /**
 * @desc    Send any success response with result data
 *
 * @param   {string} message
 * @param   {object | array} data
 */
exports.c_results = (message, data) => {
  if (message === undefined) {
    throw new Error("message parameters are required");
  }

  if(data === undefined){
    data = {}
  }
  return {
    message,
    data,
  };
};


