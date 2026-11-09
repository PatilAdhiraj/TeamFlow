export function notFound(req, res) {
  res.status(404).json({ message: 'Route not found.' })
}

export function errorHandler(error, req, res, next) {
  if (res.headersSent) return next(error)
  if (error.name === 'ZodError') {
    return res.status(400).json({ message: error.issues[0]?.message || 'Invalid request.' })
  }
  if (error.name === 'ValidationError') {
    return res.status(400).json({ message: 'Please check the provided information.' })
  }
  if (error.code === 11000) {
    return res.status(409).json({ message: 'An account with that email already exists.' })
  }
  if (error.name === 'CastError') {
    return res.status(404).json({ message: 'The requested item was not found.' })
  }
  console.error(error)
  return res.status(500).json({ message: 'An unexpected server error occurred.' })
}
