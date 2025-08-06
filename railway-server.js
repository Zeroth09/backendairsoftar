const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const rateLimit = require('express-rate-limit');

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

// Parse JSON
app.use(express.json());

// Rate limiting for API endpoints - More lenient for multiplayer
const apiLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 100, // Increased to 100 requests per minute per IP
  message: {
    success: false,
    error: 'Too many requests, please try again later'
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    // Skip rate limiting for health checks
    return req.path === '/' || req.path === '/socket-test';
  }
});

// Apply rate limiting to API routes
app.use('/api/', apiLimiter);

// Store connected players for HTTP API
const connectedPlayers = new Map();
const recentRequests = new Map(); // Track recent requests to prevent duplicates

// Cleanup old requests every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [playerId, timestamp] of recentRequests.entries()) {
    if (now - timestamp > 30000) { // 30 seconds
      recentRequests.delete(playerId);
    }
  }
}, 300000); // 5 minutes

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

// Socket.io test endpoint
app.get('/socket-test', (req, res) => {
  res.json({
    socketio: 'enabled',
    transports: SOCKETIO_TRANSPORTS,
    cors_origin: SOCKETIO_CORS_ORIGIN,
    connections: io.engine.clientsCount,
    timestamp: Date.now()
  });
});

// HTTP API endpoints as fallback
app.post('/api/player/join', (req, res) => {
  try {
    const { playerId, player } = req.body;
    
    if (!playerId) {
      return res.status(400).json({
        success: false,
        error: 'Player ID is required'
      });
    }
    
    // Check for duplicate requests (same player within 5 seconds)
    const now = Date.now();
    const lastRequest = recentRequests.get(playerId);
    if (lastRequest && (now - lastRequest) < 5000) {
      console.log(`🔄 Duplicate request from ${playerId}, ignoring`);
      return res.json({
        success: true,
        message: 'Duplicate request ignored',
        playerId: playerId,
        totalPlayers: connectedPlayers.size
      });
    }
    
    // Track this request
    recentRequests.set(playerId, now);
    
    console.log(`📥 HTTP Player join: ${playerId}`, player);
    
    // Add to connected players
    connectedPlayers.set(playerId, {
      ...player,
      timestamp: now
    });
    
    // Broadcast to all connected WebSocket clients
    io.emit('player_join', {
      type: 'player_join',
      playerId: playerId,
      data: {
        player: player,
        timestamp: now
      },
      timestamp: now
    });
    
    res.json({
      success: true,
      message: 'Player joined via HTTP API',
      playerId: playerId,
      totalPlayers: connectedPlayers.size
    });
  } catch (error) {
    console.error('❌ Error in player join API:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message
    });
  }
});

app.get('/api/players', (req, res) => {
  const players = Array.from(connectedPlayers.values());
  res.json({
    success: true,
    players: players,
    totalPlayers: players.length
  });
});

// Get current players with detailed info
app.get('/api/current-players', (req, res) => {
  const players = Array.from(connectedPlayers.values());
  res.json({
    success: true,
    type: 'current_players',
    data: {
      players: players,
      timestamp: Date.now()
    },
    totalPlayers: players.length
  });
});

app.post('/api/player/leave', (req, res) => {
  try {
    const { playerId } = req.body;
    
    if (!playerId) {
      return res.status(400).json({
        success: false,
        error: 'Player ID is required'
      });
    }
    
    console.log(`📤 HTTP Player leave: ${playerId}`);
    
    // Remove from connected players
    connectedPlayers.delete(playerId);
    
    // Broadcast to all connected WebSocket clients
    io.emit('player_leave', {
      type: 'player_leave',
      playerId: playerId,
      timestamp: Date.now()
    });
    
    res.json({
      success: true,
      message: 'Player left via HTTP API',
      playerId: playerId,
      totalPlayers: connectedPlayers.size
    });
  } catch (error) {
    console.error('❌ Error in player leave API:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message
    });
  }
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
  
  // Send current players list to new client
  const currentPlayers = Array.from(connectedPlayers.values());
  socket.emit('current_players', {
    type: 'current_players',
    data: {
      players: currentPlayers,
      timestamp: Date.now()
    },
    timestamp: Date.now()
  });
  
  console.log(`📋 Sent current players (${currentPlayers.length}) to new client`);
  
  // Handle player join
  socket.on('player_join', (data) => {
    console.log(`📥 Player join: ${socket.id}`, data);
    
    // Store player data
    if (data.playerId && data.player) {
      connectedPlayers.set(data.playerId, {
        ...data.player,
        socketId: socket.id,
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
    
    // Remove player from connected players
    for (const [playerId, player] of connectedPlayers.entries()) {
      if (player.socketId === socket.id) {
        connectedPlayers.delete(playerId);
        console.log(`🗑️ Removed player: ${playerId}`);
        
        // Broadcast player leave
        io.emit('player_leave', {
          type: 'player_leave',
          playerId: playerId,
          timestamp: Date.now()
        });
        break;
      }
    }
  });
});

// Start server
console.log('🚀 Starting Airsoft AR Battle Server...');
console.log(`🔧 Environment: ${NODE_ENV}`);
console.log(`🔧 Port: ${PORT}`);
console.log(`🔧 Process ID: ${process.pid}`);

// Use Railway's default binding
server.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ Server running on 0.0.0.0:${PORT}`);
  console.log(`🌐 Socket.io enabled`);
  console.log(`🔗 Health: http://0.0.0.0:${PORT}`);
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