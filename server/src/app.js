import express from 'express'
import cookieParser from 'cookie-parser'
import cors from 'cors'
import helmet from 'helmet'
import { requireAuth } from './middleware/auth.js'
import { errorHandler, notFound } from './middleware/errors.js'
import { requireSameOrigin } from './middleware/sameOrigin.js'
import authRoutes from './routes/auth.js'
import workspaceRoutes from './routes/workspaces.js'
import projectRoutes from './routes/projects.js'
import taskRoutes from './routes/tasks.js'

const app = express()

app.disable('x-powered-by')
app.use(helmet())
app.use(cors({ origin: process.env.CLIENT_ORIGIN, credentials: true }))
app.use(express.json({ limit: '32kb' }))
app.use(cookieParser())
app.use(requireSameOrigin)

app.get('/api/health', (req, res) => res.json({ status: 'ok' }))
app.use('/api/auth', authRoutes)
app.use('/api/workspaces', requireAuth, workspaceRoutes)
app.use('/api', requireAuth, projectRoutes)
app.use('/api', requireAuth, taskRoutes)
app.use(notFound)
app.use(errorHandler)

export default app
