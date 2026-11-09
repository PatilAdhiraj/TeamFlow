import 'dotenv/config'
import app from './app.js'
import { connectDatabase } from './config/db.js'

const port = Number(process.env.PORT || 4000)

if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
  throw new Error('JWT_SECRET must be set to a random string of at least 32 characters.')
}
if (!process.env.CLIENT_ORIGIN) {
  throw new Error('CLIENT_ORIGIN is required.')
}

await connectDatabase()
const server = app.listen(port, () => {
  console.log(`TeamFlow API listening on port ${port}`)
})

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => {
    server.close(async () => {
      const mongoose = await import('mongoose')
      await mongoose.default.disconnect()
      process.exit(0)
    })
  })
}
