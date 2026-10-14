# Skoodle

**Skoodle** is a real-time multiplayer drawing-and-guessing web game. Create a private room, invite friends with a room link, take turns drawing, and race to guess the word before time runs out.

Built with **React, TypeScript, Vite, Node.js, Express, and Socket.IO**.

## Features

- **Private rooms:** Create a room and invite friends using a room code or shareable link.
- **Quick Play:** Join through the quick-play flow.
- **Configurable games:** The host can choose 2–10 rounds, a 30/60/80/120-second drawing timer, and default or custom words.
- **Turn-based gameplay:** The drawer chooses from three word options; other players guess through chat.
- **Real-time drawing:** Canvas updates are shared with players in the same room.
- **Progressive hints:** Letters are revealed at approximately 25%, 50%, and 75% of the drawing time, regardless of the selected duration.
- **Time-based scoring:** Faster correct guesses earn more points (20–100, rounded to increments of five).
- **Guess feedback:** Correct guesses earn points without revealing the answer in chat; near misses receive private feedback.
- **Reconnect and sync:** Returning players can recover the current round state, drawing, and hints through the session-reconnect flow.
- **Game results:** Players can see the winner and final scores at the end of a game.

## Tech Stack

| Layer | Technologies |
| --- | --- |
| Frontend | React, TypeScript, Vite, CSS |
| Backend | Node.js, Express |
| Real-time communication | Socket.IO |
| Game state | Server-side game engine and room management |
| Drawing | HTML Canvas and synchronized drawing events |

## How It Works

```mermaid
flowchart TD
    A[Player opens Skoodle] --> B{Choose mode}
    B --> C[Quick Play]
    B --> D[Create private room]
    B --> E[Join with code or link]
    D --> F[Configure rounds, timer, words]
    C --> G[Game lobby]
    F --> G
    E --> G
    G --> H[Start game]
    H --> I[Drawer chooses one of three words]
    I --> J[Drawing phase]
    J --> K[Draw strokes and submit guesses via Socket.IO]
    K --> L[Server validates guesses, awards points, reveals hints]
    L --> M{More turns or rounds?}
    M -->|Yes| I
    M -->|No| N[Final scores and winner]
```

The **server is authoritative** for room membership, word selection, game phases, round deadlines, hints, and scoring. Socket.IO delivers gameplay events to connected clients, while the frontend renders the canvas, chat, scoreboard, and countdown.

### Progressive hint timing

Hints are based on **percentage of the turn elapsed**, not fixed seconds. For example:

| Turn elapsed | Hint behavior |
| --- | --- |
| 0% | All letters hidden |
| 25% | Reveal one letter |
| 50% | Reveal a second letter |
| 75% | Reveal a third letter |

The game never reveals the entire word through hints before the turn ends. Short words reveal fewer letters.

## Repository

**GitHub:** [IknowDeadPool/Skoodle](https://github.com/IknowDeadPool/Skoodle)

## Getting Started

### Prerequisites

- Node.js and npm
- Two browser tabs or devices to test multiplayer gameplay

### 1. Clone the repository

```bash
git clone https://github.com/IknowDeadPool/Skoodle.git
cd Skoodle
```

### 2. Enable one-command development

To run both services together, create or update the **root-level `package.json`** (next to the `frontend/` and `backend/` folders). This assumes each workspace defines an `npm run dev` script:

```json
{
  "name": "skoodle",
  "private": true,
  "workspaces": ["frontend", "backend"],
  "scripts": {
    "dev": "concurrently -k -n BACKEND,FRONTEND \"npm run dev -w backend\" \"npm run dev -w frontend\"",
    "build": "npm run build -w frontend"
  },
  "devDependencies": {
    "concurrently": "^9.2.1"
  }
}
```

> **Note:** Commit this root `package.json` along with the README. The one-command workflow only works after the root scripts are present and both workspace folders match the names above. If the backend does not yet have a `dev` script, add one appropriate to its entry point.

### 3. Install dependencies (first time only)

From the repository root:

```bash
npm install
```

npm workspaces installs the frontend, backend, and root development dependencies together.

### 4. Configure the connection

Ensure the frontend Socket.IO client points to your local backend server. If your project uses environment variables, create the required local `.env` files before starting the app. Do not commit secrets or `.env` files.

### 5. Start both services

```bash
npm run dev
```

This runs the backend and frontend `dev` scripts in the same terminal. Open the local URL printed by Vite. Press **Ctrl+C** to stop both services.

For multiplayer testing, open two browser tabs or devices. Invite links to `localhost` are only usable on the local machine; public invites require deployment.

## Playing a Game

1. Enter a player name.
2. Create a private room, use Quick Play, or join a friend's room.
3. For private rooms, choose the number of rounds, drawing duration, and word list.
4. Share the room code or invitation link with friends.
5. Start the game. The current drawer selects a word and begins drawing.
6. Other players submit guesses. Correct guesses score points; hints appear as time passes.
7. Continue through the configured rounds and view the final results.

> Invitation links work across devices after the frontend and backend are deployed and the frontend host is configured to serve the app for `/room/:code` URLs.

## Real-Time Events

Some of the Socket.IO events used by Skoodle include:

| Event | Purpose |
| --- | --- |
| `room:create` | Create a private room with settings |
| `room:join` | Join an existing room |
| `room:quickPlay` | Enter quick play |
| `room:reconnect` | Restore a player session |
| `game:start` | Start a private game |
| `game:wordChoices` | Send word options to the drawer |
| `game:selectWord` | Submit the drawer's selected word |
| `game:drawingStarted` | Announce the drawing phase and deadline |
| `game:hintUpdated` | Broadcast a newly revealed hint |
| `chat:message` | Send chat messages and guesses |
| `game:correctGuess` | Announce a successful guess and points |
| `game:sync` | Retrieve the current game snapshot |
| `game:turnEnded` | Reveal the previous word |
| `game:finished` | Announce the winner and final scores |

## Project Structure

The codebase is organized around these components (exact paths may vary):

```text
frontend/
  src/
    pages/
      HomePage.tsx
      LobbyPage.tsx
      GamePage.tsx
    hooks/
      useGameState.ts
    services/
      socket.ts
      playerSession.ts
    ...
backend/
  ...
  GameEngine.js
  WordManager.js
  DrawingManager.js
  RoomService.js
  ...
```

## Security and Reliability

The backend validates room settings and controls secret-word selection and scoring. The selected word is sent only to the drawer during the drawing phase, while guessers receive a masked word and progressive hints.

**In progress:** Additional abuse protection for chat and drawing traffic, including per-player rate limits, payload-size limits, and stroke validation. These controls should be enforced server-side before broadcasting events.

For larger deployments, consider shared session/game-state storage, distributed rate limiting, and scaling Socket.IO across multiple server instances.

## Roadmap

- [x] Private rooms and invite links
- [x] Host-configurable rounds, drawing duration, and word lists
- [x] Real-time drawing and guessing
- [x] Server-authoritative turn timing and scoring
- [x] Progressive letter hints
- [x] Reconnect and game-state synchronization
- [ ] Chat and stroke rate limiting with payload validation
- [ ] End-of-game drawing replay
- [ ] Production deployment and monitoring


