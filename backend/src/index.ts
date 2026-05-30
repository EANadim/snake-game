import { createServer } from 'node:http'
import { Server } from 'socket.io'
import { RoomManager } from './rooms.js'
import type {
  ClientToServerEvents,
  ServerToClientEvents,
  SocketData,
} from './types.js'

const PORT = Number(process.env.PORT ?? 3001)
// Comma-separated allowed origins, or "*" in dev.
const CORS_ORIGIN = process.env.CORS_ORIGIN ?? '*'

const httpServer = createServer((_req, res) => {
  res.writeHead(200, { 'content-type': 'text/plain' })
  res.end('snake-game multiplayer server\n')
})

const io = new Server<
  ClientToServerEvents,
  ServerToClientEvents,
  Record<string, never>,
  SocketData
>(httpServer, {
  cors: {
    origin: CORS_ORIGIN === '*' ? true : CORS_ORIGIN.split(','),
    methods: ['GET', 'POST'],
  },
})

const manager = new RoomManager(io)

io.on('connection', (socket) => {
  socket.on('createRoom', () => {
    const { code, playerIndex } = manager.create(socket)
    socket.emit('roomCreated', { code, playerIndex })
  })

  socket.on('joinRoom', ({ code }) => {
    const normalized = String(code ?? '').trim().toUpperCase()
    const result = manager.join(socket, normalized)
    if (!result.ok) {
      socket.emit('joinResult', { ok: false, error: result.error })
      return
    }
    socket.emit('joinResult', {
      ok: true,
      code: result.code,
      playerIndex: result.playerIndex,
    })
    const room = manager.get(result.code)
    if (room) {
      // Tell the room (i.e. the creator) someone joined, then start.
      io.to(room.code).emit('opponentJoined')
      room.begin()
    }
  })

  socket.on('setDirection', ({ dx, dy }) => {
    const room = manager.roomOf(socket)
    room?.setDirection(socket.id, dx, dy)
  })

  socket.on('leaveRoom', () => {
    const room = manager.roomOf(socket)
    room?.removePlayer(socket.id)
  })

  socket.on('disconnect', () => {
    const room = manager.roomOf(socket)
    room?.removePlayer(socket.id)
  })
})

httpServer.listen(PORT, () => {
  console.log(`[snake] multiplayer server listening on :${PORT}`)
})
