# Snake Game

A Vue 3 + TypeScript + Babylon.js Snake game with two modes:

- **Single Player** — the classic local game (runs entirely in the browser).
- **Multiplayer** — two players in a room play a 5-minute competitive match. Most
  food eaten wins; hitting a wall, the opponent, or yourself is an instant loss.
  Multiplayer is **server-authoritative**: a Node + Socket.IO backend runs the game
  loop and clients only send direction inputs.

## Layout

- `frontend/` — Vue app (single-player logic + multiplayer client).
- `backend/` — Node + Socket.IO authoritative game server (rooms, ticks, rules).

## Running locally

Run the backend and frontend in two terminals.

```bash
# Terminal 1 — game server (listens on :3001)
cd backend
npm install
npm run dev

# Terminal 2 — web app (Vite dev server, usually :5173)
cd frontend
npm install
npm run dev
```

Open the app, choose **Multiplayer**, then **Create room** to get a code. Open a
second browser window, choose **Multiplayer → Join**, and enter the code. The match
starts automatically after a short countdown.

### Configuration

- Frontend: set `VITE_SERVER_URL` to point at a non-default backend
  (default `http://localhost:3001`).
- Backend: `PORT` (default `3001`) and `CORS_ORIGIN` (comma-separated allowed
  origins, or `*` in dev).

> Note: `backend/src/constants.ts` mirrors `GRID` and `TICK_MS` from
> `frontend/src/game/constants.ts`. Keep these values in sync.
