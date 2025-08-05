const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');

const app = express();
const server = http.createServer(app);

// CORS setup
app.use(cors({
  origin: ["https://airsoftar.vercel.app", "http://localhost:3000"],
  credentials: true
}));

// Socket.io setup
const io = socketIo(server, {
  cors: {
    origin: ["https://airsoftar.vercel.app", "http://localhost:3000"],
    credentials: true,
    methods: ["GET", "POST"]
  },
  transports: ['websocket', 'polling']
});

// Health check
app.get('/', (req, res) => {
  res.json({
    status: '🚀 Airsoft AR Battle Server',
    version: '2.0.0',
    socketio: 'enabled',
    connections: io.engine.clientsCount
  });
});

// Socket.io connection handling
io.on('connection', (socket) => {
  console.log(`🔌 Player connected: ${socket.id}`);
  console.log(`📊 Total connected clients: ${io.engine.clientsCount}`);

  // Send welcome message
  socket.emit('serverStatus', {
    message: '🌐 Connected to Real-Time PvP Server!',
    type: 'realServer',
    timestamp: Date.now()
  });

  // Handle player join
  socket.on('player_join', (data) => {
    console.log(`📥 Received player_join from ${socket.id}:`, data);
    
    // Broadcast to all clients
    io.emit('player_join', {
      type: 'player_join',
      playerId: data.playerId,
      data: {
        player: data.player,
        timestamp: Date.now()
      },
      timestamp: Date.now()
    });
    
    console.log(`📢 Broadcasted player_join to ${io.engine.clientsCount} clients`);
  });

  // Handle disconnect
  socket.on('disconnect', (reason) => {
    console.log(`🔌 Player disconnected: ${socket.id}, reason: ${reason}`);
  });
});

const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`🌐 Socket.io enabled`);
  console.log(`🔗 Health check: http://localhost:${PORT}`);
}); 