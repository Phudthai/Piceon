import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import http from 'http';
import { Server } from 'socket.io';
import apiRouter from './api';
import { setupSocketHandlers } from './socket';
import { GameLoop } from './game/loop/GameLoop';

const PORT = parseInt(process.env.PORT || '3001', 10);
const SOCKET_PORT = parseInt(process.env.SOCKET_PORT || '3002', 10);
const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:3000';
// Extra allowed origins for tunneling tools (e.g. ngrok) during dev testing on other devices
const EXTRA_CLIENT_ORIGINS = (process.env.EXTRA_CLIENT_ORIGINS || 'https://1fc8-171-100-30-222.ngrok-free.app')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean);
const ALLOWED_ORIGINS = [CLIENT_URL, ...EXTRA_CLIENT_ORIGINS];

// ─── Express API Server ─────────────────────────────

const app = express();

app.use(cors({ origin: ALLOWED_ORIGINS, credentials: true }));
app.use(helmet());
app.use(express.json());
app.use(cookieParser());

app.use('/api', apiRouter);

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

const apiServer = http.createServer(app);

apiServer.listen(PORT, () => {
  console.log(`[API] Server running on port ${PORT}`);
});

// ─── Socket.io Game Server ──────────────────────────

const socketServer = http.createServer();

const io = new Server(socketServer, {
  cors: {
    origin: ALLOWED_ORIGINS,
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

setupSocketHandlers(io);

// ─── Game Loop ──────────────────────────────────────

const gameLoop = new GameLoop(io);

socketServer.listen(SOCKET_PORT, () => {
  console.log(`[Socket] Game server running on port ${SOCKET_PORT}`);
  gameLoop.start();
});
