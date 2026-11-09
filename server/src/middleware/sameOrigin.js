export function requireSameOrigin(req, res, next) {
  const origin = req.get('origin')
  if (origin && origin !== process.env.CLIENT_ORIGIN) {
    return res.status(403).json({ message: 'Requests from this origin are not allowed.' })
  }
  return next()
}
