# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Piceon is a full-stack web-based game application:
- **Backend**: Node.js/Express API with MariaDB/MySQL, MVC architecture
- **Frontend**: React 18 + TypeScript + Vite + Phaser 3 game engine
- **State Management**: Zustand for lightweight state handling
- **Styling**: TailwindCSS v3
- **Real-time**: Socket.io ready for multiplayer features

## Development Commands

### Backend Setup
```bash
cd backend
npm install
cp .env.example .env  # Configure database and JWT settings
npm run dev           # Start backend server (http://localhost:3000)
```

### Frontend Setup
```bash
cd frontend
npm install
cp .env.example .env.local  # Configure API endpoints
npm run dev                 # Start frontend dev server (http://localhost:5173)
```

### Running Full Stack
Open two terminals:
```bash
# Terminal 1 - Backend
cd backend && npm run dev

# Terminal 2 - Frontend
cd frontend && npm run dev
```

### Database Connection
The app auto-tests database connectivity on startup. Check console for:
- ✅ Database connected successfully
- ❌ Database connection failed

Health check endpoint: `GET /health`

## Architecture

### MVC Pattern with Base Classes

**Models** extend `BaseModel` which provides:
- CRUD operations: `findAll()`, `findById()`, `findOne()`, `create()`, `update()`, `delete()`, `count()`
- Query builder with conditions, limit, offset
- Direct query execution via `executeQuery()`

**Controllers** extend `BaseController` which provides:
- Response helpers: `success()`, `error()`, `notFound()`, `unauthorized()`, `forbidden()`, `validationError()`
- Pagination helper: `paginate()`
- Async error handling: `asyncHandler()`

### Key Components

**Database Configuration** (`config/database.js`):
- MySQL2 promise-based connection pool
- Environment-driven configuration
- Exported utilities: `pool`, `executeQuery`, `getConnection`, `testConnection`, `closePool`

**Authentication** (`middleware/auth.js`):
- JWT-based authentication
- `authenticateToken`: Required auth middleware
- `optionalAuth`: Optional auth (doesn't fail if no token)
- Token format: `Authorization: Bearer <token>`
- User info attached to `req.user`

**Routing**:
- All API routes prefixed with `/api`
- Route modules imported in `routes/index.js`
- Example: User routes at `/api/users`

**User Model** (`models/User.js`):
- Extends `BaseModel` with user-specific methods
- Auto-hashes passwords with bcrypt (10 rounds)
- `findByEmail()`, `verifyPassword()`, `getProfile()`, `getAllProfiles()` (excludes passwords)

### Environment Variables

Required in `.env`:
- `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME` - Database connection
- `JWT_SECRET` - JWT signing key (change in production!)
- `JWT_EXPIRE` - Token expiration (e.g., "7d")
- `PORT` - Server port (default: 3000)
- `NODE_ENV` - Environment mode (development/production)

### Adding New Features

**New Model**:
1. Extend `BaseModel` in `models/`
2. Pass table name to `super(tableName)`
3. Add domain-specific methods
4. Export singleton instance: `module.exports = new YourModel()`

**New Controller**:
1. Extend `BaseController` in `controllers/`
2. Use response helpers for consistency
3. Wrap async methods with `asyncHandler()` or use try-catch

**New Routes**:
1. Create route file in `routes/`
2. Import and mount in `routes/index.js`
3. Apply middleware as needed (auth, validation)

### Security Features

- Helmet.js for HTTP headers
- CORS enabled
- JWT authentication
- bcrypt password hashing
- express-validator for input validation
- Static file serving from `/uploads` and `/public`

---

## Frontend Architecture

### Tech Stack
- **React 18** + **TypeScript** - Type-safe UI development
- **Vite** - Fast build tool with HMR
- **Phaser 3** - HTML5 game engine for canvas-based games
- **Zustand** - Lightweight state management
- **React Router v6** - Client-side routing
- **TailwindCSS v3** - Utility-first CSS framework
- **Axios** - HTTP client with JWT interceptors
- **Socket.io Client** - Real-time communication

### Project Structure
```
frontend/
├── src/
│   ├── components/
│   │   ├── game/          # Phaser game wrapper (PhaserGame.tsx)
│   │   ├── ui/            # Reusable components (Button, Input, Card, Modal, Loading)
│   │   └── layout/        # Layout components (Navbar, Footer)
│   ├── scenes/            # Phaser scenes (BootScene, MenuScene, GameScene)
│   ├── services/          # API client (api.ts), Auth (auth.ts), Socket (socket.ts)
│   ├── stores/            # Zustand stores (useAuthStore, useGameStore, usePlayerStore)
│   ├── types/             # TypeScript interfaces
│   ├── hooks/             # Custom hooks (useAuth, useGame)
│   ├── utils/             # Helper functions
│   ├── pages/             # Route pages (Home, Login, Game, Lobby, Profile)
│   └── game/              # Phaser configuration
└── public/assets/         # Game assets (images, audio)
```

### State Management

**useAuthStore** - User authentication
- JWT token management in localStorage
- Login/Register/Logout actions
- User profile state

**useGameStore** - Game state
- Game states: idle, playing, paused, gameover
- Score, level, lives tracking
- Game control methods

**usePlayerStore** - Player statistics
- High scores, games played, total score
- Achievements tracking
- Persistent storage with localStorage

### API Integration

Frontend connects to backend via Axios with:
- Base URL: `http://localhost:3000/api`
- Auto-injected JWT tokens via interceptors
- Auto-redirect to /login on 401 errors
- Vite proxy forwards `/api` to backend in development

### Routes

- `/` - Home/Landing page
- `/login` - Login/Register (with query param `?register=true`)
- `/game` - Main game page (protected, requires auth)
- `/lobby` - Game lobby (protected)
- `/profile` - User profile and stats (protected)

### Phaser Game Engine

**Scenes**:
- `BootScene` - Asset loading with progress bar
- `MenuScene` - Main menu with start button
- `GameScene` - Main gameplay with keyboard controls

**Configuration** (`game/config.ts`):
- Canvas size: 800x600
- Physics: Arcade physics with no gravity
- Scale mode: FIT with auto-center
- Scenes loaded in order: Boot → Menu → Game

### Development Notes

- Path alias `@/` maps to `src/` directory
- TailwindCSS v3 with custom primary color palette
- All components use TypeScript for type safety
- Game assets should be placed in `public/assets/`
- Use custom hooks (`useAuth`, `useGame`) for cleaner component code
