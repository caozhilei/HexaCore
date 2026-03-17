const WebSocket = require('ws')

const url = process.env.WS_URL || 'ws://localhost:18790/ws/chat'

const ws = new WebSocket(url)

const timer = setTimeout(() => {
  console.error('❌ WS connect timeout:', url)
  process.exitCode = 1
  ws.terminate()
}, 5000)

ws.on('open', () => {
  clearTimeout(timer)
  console.log('✅ WS connected:', url)
  ws.close()
})

ws.on('error', (err) => {
  clearTimeout(timer)
  console.error('❌ WS error:', err?.message || err)
  process.exitCode = 1
})

