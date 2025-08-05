// 📍 GPS Tracking Endpoints untuk Airsoft AR Battle
// Real-time location tracking dengan anti-cheat validation

const express = require('express');
const router = express.Router();
const database = require('../config/database');
const antiCheat = require('../middleware/antiCheat');

// POST /api/gps/update - Update player GPS position
router.post('/update', async (req, res) => {
  try {
    const { playerId, latitude, longitude, accuracy, timestamp, speed } = req.body;

    // Validasi input
    if (!playerId || !latitude || !longitude) {
      return res.status(400).json({
        success: false,
        message: 'Data GPS tidak lengkap'
      });
    }

    // Validasi koordinat
    if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
      return res.status(400).json({
        success: false,
        message: 'Koordinat GPS tidak valid'
      });
    }

    const gpsData = {
      latitude: parseFloat(latitude),
      longitude: parseFloat(longitude),
      accuracy: parseFloat(accuracy) || 10,
      timestamp: timestamp || Date.now(),
      speed: parseFloat(speed) || 0
    };

    // Get previous GPS data untuk validasi
    const gpsHistory = database.getGPSHistory(playerId, 1);
    const previousGPS = gpsHistory.length > 0 ? gpsHistory[gpsHistory.length - 1] : null;

    // Anti-cheat validation
    if (!antiCheat.validateGPSMovement(playerId, gpsData, previousGPS)) {
      return res.status(403).json({
        success: false,
        message: 'Gerakan GPS tidak valid - kemungkinan cheating terdeteksi'
      });
    }

    // Save GPS data
    database.saveGPSTracking(playerId, gpsData);

    // Update player position di game state
    const player = database.getPlayer(playerId);
    if (player) {
      player.position = {
        latitude: gpsData.latitude,
        longitude: gpsData.longitude,
        lastUpdated: new Date().toISOString()
      };
      database.savePlayer(playerId, player);
    }

    res.json({
      success: true,
      message: 'GPS position updated',
      data: {
        latitude: gpsData.latitude,
        longitude: gpsData.longitude,
        timestamp: gpsData.timestamp
      }
    });

  } catch (error) {
    console.error('❌ GPS Update Error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating GPS position'
    });
  }
});

// GET /api/gps/history/:playerId - Get GPS history
router.get('/history/:playerId', async (req, res) => {
  try {
    const { playerId } = req.params;
    const { limit = 50 } = req.query;

    const gpsHistory = database.getGPSHistory(playerId, parseInt(limit));

    res.json({
      success: true,
      data: {
        playerId: playerId,
        history: gpsHistory,
        totalPoints: gpsHistory.length
      }
    });

  } catch (error) {
    console.error('❌ GPS History Error:', error);
    res.status(500).json({
      success: false,
      message: 'Error retrieving GPS history'
    });
  }
});

// GET /api/gps/nearby/:playerId - Get nearby players
router.get('/nearby/:playerId', async (req, res) => {
  try {
    const { playerId } = req.params;
    const { radius = 100 } = req.query; // Default 100 meters

    const currentPlayer = database.getPlayer(playerId);
    if (!currentPlayer || !currentPlayer.position) {
      return res.status(404).json({
        success: false,
        message: 'Player position tidak ditemukan'
      });
    }

    const allPlayers = database.getAllPlayers();
    const nearbyPlayers = [];

    for (const [id, player] of Object.entries(allPlayers)) {
      if (id === playerId || !player.position) continue;

      const distance = antiCheat.calculateDistance(
        currentPlayer.position.latitude,
        currentPlayer.position.longitude,
        player.position.latitude,
        player.position.longitude
      );

      if (distance <= radius) {
        nearbyPlayers.push({
          playerId: id,
          name: player.name,
          team: player.team,
          distance: Math.round(distance),
          position: player.position
        });
      }
    }

    // Sort by distance
    nearbyPlayers.sort((a, b) => a.distance - b.distance);

    res.json({
      success: true,
      data: {
        playerId: playerId,
        radius: parseInt(radius),
        nearbyPlayers: nearbyPlayers,
        totalNearby: nearbyPlayers.length
      }
    });

  } catch (error) {
    console.error('❌ Nearby Players Error:', error);
    res.status(500).json({
      success: false,
      message: 'Error retrieving nearby players'
    });
  }
});

// POST /api/gps/validate - Validate GPS data
router.post('/validate', async (req, res) => {
  try {
    const { playerId, gpsData, previousGPS } = req.body;

    const isValid = antiCheat.validateGPSMovement(playerId, gpsData, previousGPS);

    res.json({
      success: true,
      data: {
        isValid: isValid,
        playerId: playerId
      }
    });

  } catch (error) {
    console.error('❌ GPS Validation Error:', error);
    res.status(500).json({
      success: false,
      message: 'Error validating GPS data'
    });
  }
});

// GET /api/gps/heatmap - Get GPS heatmap data
router.get('/heatmap', async (req, res) => {
  try {
    const { team, timeRange = '1h' } = req.query;

    const allPlayers = database.getAllPlayers();
    const heatmapData = [];

    for (const [playerId, player] of Object.entries(allPlayers)) {
      if (team && player.team !== team) continue;

      const gpsHistory = database.getGPSHistory(playerId, 100);
      
      gpsHistory.forEach(point => {
        heatmapData.push({
          latitude: point.latitude,
          longitude: point.longitude,
          intensity: 1,
          timestamp: point.timestamp,
          playerId: playerId,
          team: player.team
        });
      });
    }

    res.json({
      success: true,
      data: {
        heatmapData: heatmapData,
        totalPoints: heatmapData.length,
        timeRange: timeRange
      }
    });

  } catch (error) {
    console.error('❌ Heatmap Error:', error);
    res.status(500).json({
      success: false,
      message: 'Error generating heatmap data'
    });
  }
});

module.exports = router; 