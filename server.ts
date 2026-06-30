import express from 'express'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const app = express()
const dist = path.join(__dirname, 'dist')

// health check — used by Render and as the seam for the real backend's API routes
app.get('/healthz', (_req, res) =>
  res.json({ ok: true, service: 'resolver-site', ts: new Date().toISOString() }))

app.use(express.static(dist, { maxAge: '1h', index: false }))
app.get('*', (_req, res) => res.sendFile(path.join(dist, 'index.html')))

const port = Number(process.env.PORT) || 8080
app.listen(port, () => console.log(`resolver-site listening on :${port}`))
