const WebSocket = require('ws')

const url = process.env.WS_URL || 'ws://localhost:18790/ws/chat'
const agentId = process.env.AGENT_ID || '54951470-1212-4a89-bebd-cbf44b03a4e0'
const text = process.env.TEXT || 'Hello from verify-ws-chat'

const ws = new WebSocket(url)

let sent = false
const timer = setTimeout(() => {
  console.error('❌ Timeout waiting for response')
  process.exitCode = 1
  ws.terminate()
}, 15000)

ws.on('open', () => {
  // wait for welcome then send
})

ws.on('message', (buf) => {
  const raw = buf.toString()
  let payload
  try {
    payload = JSON.parse(raw)
  } catch {
    console.log('Non-JSON message:', raw)
    return
  }

  if (!sent) {
    sent = true
    ws.send(
      JSON.stringify({
        message: text,
        metadata: { common: { agentId } },
        userAgent: 'verify-ws-chat',
        ipAddress: '127.0.0.1',
      })
    )
    return
  }

  if (payload?.type === 'message' && payload?.data?.content) {
    clearTimeout(timer)
    console.log('✅ Received assistant message:', payload.data.content)
    ws.close()
  } else {
    console.log('Received:', payload)
  }
})

ws.on('error', (err) => {
  clearTimeout(timer)
  console.error('❌ WS error:', err?.message || err)
  process.exitCode = 1
})

