import jwt from 'jsonwebtoken'

export const authCookieName = 'teamflow_token'

export function requireAuth(req, res, next) {
  const token = req.cookies[authCookieName]
  if (!token) return res.status(401).json({ message: 'Please sign in to continue.' })
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET, { algorithms: ['HS256'] })
    req.user = { id: payload.sub }
    return next()
  } catch {
    return res.status(401).json({ message: 'Your session has expired. Please sign in again.' })
  }
}
