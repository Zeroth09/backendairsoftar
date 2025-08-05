# 🚀 Airsoft AR Battle - API Documentation

## 📋 Overview
Backend server untuk game Airsoft AR Battle dengan fitur real-time PvP, GPS tracking, human detection, dan anti-cheat system.

**Base URL:** `https://shaky-meeting-production.up.railway.app`  
**WebSocket URL:** `wss://shaky-meeting-production.up.railway.app`

---

## 🔌 WebSocket Events

### Connection Events
```javascript
// Connect to WebSocket
const socket = io('wss://shaky-meeting-production.up.railway.app');

// Server status on connection
socket.on('serverStatus', (data) => {
  console.log(data.message); // "🌐 Connected to Real-Time PvP Server!"
});
```

### Player Events
```javascript
// Join game
socket.emit('joinGame', {
  name: 'PlayerName',
  team: 'red', // or 'blue'
  hp: 100,
  maxHP: 100,
  weapon: 'rifle'
});

// Player joined confirmation
socket.on('joinConfirmed', (data) => {
  console.log('Joined:', data.player);
});

// Other player joined
socket.on('playerJoined', (data) => {
  console.log('New player:', data.player);
});

// Player disconnected
socket.on('playerDisconnected', (data) => {
  console.log('Player left:', data.playerName);
});
```

### GPS Tracking Events
```javascript
// Update GPS position
socket.emit('gpsUpdate', {
  latitude: -6.2088,
  longitude: 106.8456,
  accuracy: 10,
  speed: 5
});

// Player position update
socket.on('playerPositionUpdate', (data) => {
  console.log('Player moved:', data);
});
```

### Shooting Events
```javascript
// Fire weapon
socket.emit('fireWeapon', {
  weapon: 'rifle',
  targetId: 'player123',
  shooterLat: -6.2088,
  shooterLng: 106.8456,
  targetLat: -6.2089,
  targetLng: 106.8457,
  accuracy: 0.8
});

// Shot result
socket.on('shotResult', (data) => {
  console.log('Shot fired:', data.shotResult);
});

// Other player fired
socket.on('shotFired', (data) => {
  console.log('Enemy shot:', data);
});

// Reload weapon
socket.emit('reloadWeapon', {
  weapon: 'rifle',
  reloadTime: 3000
});

// Reload complete
socket.on('reloadComplete', (data) => {
  console.log('Reloaded:', data.weapon);
});

// Switch weapon
socket.emit('switchWeapon', {
  oldWeapon: 'rifle',
  newWeapon: 'sniper'
});

// Weapon switch complete
socket.on('weaponSwitchComplete', (data) => {
  console.log('Switched to:', data.newWeapon);
});
```

### Human Detection Events
```javascript
// Send human detection data
socket.emit('humanDetection', {
  imageData: 'base64_image_data',
  confidence: 0.85,
  boundingBoxes: [
    { x: 0.1, y: 0.2, width: 0.3, height: 0.4, confidence: 0.9 }
  ]
});

// Detection result
socket.on('detectionResult', (data) => {
  console.log('Detection:', data.detectionResult);
});

// Human detected by other player
socket.on('humanDetected', (data) => {
  console.log('Enemy detected humans:', data);
});
```

### Chat Events
```javascript
// Send chat message
socket.emit('chatMessage', {
  message: 'Hello team!'
});

// Receive chat message
socket.on('chatMessage', (data) => {
  console.log(`${data.playerName}: ${data.message}`);
});
```

### Team Events
```javascript
// Join team
socket.emit('joinTeam', {
  team: 'blue'
});

// Team change confirmed
socket.on('teamChangeConfirmed', (data) => {
  console.log('Joined team:', data.newTeam);
});
```

---

## 📍 GPS Tracking API

### Update GPS Position
```http
POST /api/gps/update
Content-Type: application/json

{
  "playerId": "player123",
  "latitude": -6.2088,
  "longitude": 106.8456,
  "accuracy": 10,
  "timestamp": 1640995200000,
  "speed": 5
}
```

**Response:**
```json
{
  "success": true,
  "message": "GPS position updated",
  "data": {
    "latitude": -6.2088,
    "longitude": 106.8456,
    "timestamp": 1640995200000
  }
}
```

### Get GPS History
```http
GET /api/gps/history/player123?limit=50
```

**Response:**
```json
{
  "success": true,
  "data": {
    "playerId": "player123",
    "history": [
      {
        "latitude": -6.2088,
        "longitude": 106.8456,
        "accuracy": 10,
        "timestamp": "2024-01-01T00:00:00.000Z",
        "speed": 5
      }
    ],
    "totalPoints": 50
  }
}
```

### Get Nearby Players
```http
GET /api/gps/nearby/player123?radius=100
```

**Response:**
```json
{
  "success": true,
  "data": {
    "playerId": "player123",
    "radius": 100,
    "nearbyPlayers": [
      {
        "playerId": "player456",
        "name": "EnemyPlayer",
        "team": "blue",
        "distance": 75,
        "position": {
          "latitude": -6.2089,
          "longitude": 106.8457
        }
      }
    ],
    "totalNearby": 1
  }
}
```

### Validate GPS Data
```http
POST /api/gps/validate
Content-Type: application/json

{
  "playerId": "player123",
  "gpsData": {
    "latitude": -6.2088,
    "longitude": 106.8456,
    "timestamp": 1640995200000
  },
  "previousGPS": {
    "latitude": -6.2087,
    "longitude": 106.8455,
    "timestamp": 1640995190000
  }
}
```

### Get GPS Heatmap
```http
GET /api/gps/heatmap?team=red&timeRange=1h
```

---

## 👥 Human Detection API

### Analyze Image
```http
POST /api/detection/analyze
Content-Type: multipart/form-data

Form Data:
- image: [image file]
- playerId: "player123"
- latitude: -6.2088
- longitude: 106.8456
- timestamp: 1640995200000
```

**Response:**
```json
{
  "success": true,
  "message": "Human detection analysis completed",
  "data": {
    "playerId": "player123",
    "detectionResult": {
      "humansDetected": 2,
      "confidence": 0.85,
      "boundingBoxes": [
        {
          "x": 0.1,
          "y": 0.2,
          "width": 0.3,
          "height": 0.4,
          "confidence": 0.9
        }
      ],
      "processingTime": 120
    },
    "timestamp": 1640995200000,
    "confidence": 0.85
  }
}
```

### Real-time Detection Stream
```http
POST /api/detection/stream
Content-Type: application/json

{
  "playerId": "player123",
  "detectionData": {
    "confidence": 0.85,
    "humansDetected": 1,
    "boundingBoxes": [...]
  }
}
```

### Get Detection History
```http
GET /api/detection/history/player123?limit=50&type=detection
```

### Get Detection Statistics
```http
GET /api/detection/stats/player123?timeRange=24h
```

**Response:**
```json
{
  "success": true,
  "data": {
    "playerId": "player123",
    "stats": {
      "totalDetections": 150,
      "successfulDetections": 120,
      "averageConfidence": 0.78,
      "detectionRate": 6.25,
      "timeRange": "24h"
    }
  }
}
```

---

## 🔫 Shooting Mechanics API

### Fire Weapon
```http
POST /api/shooting/fire
Content-Type: application/json

{
  "playerId": "player123",
  "weapon": "rifle",
  "targetId": "player456",
  "shooterLat": -6.2088,
  "shooterLng": 106.8456,
  "targetLat": -6.2089,
  "targetLng": 106.8457,
  "accuracy": 0.8,
  "timestamp": 1640995200000
}
```

**Response:**
```json
{
  "success": true,
  "message": "Shot fired successfully",
  "data": {
    "playerId": "player123",
    "weapon": "rifle",
    "shotResult": {
      "hit": true,
      "damage": 25,
      "accuracy": 0.8,
      "distance": 150,
      "weapon": "rifle"
    },
    "timestamp": 1640995200000
  }
}
```

### Reload Weapon
```http
POST /api/shooting/reload
Content-Type: application/json

{
  "playerId": "player123",
  "weapon": "rifle"
}
```

### Switch Weapon
```http
POST /api/shooting/switch-weapon
Content-Type: application/json

{
  "playerId": "player123",
  "fromWeapon": "rifle",
  "toWeapon": "sniper"
}
```

### Get Shooting Statistics
```http
GET /api/shooting/stats/player123?timeRange=24h
```

**Response:**
```json
{
  "success": true,
  "data": {
    "playerId": "player123",
    "stats": {
      "totalShots": 150,
      "hits": 120,
      "accuracy": 0.8,
      "weaponUsage": {
        "rifle": 100,
        "sniper": 30,
        "pistol": 20
      },
      "averageDamage": 22.5,
      "timeRange": "24h"
    }
  }
}
```

### Get Weapon Configurations
```http
GET /api/shooting/weapons
```

**Response:**
```json
{
  "success": true,
  "data": {
    "weapons": {
      "rifle": {
        "damage": 25,
        "range": 300,
        "fireRate": 600,
        "accuracy": 0.85,
        "reloadTime": 3000,
        "magazineSize": 30
      },
      "sniper": {
        "damage": 50,
        "range": 500,
        "fireRate": 60,
        "accuracy": 0.95,
        "reloadTime": 4000,
        "magazineSize": 10
      }
    }
  }
}
```

---

## 🛡️ Anti-Cheat API

### Get Anti-Cheat Status
```http
GET /api/anti-cheat/status
```

**Response:**
```json
{
  "success": true,
  "data": {
    "suspiciousActivities": 5,
    "rateLimits": 12,
    "system": "active",
    "lastCleanup": "2024-01-01T00:00:00.000Z"
  }
}
```

---

## 📊 General API Endpoints

### Server Status
```http
GET /
```

**Response:**
```json
{
  "status": "🚀 Airsoft AR Battle Advanced PvP Server",
  "version": "2.0.0",
  "players": 15,
  "uptime": 3600,
  "mode": "Real-Time Person vs Person dengan Anti-Cheat",
  "features": [
    "GPS Tracking dengan Validasi",
    "Human Detection API",
    "Shooting Mechanics",
    "Anti-Cheat System",
    "Real-Time WebSocket",
    "No AI/Bots - Real Humans Only"
  ]
}
```

### Get Players
```http
GET /api/players
```

### Get Server Status
```http
GET /api/status
```

---

## 🔧 Error Responses

### Rate Limit Error
```json
{
  "success": false,
  "message": "Terlalu banyak request dari IP ini, coba lagi nanti"
}
```

### Anti-Cheat Warning
```json
{
  "success": false,
  "message": "Rate shooting terlalu cepat - kemungkinan cheating terdeteksi"
}
```

### Validation Error
```json
{
  "success": false,
  "message": "Data GPS tidak lengkap"
}
```

### Server Error
```json
{
  "success": false,
  "message": "Internal server error"
}
```

---

## 🚀 Frontend Integration Example

```javascript
// Complete frontend integration example
class AirsoftARClient {
  constructor() {
    this.socket = io('wss://shaky-meeting-production.up.railway.app');
    this.playerId = null;
    this.setupEventHandlers();
  }

  setupEventHandlers() {
    // Connection events
    this.socket.on('serverStatus', (data) => {
      console.log('Connected:', data.message);
    });

    // Game events
    this.socket.on('joinConfirmed', (data) => {
      this.playerId = data.player.id;
      console.log('Joined game:', data.player);
    });

    this.socket.on('shotResult', (data) => {
      console.log('Shot result:', data.shotResult);
    });

    this.socket.on('detectionResult', (data) => {
      console.log('Detection result:', data.detectionResult);
    });
  }

  // Join game
  joinGame(playerData) {
    this.socket.emit('joinGame', playerData);
  }

  // Update GPS
  updateGPS(gpsData) {
    this.socket.emit('gpsUpdate', gpsData);
  }

  // Fire weapon
  fireWeapon(weaponData) {
    this.socket.emit('fireWeapon', weaponData);
  }

  // Send human detection
  sendHumanDetection(detectionData) {
    this.socket.emit('humanDetection', detectionData);
  }
}

// Usage
const client = new AirsoftARClient();
client.joinGame({
  name: 'PlayerName',
  team: 'red',
  weapon: 'rifle'
});
```

---

## 📝 Notes untuk Frontend Developers

1. **WebSocket Connection**: Gunakan Socket.io client untuk koneksi real-time
2. **GPS Tracking**: Update posisi setiap 1-5 detik untuk akurasi optimal
3. **Anti-Cheat**: Sistem akan mendeteksi dan memblokir aktivitas mencurigakan
4. **Error Handling**: Selalu handle error responses dengan proper user feedback
5. **Rate Limiting**: Jangan spam request, gunakan debouncing untuk GPS updates
6. **Image Upload**: Gunakan FormData untuk human detection image uploads
7. **Real-time Updates**: Semua game events menggunakan WebSocket untuk latency minimal

**Happy coding! 💕** 