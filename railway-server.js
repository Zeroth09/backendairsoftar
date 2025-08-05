const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');

const app = express();
const server = http.createServer(app);

// Get environment variables
const PORT = process.env.PORT || 3000;
const NODE_ENV = process.env.NODE_ENV || 'development';
const CORS_ORIGIN = process.env.CORS_ORIGIN || 'https://airsoftar.vercel.app';
const CORS_CREDENTIALS = process.env.CORS_CREDENTIALS === 'true';
const SOCKETIO_CORS_ORIGIN = process.env.SOCKETIO_CORS_ORIGIN || 'https://airsoftar.vercel.app';
const SOCKETIO_TRANSPORTS = process.env.SOCKETIO_TRANSPORTS ? process.env.SOCKETIO_TRANSPORTS.split(',') : ['websocket', 'polling'];
const LOG_LEVEL = process.env.LOG_LEVEL || 'info';

console.log('🔧 Environment Variables:');
console.log(`  PORT: ${PORT}`);
console.log(`  NODE_ENV: ${NODE_ENV}`);
console.log(`  CORS_ORIGIN: ${CORS_ORIGIN}`);
console.log(`  CORS_CREDENTIALS: ${CORS_CREDENTIALS}`);
console.log(`  SOCKETIO_CORS_ORIGIN: ${SOCKETIO_CORS_ORIGIN}`);
console.log(`  SOCKETIO_TRANSPORTS: ${SOCKETIO_TRANSPORTS.join(', ')}`);
console.log(`  LOG_LEVEL: ${LOG_LEVEL}`);

// CORS configuration
app.use(cors({
  origin: CORS_ORIGIN,
  credentials: CORS_CREDENTIALS,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

// Socket.io with environment-based config
const io = socketIo(server, {
  cors: {
    origin: SOCKETIO_CORS_ORIGIN,
    credentials: CORS_CREDENTIALS,
    methods: ['GET', 'POST']
  },
  transports: SOCKETIO_TRANSPORTS
});

// Health check
app.get('/', (req, res) => {
  res.json({
    status: '🚀 Airsoft AR Battle Server',
    version: '2.0.0',
    socketio: 'enabled',
    connections: io.engine.clientsCount,
    uptime: process.uptime(),
    env: NODE_ENV,
    port: PORT,
    cors_origin: CORS_ORIGIN,
    socketio_origin: SOCKETIO_CORS_ORIGIN
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
console.log('🚀 Starting Airsoft AR Battle Server...');
console.log(`🔧 Environment: ${NODE_ENV}`);
console.log(`🔧 Port: ${PORT}`);
console.log(`🔧 Process ID: ${process.pid}`);

server.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
  console.log(`🌐 Socket.io enabled`);
  console.log(`🔗 Health: http://localhost:${PORT}`);
  console.log(`🎯 Ready for connections!`);
  console.log(`🔧 CORS Origin: ${CORS_ORIGIN}`);
  console.log(`🔧 Socket.io Origin: ${SOCKETIO_CORS_ORIGIN}`);
});

// Handle process errors
process.on('uncaughtException', (err) => {
  console.error('❌ Uncaught Exception:', err);
  console.error('📊 Process will exit');
  process.exit(1);
});

process.on('unhandledRejection', (err) => {
  console.error('❌ Unhandled Rejection:', err);
});

// Handle server errors
server.on('error', (err) => {
  console.error('❌ Server error:', err);
  if (err.code === 'EADDRINUSE') {
    console.error('❌ Port already in use');
    process.exit(1);
  }
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('🔄 SIGTERM received, shutting down gracefully');
  server.close(() => {
    console.log('✅ Server closed');
    process.exit(0);
  });
}); 