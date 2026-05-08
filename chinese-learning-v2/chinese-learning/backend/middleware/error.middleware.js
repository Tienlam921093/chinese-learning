function notFoundHandler(req, res, next) {
  const err = new Error(`${req.method} ${req.originalUrl} không tồn tại`);
  err.status = 404;
  next(err);
}

function globalErrorHandler(err, req, res, _next) {
  const status = err.status || 500;
  const isProd = process.env.NODE_ENV === 'production';
  const payload = {
    message: err.message || 'Internal Server Error',
  };
  if (!isProd) {
    payload.code = err.code || 'UNHANDLED_ERROR';
  }
  if (status >= 500) {
    console.error('[ERROR]', err.stack || err.message);
  }
  res.status(status).json(payload);
}

module.exports = { notFoundHandler, globalErrorHandler };
