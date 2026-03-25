const { ZodError } = require("zod");

function errorHandler(error, req, res, next) {
  if (res.headersSent) {
    return next(error);
  }

  if (error instanceof ZodError) {
    return res.status(400).json({
      error: "Validation failed",
      details: error.issues.map((issue) => ({
        path: issue.path.join("."),
        message: issue.message
      }))
    });
  }

  const statusCode = error.statusCode || error.status || 500;

  return res.status(statusCode).json({
    error: error.message || "Internal server error"
  });
}

module.exports = {
  errorHandler
};
