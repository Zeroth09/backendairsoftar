// 🔌 WebSocket Connections untuk Airsoft AR Battle
// Real-time multiplayer dengan GPS tracking, shooting, dan human detection

const socketIo = require('socket.io');
const database = require('../config/database');
const antiCheat = require('../middleware/antiCheat');

class GameSocketManager {
  constructor(server) {
    this.io = socketIo(server, {
      cors: {
        origin: "*",
        methods: ["GET", "POST"],
        credentials: false
      },
      transports: ['websocket', 'polling']
    });

    this.activeConnections = new Map();
    this.rooms = new Map();
    this.setupEventHandlers();
  }

  setupEventHandlers() {
    this.io.on('connection', (socket) => {
      console.log(`🔌 Player connected: ${socket.id}`);
      console.log(`📊 Total connected clients: ${this.io.sockets.sockets.size}`);

      // Send welcome message
      socket.emit('serverStatus', {
        message: '🌐 Connected to Real-Time PvP Server!',
        type: 'realServer',
        timestamp: Date.now()
      });
      
      console.log(`📤 Sent welcome message to ${socket.id}`);

      // Lobby events (from frontend)
      socket.on('player_join', (messageData) => {
        console.log(`📥 Received player_join event from ${socket.id}:`, JSON.stringify(messageData, null, 2));
        this.handleLobbyPlayerJoin(socket, messageData);
      });

      socket.on('player_leave', (messageData) => {
        this.handleLobbyPlayerLeave(socket, messageData);
      });

      socket.on('game_state', (messageData) => {
        this.handleLobbyGameState(socket, messageData);
      });

      // Player join game
      socket.on('joinGame', (playerData) => {
        this.handlePlayerJoin(socket, playerData);
      });

      // GPS tracking events
      socket.on('gpsUpdate', (gpsData) => {
        this.handleGPSUpdate(socket, gpsData);
      });

      // Shooting events
      socket.on('fireWeapon', (shootingData) => {
        this.handleWeaponFire(socket, shootingData);
      });

      socket.on('reloadWeapon', (reloadData) => {
        this.handleWeaponReload(socket, reloadData);
      });

      socket.on('switchWeapon', (weaponData) => {
        this.handleWeaponSwitch(socket, weaponData);
      });

      // Human detection events
      socket.on('humanDetection', (detectionData) => {
        this.handleHumanDetection(socket, detectionData);
      });

      // Player movement
      socket.on('playerMove', (movementData) => {
        this.handlePlayerMovement(socket, movementData);
      });

      // Chat messages
      socket.on('chatMessage', (messageData) => {
        this.handleChatMessage(socket, messageData);
      });

      // Team events
      socket.on('joinTeam', (teamData) => {
        this.handleTeamJoin(socket, teamData);
      });

      // Disconnect handling
      socket.on('disconnect', () => {
        this.handlePlayerDisconnect(socket);
      });

      // Error handling
      socket.on('error', (error) => {
        console.error(`❌ Socket error for ${socket.id}:`, error);
      });
    });
  }

  // Player join game
  handlePlayerJoin(socket, playerData) {
    try {
      const player = {
        id: socket.id,
        name: playerData.name || `Player_${Math.random().toString(36).substr(2, 5)}`,
        team: playerData.team || 'red',
        hp: playerData.hp || 100,
        maxHP: playerData.maxHP || 100,
        kills: 0,
        deaths: 0,
        isAlive: true,
        position: null,
        weapon: playerData.weapon || 'rifle',
        lastActivity: Date.now()
      };

      // Save player to database
      database.savePlayer(socket.id, player);
      this.activeConnections.set(socket.id, player);

      // Join room
      const roomName = `team_${player.team}`;
      socket.join(roomName);
      
      if (!this.rooms.has(roomName)) {
        this.rooms.set(roomName, []);
      }
      this.rooms.get(roomName).push(socket.id);

      // Notify other players
      socket.to(roomName).emit('playerJoined', {
        player: {
          id: player.id,
          name: player.name,
          team: player.team,
          position: player.position
        }
      });

      // Send confirmation to player
      socket.emit('joinConfirmed', {
        player: player,
        room: roomName,
        message: `Selamat datang di tim ${player.team}!`
      });

      // Broadcast updated player count
      this.broadcastPlayerCount();

      console.log(`👥 Player ${player.name} joined team ${player.team}`);

    } catch (error) {
      console.error('❌ Player join error:', error);
      socket.emit('error', { message: 'Error joining game' });
    }
  }

  // Lobby player join
  handleLobbyPlayerJoin(socket, messageData) {
    try {
      const player = messageData.data.player;
      const playerId = messageData.playerId;
      
      console.log(`🎮 Lobby: Player ${player.nama} joined team ${player.tim}`);

      // Store player in lobby
      this.activeConnections.set(playerId, {
        ...player,
        socketId: socket.id,
        isInLobby: true
      });

      // Send current player list to the new player
      const currentPlayers = Array.from(this.activeConnections.values())
        .filter(p => p.isInLobby)
        .map(p => ({
          id: p.id || p.socketId,
          nama: p.nama,
          tim: p.tim,
          joinedAt: p.joinedAt
        }));

      socket.emit('current_players', {
        type: 'current_players',
        data: {
          players: currentPlayers,
          timestamp: Date.now()
        },
        timestamp: Date.now()
      });

      // Broadcast to all connected clients
      const broadcastData = {
        type: 'player_join',
        playerId: playerId,
        data: {
          player: player,
          timestamp: Date.now()
        },
        timestamp: Date.now()
      };
      
      this.io.emit('player_join', broadcastData);
      
      console.log(`📢 Broadcasted player join to ${this.io.sockets.sockets.size} clients`);
      console.log(`📋 Sent current players list (${currentPlayers.length} players) to new player`);
      console.log(`📤 Broadcast data:`, JSON.stringify(broadcastData, null, 2));

    } catch (error) {
      console.error('❌ Lobby player join error:', error);
      socket.emit('error', { message: 'Error joining lobby' });
    }
  }

  // Lobby player leave
  handleLobbyPlayerLeave(socket, messageData) {
    try {
      const playerId = messageData.playerId;
      const player = messageData.data.player;
      
      console.log(`🎮 Lobby: Player ${player.nama} left team ${player.tim}`);

      // Remove player from lobby
      this.activeConnections.delete(playerId);

      // Broadcast to all connected clients
      this.io.emit('player_leave', {
        type: 'player_leave',
        playerId: playerId,
        data: {
          player: player,
          timestamp: Date.now()
        },
        timestamp: Date.now()
      });

      console.log(`📢 Broadcasted player leave to ${this.io.sockets.sockets.size} clients`);

    } catch (error) {
      console.error('❌ Lobby player leave error:', error);
      socket.emit('error', { message: 'Error leaving lobby' });
    }
  }

  // Lobby game state update
  handleLobbyGameState(socket, messageData) {
    try {
      const gameData = messageData.data;
      
      console.log(`🎮 Lobby: Game state updated - Status: ${gameData.status}`);

      // Broadcast game state to all connected clients
      this.io.emit('game_state', {
        type: 'game_state',
        playerId: messageData.playerId,
        data: {
          status: gameData.status,
          timeLeft: gameData.timeLeft,
          timestamp: Date.now()
        },
        timestamp: Date.now()
      });

      console.log(`📢 Broadcasted game state to ${this.io.sockets.sockets.size} clients`);

    } catch (error) {
      console.error('❌ Lobby game state error:', error);
      socket.emit('error', { message: 'Error updating game state' });
    }
  }

  // GPS tracking
  handleGPSUpdate(socket, gpsData) {
    try {
      const player = this.activeConnections.get(socket.id);
      if (!player) {
        socket.emit('error', { message: 'Player tidak ditemukan' });
        return;
      }

      // Anti-cheat validation
      const previousGPS = player.position;
      if (!antiCheat.validateGPSMovement(socket.id, gpsData, previousGPS)) {
        socket.emit('antiCheatWarning', {
          message: 'Gerakan GPS tidak valid - kemungkinan cheating terdeteksi'
        });
        return;
      }

      // Update player position
      player.position = {
        latitude: gpsData.latitude,
        longitude: gpsData.longitude,
        accuracy: gpsData.accuracy,
        timestamp: Date.now()
      };

      // Save to database
      database.saveGPSTracking(socket.id, player.position);
      database.savePlayer(socket.id, player);

      // Broadcast to nearby players
      this.broadcastPlayerPosition(socket, player);

    } catch (error) {
      console.error('❌ GPS update error:', error);
      socket.emit('error', { message: 'Error updating GPS position' });
    }
  }

  // Weapon firing
  handleWeaponFire(socket, shootingData) {
    try {
      const player = this.activeConnections.get(socket.id);
      if (!player) {
        socket.emit('error', { message: 'Player tidak ditemukan' });
        return;
      }

      // Anti-cheat validation
      if (!antiCheat.checkShootingRate(socket.id, shootingData)) {
        socket.emit('antiCheatWarning', {
          message: 'Rate shooting terlalu cepat - kemungkinan cheating terdeteksi'
        });
        return;
      }

      // Calculate shot result
      const shotResult = this.calculateShotResult(player, shootingData);

      // Save shooting log
      const shootingLog = {
        shooterId: socket.id,
        weapon: shootingData.weapon,
        targetId: shootingData.targetId,
        shooterPosition: player.position,
        targetPosition: shootingData.targetPosition,
        shotResult: shotResult,
        timestamp: Date.now()
      };

      database.saveShootingLog(shootingLog);

      // Broadcast shot to nearby players
      this.broadcastShot(socket, shootingData, shotResult);

      // Process hit if target exists
      if (shootingData.targetId && shotResult.hit) {
        this.processHit(socket.id, shootingData.targetId, shotResult);
      }

      // Send confirmation to shooter
      socket.emit('shotResult', {
        success: true,
        shotResult: shotResult,
        timestamp: shootingLog.timestamp
      });

    } catch (error) {
      console.error('❌ Weapon fire error:', error);
      socket.emit('error', { message: 'Error processing shot' });
    }
  }

  // Weapon reload
  handleWeaponReload(socket, reloadData) {
    try {
      const player = this.activeConnections.get(socket.id);
      if (!player) {
        socket.emit('error', { message: 'Player tidak ditemukan' });
        return;
      }

      // Save reload log
      const reloadLog = {
        playerId: socket.id,
        weapon: reloadData.weapon,
        reloadTime: reloadData.reloadTime,
        timestamp: Date.now(),
        type: 'reload'
      };

      database.saveShootingLog(reloadLog);

      // Notify nearby players
      socket.to(`team_${player.team}`).emit('playerReloaded', {
        playerId: socket.id,
        weapon: reloadData.weapon,
        timestamp: reloadLog.timestamp
      });

      socket.emit('reloadComplete', {
        weapon: reloadData.weapon,
        reloadTime: reloadData.reloadTime
      });

    } catch (error) {
      console.error('❌ Weapon reload error:', error);
      socket.emit('error', { message: 'Error reloading weapon' });
    }
  }

  // Weapon switch
  handleWeaponSwitch(socket, weaponData) {
    try {
      const player = this.activeConnections.get(socket.id);
      if (!player) {
        socket.emit('error', { message: 'Player tidak ditemukan' });
        return;
      }

      // Anti-cheat validation
      if (!antiCheat.validateWeaponSwitch(socket.id, weaponData)) {
        socket.emit('antiCheatWarning', {
          message: 'Weapon switching terlalu sering - kemungkinan cheating terdeteksi'
        });
        return;
      }

      // Update player weapon
      player.weapon = weaponData.newWeapon;

      // Save weapon switch log
      const switchLog = {
        playerId: socket.id,
        fromWeapon: weaponData.oldWeapon,
        toWeapon: weaponData.newWeapon,
        timestamp: Date.now(),
        type: 'weapon_switch'
      };

      database.saveShootingLog(switchLog);
      database.savePlayer(socket.id, player);

      // Notify nearby players
      socket.to(`team_${player.team}`).emit('playerSwitchedWeapon', {
        playerId: socket.id,
        newWeapon: weaponData.newWeapon,
        timestamp: switchLog.timestamp
      });

      socket.emit('weaponSwitchComplete', {
        newWeapon: weaponData.newWeapon,
        timestamp: switchLog.timestamp
      });

    } catch (error) {
      console.error('❌ Weapon switch error:', error);
      socket.emit('error', { message: 'Error switching weapon' });
    }
  }

  // Human detection
  handleHumanDetection(socket, detectionData) {
    try {
      const player = this.activeConnections.get(socket.id);
      if (!player) {
        socket.emit('error', { message: 'Player tidak ditemukan' });
        return;
      }

      // Anti-cheat validation
      if (!antiCheat.validateHumanDetection(socket.id, detectionData)) {
        socket.emit('antiCheatWarning', {
          message: 'Deteksi manusia terlalu sering - kemungkinan cheating terdeteksi'
        });
        return;
      }

      // Save detection log
      const detectionLog = {
        playerId: socket.id,
        timestamp: Date.now(),
        detectionData: detectionData,
        playerPosition: player.position,
        type: 'detection'
      };

      database.saveHumanDetectionLog(detectionLog);

      // Process detection result
      const detectionResult = this.processDetectionResult(detectionData);

      // Broadcast to nearby players if humans detected
      if (detectionResult.humansDetected > 0) {
        socket.to(`team_${player.team}`).emit('humanDetected', {
          playerId: socket.id,
          detectionResult: detectionResult,
          position: player.position,
          timestamp: detectionLog.timestamp
        });
      }

      socket.emit('detectionResult', {
        success: true,
        detectionResult: detectionResult,
        timestamp: detectionLog.timestamp
      });

    } catch (error) {
      console.error('❌ Human detection error:', error);
      socket.emit('error', { message: 'Error processing human detection' });
    }
  }

  // Player movement
  handlePlayerMovement(socket, movementData) {
    try {
      const player = this.activeConnections.get(socket.id);
      if (!player) {
        socket.emit('error', { message: 'Player tidak ditemukan' });
        return;
      }

      // Update player movement
      player.lastActivity = Date.now();

      // Broadcast movement to nearby players
      socket.to(`team_${player.team}`).emit('playerMoved', {
        playerId: socket.id,
        movement: movementData,
        timestamp: Date.now()
      });

    } catch (error) {
      console.error('❌ Player movement error:', error);
      socket.emit('error', { message: 'Error processing movement' });
    }
  }

  // Chat messages
  handleChatMessage(socket, messageData) {
    try {
      const player = this.activeConnections.get(socket.id);
      if (!player) {
        socket.emit('error', { message: 'Player tidak ditemukan' });
        return;
      }

      const chatMessage = {
        playerId: socket.id,
        playerName: player.name,
        team: player.team,
        message: messageData.message,
        timestamp: Date.now()
      };

      // Broadcast to team
      this.io.to(`team_${player.team}`).emit('chatMessage', chatMessage);

    } catch (error) {
      console.error('❌ Chat message error:', error);
      socket.emit('error', { message: 'Error sending chat message' });
    }
  }

  // Team join
  handleTeamJoin(socket, teamData) {
    try {
      const player = this.activeConnections.get(socket.id);
      if (!player) {
        socket.emit('error', { message: 'Player tidak ditemukan' });
        return;
      }

      // Leave current team room
      socket.leave(`team_${player.team}`);

      // Update player team
      player.team = teamData.team;

      // Join new team room
      const newRoomName = `team_${player.team}`;
      socket.join(newRoomName);

      if (!this.rooms.has(newRoomName)) {
        this.rooms.set(newRoomName, []);
      }
      this.rooms.get(newRoomName).push(socket.id);

      // Save updated player
      database.savePlayer(socket.id, player);

      // Notify team change
      this.io.to(newRoomName).emit('playerJoinedTeam', {
        player: {
          id: player.id,
          name: player.name,
          team: player.team
        }
      });

      socket.emit('teamChangeConfirmed', {
        newTeam: player.team,
        message: `Bergabung dengan tim ${player.team}!`
      });

    } catch (error) {
      console.error('❌ Team join error:', error);
      socket.emit('error', { message: 'Error joining team' });
    }
  }

  // Player disconnect
  handlePlayerDisconnect(socket) {
    try {
      const player = this.activeConnections.get(socket.id);
      if (player) {
        // Remove from active connections
        this.activeConnections.delete(socket.id);

        // Remove from room
        const roomName = `team_${player.team}`;
        if (this.rooms.has(roomName)) {
          const roomPlayers = this.rooms.get(roomName);
          const index = roomPlayers.indexOf(socket.id);
          if (index > -1) {
            roomPlayers.splice(index, 1);
          }
        }

        // Notify other players
        socket.to(roomName).emit('playerDisconnected', {
          playerId: socket.id,
          playerName: player.name,
          team: player.team
        });

        // Update player status in database
        player.isOnline = false;
        player.lastSeen = Date.now();
        database.savePlayer(socket.id, player);

        console.log(`👋 Player ${player.name} disconnected`);
      }

      // Broadcast updated player count
      this.broadcastPlayerCount();

    } catch (error) {
      console.error('❌ Player disconnect error:', error);
    }
  }

  // Helper methods
  calculateShotResult(player, shootingData) {
    // Simulate shot calculation
    const hit = Math.random() > 0.5;
    const damage = hit ? Math.floor(Math.random() * 30) + 10 : 0;

    return {
      hit: hit,
      damage: damage,
      accuracy: Math.random() * 0.3 + 0.7,
      distance: Math.random() * 100 + 10,
      weapon: shootingData.weapon
    };
  }

  processDetectionResult(detectionData) {
    // Simulate detection processing
    const humansDetected = Math.random() > 0.3 ? Math.floor(Math.random() * 3) + 1 : 0;
    
    return {
      humansDetected: humansDetected,
      confidence: Math.random() * 0.8 + 0.2,
      processingTime: Math.random() * 100 + 50
    };
  }

  processHit(shooterId, targetId, shotResult) {
    const targetPlayer = this.activeConnections.get(targetId);
    if (targetPlayer) {
      targetPlayer.hp = Math.max(0, targetPlayer.hp - shotResult.damage);
      
      if (targetPlayer.hp <= 0) {
        targetPlayer.isAlive = false;
        targetPlayer.deaths++;
        
        // Update shooter stats
        const shooter = this.activeConnections.get(shooterId);
        if (shooter) {
          shooter.kills++;
        }
      }

      // Save updated players
      database.savePlayer(targetId, targetPlayer);
      if (shooter) {
        database.savePlayer(shooterId, shooter);
      }

      // Broadcast hit
      this.io.to(`team_${targetPlayer.team}`).emit('playerHit', {
        targetId: targetId,
        shooterId: shooterId,
        damage: shotResult.damage,
        remainingHP: targetPlayer.hp,
        isKill: targetPlayer.hp <= 0
      });
    }
  }

  broadcastPlayerPosition(socket, player) {
    socket.to(`team_${player.team}`).emit('playerPositionUpdate', {
      playerId: socket.id,
      position: player.position,
      timestamp: Date.now()
    });
  }

  broadcastShot(socket, shootingData, shotResult) {
    socket.to(`team_${this.activeConnections.get(socket.id).team}`).emit('shotFired', {
      shooterId: socket.id,
      weapon: shootingData.weapon,
      shotResult: shotResult,
      timestamp: Date.now()
    });
  }

  broadcastPlayerCount() {
    const playerCount = this.activeConnections.size;
    this.io.emit('playerCountUpdate', {
      totalPlayers: playerCount,
      redTeam: Array.from(this.activeConnections.values()).filter(p => p.team === 'red').length,
      blueTeam: Array.from(this.activeConnections.values()).filter(p => p.team === 'blue').length
    });
  }

  // Get active connections
  getActiveConnections() {
    return this.activeConnections;
  }

  // Get room information
  getRoomInfo(roomName) {
    return this.rooms.get(roomName) || [];
  }
}

module.exports = GameSocketManager; 