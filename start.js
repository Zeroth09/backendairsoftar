#!/usr/bin/env node

const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');

const app = express();
const server = http.createServer(app);

// CORS configuration for frontend
app.use(cors({
  origin: ['https://airsoftar.vercel.app', 'http://localhost:3000'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

// Socket.io with proper CORS for frontend
const io = socketIo(server, {
  cors: {
    origin: ['https://airsoftar.vercel.app', 'http://localhost:3000'],
    credentials: true,
    methods: ['GET', 'POST']
  },
  transports: ['polling', 'websocket'],
  allowEIO3: true
});

// Health check
app.get('/', (req, res) => {
  res.json({
    status: '🚀 Airsoft AR Battle Server',
    version: '2.0.0',
    socketio: 'enabled',
    connections: io.engine.clientsCount,
    uptime: process.uptime(),
    env: process.env.NODE_ENV || 'development',
    port: process.env.PORT || 3000,
    cors_origin: 'https://airsoftar.vercel.app',
    socketio_origin: 'https://airsoftar.vercel.app'
  });
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
  
  // Handle player join
  socket.on('player_join', (data) => {
    console.log(`📥 Player join: ${socket.id}`, data);
    
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
  console.log(`🔗 Health: http://0.0.0.0:${PORT}`);
  console.log(`🎯 Ready for connections!`);
  console.log(`🔧 CORS Origin: https://airsoftar.vercel.app`);
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