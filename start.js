#!/usr/bin/env node

const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');

const app = express();
const server = http.createServer(app);

// Store connected players
const connectedPlayers = new Map();
const sseClients = new Set();

// CORS configuration for frontend
app.use(cors({
  origin: ['https://airsoftar.vercel.app', 'http://localhost:3000'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

// Parse JSON
app.use(express.json());

// Health check
app.get('/', (req, res) => {
  res.json({
    status: '🚀 Airsoft AR Battle Server',
    version: '2.0.0',
    socketio: 'enabled',
    sse: 'enabled',
    connections: io.engine.clientsCount,
    sse_clients: sseClients.size,
    players: connectedPlayers.size,
    uptime: process.uptime(),
    env: process.env.NODE_ENV || 'development',
    port: process.env.PORT || 3000,
    cors_origin: 'https://airsoftar.vercel.app',
    socketio_origin: 'https://airsoftar.vercel.app'
  });
});

// Server-Sent Events endpoint
app.get('/api/events', (req, res) => {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'Access-Control-Allow-Origin': 'https://airsoftar.vercel.app',
    'Access-Control-Allow-Credentials': 'true'
  });

  // Send initial connection message
  res.write(`data: ${JSON.stringify({
    type: 'connected',
    message: 'SSE connection established',
    timestamp: Date.now()
  })}\n\n`);

  // Add client to SSE clients
  sseClients.add(res);

  // Send current players
  const players = Array.from(connectedPlayers.values());
  res.write(`data: ${JSON.stringify({
    type: 'current_players',
    players: players,
    totalPlayers: players.length,
    timestamp: Date.now()
  })}\n\n`);

  // Handle client disconnect
  req.on('close', () => {
    sseClients.delete(res);
    console.log('🔌 SSE client disconnected');
  });
});

// HTTP API endpoints as fallback
app.post('/api/player/join', (req, res) => {
  const { playerId, player } = req.body;
  
  console.log(`📥 HTTP Player join: ${playerId}`, player);
  
  // Add to connected players
  connectedPlayers.set(playerId, {
    ...player,
    timestamp: Date.now()
  });
  
  // Broadcast to all connected WebSocket clients
  io.emit('player_join', {
    type: 'player_join',
    playerId: playerId,
    data: {
      player: player,
      timestamp: Date.now()
    },
    timestamp: Date.now()
  });

  // Broadcast to all SSE clients
  const eventData = {
    type: 'player_join',
    playerId: playerId,
    data: {
      player: player,
      timestamp: Date.now()
    },
    timestamp: Date.now()
  };

  sseClients.forEach(client => {
    client.write(`data: ${JSON.stringify(eventData)}\n\n`);
  });
  
  res.json({
    success: true,
    message: 'Player joined via HTTP API',
    playerId: playerId,
    totalPlayers: connectedPlayers.size
  });
});

app.get('/api/players', (req, res) => {
  const players = Array.from(connectedPlayers.values());
  res.json({
    success: true,
    players: players,
    totalPlayers: players.length
  });
});

app.post('/api/player/leave', (req, res) => {
  const { playerId } = req.body;
  
  console.log(`📤 HTTP Player leave: ${playerId}`);
  
  // Remove from connected players
  connectedPlayers.delete(playerId);
  
  // Broadcast to all connected WebSocket clients
  io.emit('player_leave', {
    type: 'player_leave',
    playerId: playerId,
    timestamp: Date.now()
  });

  // Broadcast to all SSE clients
  const eventData = {
    type: 'player_leave',
    playerId: playerId,
    timestamp: Date.now()
  };

  sseClients.forEach(client => {
    client.write(`data: ${JSON.stringify(eventData)}\n\n`);
  });
  
  res.json({
    success: true,
    message: 'Player left via HTTP API',
    playerId: playerId,
    totalPlayers: connectedPlayers.size
  });
});

// Socket.io with proper CORS for frontend
const io = socketIo(server, {
  cors: {
    origin: ['https://airsoftar.vercel.app', 'http://localhost:3000'],
    credentials: true,
    methods: ['GET', 'POST']
  },
  transports: ['polling', 'websocket'],
  allowEIO3: true,
  pingTimeout: 60000,
  pingInterval: 25000
});

// Socket connection
io.on('connection', (socket) => {
  console.log(`🔌 Player connected: ${socket.id}`);
  
  // Send welcome
  socket.emit('serverStatus', {
    message: 'Connected to Real-Time PvP Server!',
    type: 'realServer',
    timestamp: Date.now()
  });
  
  // Send current players list
  const players = Array.from(connectedPlayers.values());
  socket.emit('current_players', {
    type: 'current_players',
    players: players,
    totalPlayers: players.length,
    timestamp: Date.now()
  });
  
  // Handle player join
  socket.on('player_join', (data) => {
    console.log(`📥 Player join: ${socket.id}`, data);
    
    // Add to connected players
    if (data.playerId && data.player) {
      connectedPlayers.set(data.playerId, {
        ...data.player,
        timestamp: Date.now()
      });
    }
    
    // Broadcast to all
    io.emit('player_join', {
      type: 'player_join',
      playerId: data.playerId,
      data: {
        player: data.player,
        timestamp: Date.now()
      },
      timestamp: Date.now()
    });
    
    console.log(`📢 Broadcasted to ${io.engine.clientsCount} clients`);
  });
  
  // Handle disconnect
  socket.on('disconnect', () => {
    console.log(`🔌 Player disconnected: ${socket.id}`);
  });
});

// Start server
const PORT = process.env.PORT || 3000;

console.log('🚀 Starting Airsoft AR Battle Server...');
console.log(`🔧 Environment: ${process.env.NODE_ENV || 'development'}`);
console.log(`🔧 Port: ${PORT}`);
console.log(`🔧 CORS Origin: https://airsoftar.vercel.app`);

server.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ Server running on 0.0.0.0:${PORT}`);
  console.log(`🌐 Socket.io enabled`);
  console.log(`📡 Server-Sent Events enabled`);
  console.log(`🔗 Health: http://0.0.0.0:${PORT}`);
  console.log(`🎯 Ready for connections!`);
  console.log(`🔧 CORS Origin: https://airsoftar.vercel.app`);
  console.log(`📡 HTTP API endpoints available`);
});

// Error handling
process.on('uncaughtException', (err) => {
  console.error('❌ Uncaught Exception:', err);
  process.exit(1);
});

process.on('unhandledRejection', (err) => {
  console.error('❌ Unhandled Rejection:', err);
});

server.on('error', (err) => {
  console.error('❌ Server error:', err);
  if (err.code === 'EADDRINUSE') {
    console.error('❌ Port already in use');
    process.exit(1);
  }
});

process.on('SIGTERM', () => {
  console.log('🔄 SIGTERM received, shutting down gracefully');
  server.close(() => {
    console.log('✅ Server closed');
    process.exit(0);
  });
}); 