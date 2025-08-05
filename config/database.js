// 🗄️ Konfigurasi Database untuk Airsoft AR Battle
// Menyimpan data pemain, GPS tracking, dan shooting mechanics

const fs = require('fs');
const path = require('path');

class DatabaseManager {
  constructor() {
    this.dataPath = path.join(__dirname, '../data');
    this.ensureDataDirectory();
    this.loadData();
  }

  ensureDataDirectory() {
    if (!fs.existsSync(this.dataPath)) {
      fs.mkdirSync(this.dataPath, { recursive: true });
    }
  }

  loadData() {
    this.players = this.loadFile('players.json', {});
    this.gpsTracking = this.loadFile('gps_tracking.json', {});
    this.shootingLogs = this.loadFile('shooting_logs.json', []);
    this.antiCheatLogs = this.loadFile('anti_cheat_logs.json', []);
    this.humanDetectionLogs = this.loadFile('human_detection_logs.json', []);
  }

  loadFile(filename, defaultValue) {
    const filePath = path.join(this.dataPath, filename);
    try {
      if (fs.existsSync(filePath)) {
        const data = fs.readFileSync(filePath, 'utf8');
        return JSON.parse(data);
      }
    } catch (error) {
      console.error(`❌ Error loading ${filename}:`, error.message);
    }
    return defaultValue;
  }

  saveFile(filename, data) {
    const filePath = path.join(this.dataPath, filename);
    try {
      fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
      return true;
    } catch (error) {
      console.error(`❌ Error saving ${filename}:`, error.message);
      return false;
    }
  }

  // Player management
  savePlayer(playerId, playerData) {
    this.players[playerId] = {
      ...playerData,
      lastUpdated: new Date().toISOString()
    };
    return this.saveFile('players.json', this.players);
  }

  getPlayer(playerId) {
    return this.players[playerId] || null;
  }

  getAllPlayers() {
    return this.players;
  }

  // GPS Tracking
  saveGPSTracking(playerId, gpsData) {
    if (!this.gpsTracking[playerId]) {
      this.gpsTracking[playerId] = [];
    }
    
    this.gpsTracking[playerId].push({
      ...gpsData,
      timestamp: new Date().toISOString()
    });

    // Keep only last 100 GPS points per player
    if (this.gpsTracking[playerId].length > 100) {
      this.gpsTracking[playerId] = this.gpsTracking[playerId].slice(-100);
    }

    return this.saveFile('gps_tracking.json', this.gpsTracking);
  }

  getGPSHistory(playerId, limit = 50) {
    const history = this.gpsTracking[playerId] || [];
    return history.slice(-limit);
  }

  // Shooting mechanics
  saveShootingLog(shootingData) {
    this.shootingLogs.push({
      ...shootingData,
      timestamp: new Date().toISOString()
    });

    // Keep only last 1000 shooting logs
    if (this.shootingLogs.length > 1000) {
      this.shootingLogs = this.shootingLogs.slice(-1000);
    }

    return this.saveFile('shooting_logs.json', this.shootingLogs);
  }

  getShootingLogs(playerId = null, limit = 100) {
    let logs = this.shootingLogs;
    if (playerId) {
      logs = logs.filter(log => log.shooterId === playerId);
    }
    return logs.slice(-limit);
  }

  // Anti-cheat logs
  saveAntiCheatLog(logData) {
    this.antiCheatLogs.push({
      ...logData,
      timestamp: new Date().toISOString()
    });

    // Keep only last 500 anti-cheat logs
    if (this.antiCheatLogs.length > 500) {
      this.antiCheatLogs = this.antiCheatLogs.slice(-500);
    }

    return this.saveFile('anti_cheat_logs.json', this.antiCheatLogs);
  }

  // Human detection logs
  saveHumanDetectionLog(detectionData) {
    this.humanDetectionLogs.push({
      ...detectionData,
      timestamp: new Date().toISOString()
    });

    // Keep only last 200 detection logs
    if (this.humanDetectionLogs.length > 200) {
      this.humanDetectionLogs = this.humanDetectionLogs.slice(-200);
    }

    return this.saveFile('human_detection_logs.json', this.humanDetectionLogs);
  }

  // Cleanup old data
  cleanupOldData() {
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    
    // Cleanup old GPS data
    Object.keys(this.gpsTracking).forEach(playerId => {
      this.gpsTracking[playerId] = this.gpsTracking[playerId].filter(
        point => new Date(point.timestamp) > oneDayAgo
      );
    });

    // Cleanup old shooting logs
    this.shootingLogs = this.shootingLogs.filter(
      log => new Date(log.timestamp) > oneDayAgo
    );

    this.saveFile('gps_tracking.json', this.gpsTracking);
    this.saveFile('shooting_logs.json', this.shootingLogs);
  }
}

module.exports = new DatabaseManager(); 