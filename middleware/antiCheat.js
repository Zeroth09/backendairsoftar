// 🛡️ Anti-Cheat Middleware untuk Airsoft AR Battle
// Validasi shooting mechanics, GPS tracking, dan human detection

const database = require('../config/database');

class AntiCheatSystem {
  constructor() {
    this.suspiciousActivities = new Map();
    this.rateLimits = new Map();
    this.maxShotsPerSecond = 10;
    this.maxDistancePerSecond = 50; // meters
    this.maxAccuracy = 0.95; // 95% accuracy threshold
  }

  // Rate limiting untuk shooting
  checkShootingRate(playerId, shotData) {
    const now = Date.now();
    if (!this.rateLimits.has(playerId)) {
      this.rateLimits.set(playerId, []);
    }

    const shots = this.rateLimits.get(playerId);
    const oneSecondAgo = now - 1000;
    
    // Remove old shots
    const recentShots = shots.filter(timestamp => timestamp > oneSecondAgo);
    
    if (recentShots.length >= this.maxShotsPerSecond) {
      this.logSuspiciousActivity(playerId, 'RATE_LIMIT_EXCEEDED', {
        shotsInLastSecond: recentShots.length,
        maxAllowed: this.maxShotsPerSecond
      });
      return false;
    }

    recentShots.push(now);
    this.rateLimits.set(playerId, recentShots);
    return true;
  }

  // Validasi GPS movement
  validateGPSMovement(playerId, currentGPS, previousGPS) {
    if (!previousGPS) return true;

    const distance = this.calculateDistance(
      currentGPS.latitude, currentGPS.longitude,
      previousGPS.latitude, previousGPS.longitude
    );

    const timeDiff = (currentGPS.timestamp - previousGPS.timestamp) / 1000; // seconds
    const speed = distance / timeDiff; // meters per second

    // Maximum realistic speed: 20 m/s (72 km/h)
    if (speed > 20) {
      this.logSuspiciousActivity(playerId, 'UNREALISTIC_SPEED', {
        speed: speed,
        distance: distance,
        timeDiff: timeDiff
      });
      return false;
    }

    return true;
  }

  // Validasi shooting accuracy
  validateShootingAccuracy(playerId, shotData, targetData) {
    if (!targetData) return true;

    const distance = this.calculateDistance(
      shotData.shooterLat, shotData.shooterLng,
      targetData.latitude, targetData.longitude
    );

    // Accuracy decreases with distance
    const maxAccuracy = Math.max(0.3, this.maxAccuracy - (distance / 1000));
    
    if (shotData.accuracy > maxAccuracy) {
      this.logSuspiciousActivity(playerId, 'UNREALISTIC_ACCURACY', {
        claimedAccuracy: shotData.accuracy,
        maxAccuracy: maxAccuracy,
        distance: distance
      });
      return false;
    }

    return true;
  }

  // Validasi human detection
  validateHumanDetection(playerId, detectionData) {
    // Check if detection is too frequent
    const now = Date.now();
    const key = `${playerId}_human_detection`;
    
    if (!this.rateLimits.has(key)) {
      this.rateLimits.set(key, []);
    }

    const detections = this.rateLimits.get(key);
    const oneMinuteAgo = now - 60000;
    
    const recentDetections = detections.filter(timestamp => timestamp > oneMinuteAgo);
    
    if (recentDetections.length > 30) { // Max 30 detections per minute
      this.logSuspiciousActivity(playerId, 'EXCESSIVE_HUMAN_DETECTION', {
        detectionsInLastMinute: recentDetections.length
      });
      return false;
    }

    detections.push(now);
    this.rateLimits.set(key, detections);
    return true;
  }

  // Validasi weapon switching
  validateWeaponSwitch(playerId, weaponData) {
    const now = Date.now();
    const key = `${playerId}_weapon_switch`;
    
    if (!this.rateLimits.has(key)) {
      this.rateLimits.set(key, []);
    }

    const switches = this.rateLimits.get(key);
    const tenSecondsAgo = now - 10000;
    
    const recentSwitches = switches.filter(timestamp => timestamp > tenSecondsAgo);
    
    if (recentSwitches.length > 5) { // Max 5 weapon switches per 10 seconds
      this.logSuspiciousActivity(playerId, 'EXCESSIVE_WEAPON_SWITCHING', {
        switchesInLastTenSeconds: recentSwitches.length
      });
      return false;
    }

    switches.push(now);
    this.rateLimits.set(key, switches);
    return true;
  }

  // Validasi damage consistency
  validateDamage(playerId, damageData) {
    const weapon = damageData.weapon;
    const distance = damageData.distance;
    
    // Expected damage ranges based on weapon and distance
    const expectedDamage = this.calculateExpectedDamage(weapon, distance);
    const actualDamage = damageData.damage;
    
    const tolerance = expectedDamage * 0.2; // 20% tolerance
    
    if (Math.abs(actualDamage - expectedDamage) > tolerance) {
      this.logSuspiciousActivity(playerId, 'INCONSISTENT_DAMAGE', {
        weapon: weapon,
        distance: distance,
        expectedDamage: expectedDamage,
        actualDamage: actualDamage
      });
      return false;
    }

    return true;
  }

  // Helper methods
  calculateDistance(lat1, lng1, lat2, lng2) {
    const R = 6371e3; // Earth's radius in meters
    const φ1 = lat1 * Math.PI / 180;
    const φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lng2 - lng1) * Math.PI / 180;

    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
  }

  calculateExpectedDamage(weapon, distance) {
    const weaponStats = {
      'rifle': { baseDamage: 25, maxRange: 300, falloff: 0.1 },
      'sniper': { baseDamage: 50, maxRange: 500, falloff: 0.05 },
      'smg': { baseDamage: 15, maxRange: 150, falloff: 0.15 },
      'pistol': { baseDamage: 20, maxRange: 100, falloff: 0.2 }
    };

    const stats = weaponStats[weapon] || weaponStats['rifle'];
    const falloff = Math.max(0, (distance - stats.maxRange) * stats.falloff);
    
    return Math.max(5, stats.baseDamage - falloff);
  }

  // Logging suspicious activities
  logSuspiciousActivity(playerId, activityType, details) {
    const logData = {
      playerId: playerId,
      activityType: activityType,
      details: details,
      timestamp: new Date().toISOString()
    };

    database.saveAntiCheatLog(logData);
    
    // Track suspicious activities per player
    if (!this.suspiciousActivities.has(playerId)) {
      this.suspiciousActivities.set(playerId, []);
    }
    
    this.suspiciousActivities.get(playerId).push(logData);
    
    // If too many suspicious activities, flag player
    if (this.suspiciousActivities.get(playerId).length > 10) {
      console.log(`🚨 PLAYER ${playerId} FLAGGED FOR CHEATING!`);
      this.flagPlayer(playerId);
    }
  }

  flagPlayer(playerId) {
    // Implement player flagging logic
    console.log(`🚨 Anti-cheat: Player ${playerId} flagged for suspicious activity`);
  }

  // Get player's suspicious activity count
  getSuspiciousActivityCount(playerId) {
    return this.suspiciousActivities.get(playerId)?.length || 0;
  }

  // Cleanup old rate limit data
  cleanup() {
    const now = Date.now();
    const oneHourAgo = now - 3600000;
    
    for (const [key, timestamps] of this.rateLimits.entries()) {
      const recentTimestamps = timestamps.filter(timestamp => timestamp > oneHourAgo);
      this.rateLimits.set(key, recentTimestamps);
    }
  }
}

module.exports = new AntiCheatSystem(); 