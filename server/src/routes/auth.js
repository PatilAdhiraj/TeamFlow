import { Router } from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { rateLimit } from 'express-rate-limit'
import { z } from 'zod'
import User from '../models/User.js'
import { authCookieName, requireAuth } from '../middleware/auth.js'

const router = Router()
const credentialsSchema = z.object({
  email: z.string().email().max(254).transform((email) => email.toLowerCase().trim()),
  password: z.string().min(8).max(128),
})
const registerSchema = credentialsSchema.extend({
  name: z.string().trim().min(1).max(80),
})
const loginLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 10, standardHeaders: 'draft-8', legacyHeaders: false })
const cookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict',
  path: '/',
  maxAge: 7 * 24 * 60 * 60 * 1000,
}

function signInCookie(res, user) {
  const token = jwt.sign({}, process.env.JWT_SECRET, { subject: user.id, expiresIn: '7d', algorithm: 'HS256' })
  res.cookie(authCookieName, token, cookieOptions)
}

router.post('/register', loginLimiter, async (req, res) => {
  const input = registerSchema.parse(req.body)
  const passwordHash = await bcrypt.hash(input.password, 12)
  const user = await User.create({ name: input.name, email: input.email, passwordHash })
  signInCookie(res, user)
  return res.status(201).json({ user: { id: user.id, name: user.name, email: user.email } })
})

router.post('/login', loginLimiter, async (req, res) => {
  const input = credentialsSchema.parse(req.body)
  const user = await User.findOne({ email: input.email }).select('+passwordHash')
  if (!user || !(await bcrypt.compare(input.password, user.passwordHash))) {
    return res.status(401).json({ message: 'Email or password is incorrect.' })
  }
  signInCookie(res, user)
  return res.json({ user: { id: user.id, name: user.name, email: user.email } })
})

router.post('/logout', (req, res) => {
  res.clearCookie(authCookieName, { ...cookieOptions, maxAge: undefined })
  return res.status(204).end()
})

router.get('/me', requireAuth, async (req, res) => {
  const user = await User.findById(req.user.id).select('name email')
  if (!user) return res.status(401).json({ message: 'Your account is no longer available.' })
  return res.json({ user: { id: user.id, name: user.name, email: user.email } })
})

export default router
