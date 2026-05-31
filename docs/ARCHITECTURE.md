# Architecture overview: multiplayer Snake (Vue client + Socket.IO server)

This document describes how the project is structured and, in particular, **how the
realtime networking works**, so future contributors have a map.

## High-level shape

The repo is two independent npm projects:

| Project | Role | Stack |
|---|---|---|
| `frontend/` | Game client + rendering + UI | Vue 3, TypeScript, Babylon.js, `socket.io-client` |
| `backend/` | Authoritative game server | Node, TypeScript, `socket.io` |

The design is **server-authoritative**: the server owns all game state and runs the
simulation loop. Clients send *only* direction inputs and render the snapshots the
server broadcasts. This guarantees both players see consistent collisions, a fair
shared timer, and makes cheating hard (a client can't fake its score or position).

```
frontend/ (Vue)                         backend/ (Node + Socket.IO)
 ├─ App.vue ── mode menu                 ├─ index.ts ── Socket.IO server + event wiring
 ├─ MultiplayerView.vue ── lobby/HUD     ├─ rooms.ts ── room registry + per-room lifecycle
 ├─ useMultiplayerGame.ts                │              (codes, countdown, tick loop, timer)
 │     • sends direction inputs  ──ws──▶ ├─ game.ts  ── authoritative tick: movement,
 │     • renders server snapshots ◀──ws─ │              collisions, food, scoring
 └─ renderer.ts ── draws both snakes     └─ types.ts ── shared wire event/payload types
```

## Backend modules

- **`src/game.ts`** — pure game logic. `tick()` advances both snakes *simultaneously*:
  it computes each snake's next head, then resolves deaths against the **pre-move**
  board (wall / self / opponent body / head-to-head collision), then applies moves and
  food. Food respawns avoiding both snakes.
- **`src/rooms.ts`** — a `Room` class (one per match) and a `RoomManager` (the
  registry). The `Room` owns its `setInterval` tick loop (`TICK_MS = 110`), the
  3-second countdown, the 5-minute match timer (`MATCH_MS`), and resolves
  win/lose/draw. `RoomManager` generates collision-free room codes and maps sockets to
  rooms.
- **`src/index.ts`** — wires Socket.IO connection events to the room manager.
- **`src/constants.ts` / `src/types.ts`** — tunables and shared wire types.

## How the sockets work

**Connection:** the client lazily opens a Socket.IO connection to `VITE_SERVER_URL`
(default `http://localhost:3001`) the first time the user creates or joins a room —
see `useMultiplayerGame.ts`.

**Event protocol** (defined in `backend/src/types.ts`):

*Client → Server*
- `createRoom` — make a new room, become player 0
- `joinRoom { code }` — join an existing room as player 1
- `setDirection { dx, dy }` — queue a turn (the *only* gameplay input sent)
- `leaveRoom` — voluntarily exit

*Server → Client*
- `roomCreated { code, playerIndex }`
- `joinResult { ok, code?, playerIndex?, error? }`
- `opponentJoined`
- `countdown { secondsLeft }`
- `state { status, snakes, scores, alive, food, timeLeftMs }` — **broadcast every
  tick** (the snapshot the client renders)
- `gameOver { result, reason, scores }` — `result` is `'win' | 'lose' | 'draw'`,
  personalized per player
- `opponentLeft`

**Rooms = Socket.IO rooms.** When a player creates/joins, the server calls
`socket.join(code)`. Per-tick snapshots are sent with `io.to(code).emit('state', ...)`,
so both players in a room get the same broadcast. The socket also stores its room code
in `socket.data.roomCode` — this matters because on `disconnect` the socket has
*already left* its Socket.IO rooms, so `socket.rooms` is empty; `socket.data` is the
reliable way to find which room a disconnecting player belonged to (and award the
opponent a forfeit win).

**Lifecycle / message flow:**

```
Player A                 Server                          Player B
  │  createRoom ───────────▶                                │
  │  ◀──────── roomCreated{code, idx:0}                      │
  │                         │   (room status: waiting)       │
  │                         ◀─────────────── joinRoom{code}  │
  │                         ──── joinResult{ok, idx:1} ─────▶ │
  │  ◀── opponentJoined ──── │ ──── opponentJoined ────────▶ │
  │                         │  room.begin() → status:countdown
  │  ◀── countdown{3..2..1} │ ──── countdown{3..2..1} ─────▶ │
  │                         │  status:playing, start tick loop
  │  ◀═══ state (every 110ms) ═══════════════════════════▶  │   ← render loop
  │  setDirection{dx,dy} ──▶│                                │
  │                         │◀── setDirection{dx,dy} ───────│
  │                         │  tick(): move, collide, score
  │  ◀──── gameOver{win} ───│──── gameOver{lose} ─────────▶  │   (on crash / timeout)
```

**Why the client never simulates:** there is no local tick loop on the client. The
Babylon render loop in `renderer.ts` runs continuously, but game state only changes
when a `state` snapshot arrives. `useMultiplayerGame.ts` maps each snapshot into two
`SnakeView`s (self = green, opponent = blue) and a food cell, then calls
`renderer.syncSnakes()` / `renderer.syncFood()`.

## End conditions

- **Crash** (wall / self / opponent / head-to-head) → game over immediately; the
  survivor wins. Both crashing on the same tick → **draw**.
- **Timer** reaches 0 → higher score wins; equal scores → **draw**.
- **Disconnect** mid-match → remaining player wins by forfeit (`opponentLeft` +
  `gameOver`).

## Known constraints (intentional, worth noting)

- Room state is **in-memory**, so the backend must run as a **single instance** (no
  horizontal scaling without a Socket.IO Redis adapter + sticky sessions).
- `GRID` and `TICK_MS` are duplicated in `frontend/src/game/constants.ts` and
  `backend/src/constants.ts` and must be kept in sync.
