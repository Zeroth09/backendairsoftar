#!/usr/bin/env node

const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');

const app = express();
const server = http.createServer(app);

// Basic CORS for Railway
app.use(cors({
  origin: true,
  credentials: true
}));

// Socket.io setup
const io = socketIo(server, {
  cors: {
    origin: true,
    credentials: true
  },
  transports: ['polling', 'websocket']
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
    port: process.env.PORT || 3000
  });
});

// Socket connection
io.on('connection', (socket) => {
  console.log(`🔌 Player connected: ${socket.id}`);
  
  socket.emit('serverStatus', {
    message: 'Connected to Real-Time PvP Server!',
    type: 'realServer',
    timestamp: Date.now()
  });
  
  socket.on('player_join', (data) => {
    console.log(`📥 Player join: ${socket.id}`, data);
    
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
  
  socket.on('disconnect', () => {
    console.log(`🔌 Player disconnected: ${socket.id}`);
  });
});

// Start server
const PORT = process.env.PORT || 3000;

console.log('🚀 Starting Airsoft AR Battle Server...');
console.log(`🔧 Environment: ${process.env.NODE_ENV || 'development'}`);
console.log(`🔧 Port: ${PORT}`);

server.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ Server running on 0.0.0.0:${PORT}`);
  console.log(`🌐 Socket.io enabled`);
  console.log(`🔗 Health: http://0.0.0.0:${PORT}`);
  console.log(`🎯 Ready for connections!`);
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