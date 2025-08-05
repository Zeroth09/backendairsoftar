// 🔫 Shooting Mechanics API untuk Airsoft AR Battle
// Real-time shooting dengan damage calculation dan anti-cheat validation

const express = require('express');
const router = express.Router();
const database = require('../config/database');
const antiCheat = require('../middleware/antiCheat');

// Weapon configurations
const weaponStats = {
  rifle: {
    damage: 25,
    range: 300,
    fireRate: 600, // RPM
    accuracy: 0.85,
    reloadTime: 3000,
    magazineSize: 30
  },
  sniper: {
    damage: 50,
    range: 500,
    fireRate: 60,
    accuracy: 0.95,
    reloadTime: 4000,
    magazineSize: 10
  },
  smg: {
    damage: 15,
    range: 150,
    fireRate: 900,
    accuracy: 0.75,
    reloadTime: 2500,
    magazineSize: 25
  },
  pistol: {
    damage: 20,
    range: 100,
    fireRate: 300,
    accuracy: 0.80,
    reloadTime: 2000,
    magazineSize: 15
  }
};

// POST /api/shooting/fire - Fire weapon
router.post('/fire', async (req, res) => {
  try {
    const {
      playerId,
      weapon,
      targetId,
      shooterLat,
      shooterLng,
      targetLat,
      targetLng,
      accuracy,
      timestamp
    } = req.body;

    // Validasi input
    if (!playerId || !weapon) {
      return res.status(400).json({
        success: false,
        message: 'Player ID dan weapon diperlukan'
      });
    }

    // Validasi weapon
    if (!weaponStats[weapon]) {
      return res.status(400).json({
        success: false,
        message: 'Weapon tidak valid'
      });
    }

    // Anti-cheat validation untuk shooting rate
    const shotData = {
      weapon: weapon,
      timestamp: timestamp || Date.now(),
      accuracy: accuracy || 0.5
    };

    if (!antiCheat.checkShootingRate(playerId, shotData)) {
      return res.status(403).json({
        success: false,
        message: 'Rate shooting terlalu cepat - kemungkinan cheating terdeteksi'
      });
    }

    // Calculate shot result
    const shotResult = await calculateShotResult(playerId, weapon, {
      shooterLat: parseFloat(shooterLat),
      shooterLng: parseFloat(shooterLng),
      targetLat: parseFloat(targetLat),
      targetLng: parseFloat(targetLng),
      accuracy: parseFloat(accuracy) || 0.5
    });

    // Anti-cheat validation untuk accuracy
    const targetData = targetLat && targetLng ? {
      latitude: parseFloat(targetLat),
      longitude: parseFloat(targetLng)
    } : null;

    if (!antiCheat.validateShootingAccuracy(playerId, shotResult, targetData)) {
      return res.status(403).json({
        success: false,
        message: 'Accuracy shooting tidak valid - kemungkinan cheating terdeteksi'
      });
    }

    // Save shooting log
    const shootingLog = {
      shooterId: playerId,
      weapon: weapon,
      targetId: targetId || null,
      shooterPosition: {
        latitude: parseFloat(shooterLat) || null,
        longitude: parseFloat(shooterLng) || null
      },
      targetPosition: targetData,
      shotResult: shotResult,
      timestamp: timestamp || Date.now()
    };

    database.saveShootingLog(shootingLog);

    // Process hit if target exists
    if (targetId && shotResult.hit) {
      await processHit(playerId, targetId, shotResult);
    }

    res.json({
      success: true,
      message: 'Shot fired successfully',
      data: {
        playerId: playerId,
        weapon: weapon,
        shotResult: shotResult,
        timestamp: shootingLog.timestamp
      }
    });

  } catch (error) {
    console.error('❌ Shooting Fire Error:', error);
    res.status(500).json({
      success: false,
      message: 'Error processing shot'
    });
  }
});

// POST /api/shooting/reload - Reload weapon
router.post('/reload', async (req, res) => {
  try {
    const { playerId, weapon } = req.body;

    if (!playerId || !weapon) {
      return res.status(400).json({
        success: false,
        message: 'Player ID dan weapon diperlukan'
      });
    }

    const weaponConfig = weaponStats[weapon];
    if (!weaponConfig) {
      return res.status(400).json({
        success: false,
        message: 'Weapon tidak valid'
      });
    }

    // Simulate reload time
    const reloadTime = weaponConfig.reloadTime;
    const reloadStart = Date.now();

    // Save reload log
    const reloadLog = {
      playerId: playerId,
      weapon: weapon,
      reloadTime: reloadTime,
      timestamp: reloadStart
    };

    database.saveShootingLog({
      ...reloadLog,
      type: 'reload'
    });

    res.json({
      success: true,
      message: 'Weapon reloaded',
      data: {
        playerId: playerId,
        weapon: weapon,
        reloadTime: reloadTime,
        magazineSize: weaponConfig.magazineSize,
        timestamp: reloadStart
      }
    });

  } catch (error) {
    console.error('❌ Reload Error:', error);
    res.status(500).json({
      success: false,
      message: 'Error reloading weapon'
    });
  }
});

// POST /api/shooting/switch-weapon - Switch weapon
router.post('/switch-weapon', async (req, res) => {
  try {
    const { playerId, fromWeapon, toWeapon } = req.body;

    if (!playerId || !fromWeapon || !toWeapon) {
      return res.status(400).json({
        success: false,
        message: 'Player ID dan weapon data diperlukan'
      });
    }

    // Anti-cheat validation untuk weapon switching
    const weaponData = {
      fromWeapon: fromWeapon,
      toWeapon: toWeapon,
      timestamp: Date.now()
    };

    if (!antiCheat.validateWeaponSwitch(playerId, weaponData)) {
      return res.status(403).json({
        success: false,
        message: 'Weapon switching terlalu sering - kemungkinan cheating terdeteksi'
      });
    }

    // Validate weapons
    if (!weaponStats[fromWeapon] || !weaponStats[toWeapon]) {
      return res.status(400).json({
        success: false,
        message: 'Weapon tidak valid'
      });
    }

    // Save weapon switch log
    const switchLog = {
      playerId: playerId,
      fromWeapon: fromWeapon,
      toWeapon: toWeapon,
      timestamp: Date.now(),
      type: 'weapon_switch'
    };

    database.saveShootingLog(switchLog);

    res.json({
      success: true,
      message: 'Weapon switched successfully',
      data: {
        playerId: playerId,
        fromWeapon: fromWeapon,
        toWeapon: toWeapon,
        newWeaponStats: weaponStats[toWeapon],
        timestamp: switchLog.timestamp
      }
    });

  } catch (error) {
    console.error('❌ Weapon Switch Error:', error);
    res.status(500).json({
      success: false,
      message: 'Error switching weapon'
    });
  }
});

// GET /api/shooting/stats/:playerId - Get shooting statistics
router.get('/stats/:playerId', async (req, res) => {
  try {
    const { playerId } = req.params;
    const { timeRange = '24h' } = req.query;

    const shootingLogs = database.getShootingLogs(playerId, 1000);
    
    // Calculate time range
    const now = Date.now();
    const timeRangeMs = timeRange === '1h' ? 3600000 : 
                       timeRange === '6h' ? 21600000 : 
                       timeRange === '12h' ? 43200000 : 86400000;

    const recentLogs = shootingLogs.filter(log => 
      (now - new Date(log.timestamp).getTime()) <= timeRangeMs
    );

    // Calculate statistics
    const stats = {
      totalShots: recentLogs.filter(log => !log.type || log.type === 'shot').length,
      hits: recentLogs.filter(log => log.shotResult && log.shotResult.hit).length,
      accuracy: recentLogs.length > 0 ? 
        recentLogs.filter(log => log.shotResult && log.shotResult.hit).length / recentLogs.length : 0,
      weaponUsage: {},
      averageDamage: 0,
      timeRange: timeRange
    };

    // Calculate weapon usage
    recentLogs.forEach(log => {
      if (log.weapon) {
        stats.weaponUsage[log.weapon] = (stats.weaponUsage[log.weapon] || 0) + 1;
      }
    });

    // Calculate average damage
    const damageLogs = recentLogs.filter(log => log.shotResult && log.shotResult.damage);
    if (damageLogs.length > 0) {
      stats.averageDamage = damageLogs.reduce((sum, log) => sum + log.shotResult.damage, 0) / damageLogs.length;
    }

    res.json({
      success: true,
      data: {
        playerId: playerId,
        stats: stats
      }
    });

  } catch (error) {
    console.error('❌ Shooting Stats Error:', error);
    res.status(500).json({
      success: false,
      message: 'Error calculating shooting statistics'
    });
  }
});

// GET /api/shooting/weapons - Get weapon configurations
router.get('/weapons', async (req, res) => {
  try {
    res.json({
      success: true,
      data: {
        weapons: weaponStats
      }
    });
  } catch (error) {
    console.error('❌ Weapons Config Error:', error);
    res.status(500).json({
      success: false,
      message: 'Error retrieving weapon configurations'
    });
  }
});

// Helper functions
async function calculateShotResult(playerId, weapon, shotData) {
  const weaponConfig = weaponStats[weapon];
  const distance = shotData.targetLat && shotData.targetLng ? 
    antiCheat.calculateDistance(
      shotData.shooterLat, shotData.shooterLng,
      shotData.targetLat, shotData.targetLng
    ) : 0;

  // Calculate hit probability based on distance and accuracy
  const baseAccuracy = weaponConfig.accuracy;
  const distancePenalty = Math.min(0.3, distance / 1000); // 30% penalty at 1km
  const finalAccuracy = Math.max(0.1, baseAccuracy - distancePenalty);
  
  const hit = Math.random() < finalAccuracy;
  
  // Calculate damage
  let damage = 0;
  if (hit) {
    const baseDamage = weaponConfig.damage;
    const distanceFalloff = Math.max(0, (distance - weaponConfig.range) / 100);
    damage = Math.max(5, baseDamage - distanceFalloff);
  }

  // Anti-cheat validation untuk damage
  const damageData = {
    weapon: weapon,
    distance: distance,
    damage: damage
  };

  if (!antiCheat.validateDamage(playerId, damageData)) {
    return {
      hit: false,
      damage: 0,
      accuracy: finalAccuracy,
      distance: distance,
      reason: 'anti_cheat_damage_validation_failed'
    };
  }

  return {
    hit: hit,
    damage: Math.round(damage),
    accuracy: finalAccuracy,
    distance: Math.round(distance),
    weapon: weapon
  };
}

async function processHit(shooterId, targetId, shotResult) {
  // Process hit on target player
  const targetPlayer = database.getPlayer(targetId);
  if (targetPlayer) {
    const newHP = Math.max(0, targetPlayer.hp - shotResult.damage);
    targetPlayer.hp = newHP;
    
    if (newHP <= 0) {
      targetPlayer.isAlive = false;
      // Update shooter stats
      const shooter = database.getPlayer(shooterId);
      if (shooter) {
        shooter.kills = (shooter.kills || 0) + 1;
        database.savePlayer(shooterId, shooter);
      }
    }
    
    database.savePlayer(targetId, targetPlayer);
  }
}

module.exports = router; 