// 👥 Human Detection API untuk Airsoft AR Battle
// Real-time human detection dengan TensorFlow.js dan anti-cheat

const express = require('express');
const router = express.Router();
const multer = require('multer');
const sharp = require('sharp');
const database = require('../config/database');
const antiCheat = require('../middleware/antiCheat');

// Configure multer untuk image upload
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB max
    files: 1
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Hanya file gambar yang diperbolehkan'));
    }
  }
});

// POST /api/detection/analyze - Analyze image for human detection
router.post('/analyze', upload.single('image'), async (req, res) => {
  try {
    const { playerId, latitude, longitude, timestamp } = req.body;
    const imageFile = req.file;

    if (!imageFile) {
      return res.status(400).json({
        success: false,
        message: 'File gambar tidak ditemukan'
      });
    }

    // Validasi input
    if (!playerId) {
      return res.status(400).json({
        success: false,
        message: 'Player ID diperlukan'
      });
    }

    // Anti-cheat validation untuk human detection
    const detectionData = {
      playerId: playerId,
      timestamp: timestamp || Date.now(),
      imageSize: imageFile.size
    };

    if (!antiCheat.validateHumanDetection(playerId, detectionData)) {
      return res.status(403).json({
        success: false,
        message: 'Deteksi manusia terlalu sering - kemungkinan cheating terdeteksi'
      });
    }

    // Process image dengan Sharp
    const processedImage = await sharp(imageFile.buffer)
      .resize(640, 480, { fit: 'inside' })
      .jpeg({ quality: 80 })
      .toBuffer();

    // Simulate human detection (dalam implementasi nyata akan menggunakan TensorFlow.js)
    const detectionResult = await simulateHumanDetection(processedImage);

    // Save detection log
    const logData = {
      playerId: playerId,
      latitude: parseFloat(latitude) || null,
      longitude: parseFloat(longitude) || null,
      timestamp: timestamp || Date.now(),
      detectionResult: detectionResult,
      imageSize: imageFile.size,
      processedImageSize: processedImage.length
    };

    database.saveHumanDetectionLog(logData);

    res.json({
      success: true,
      message: 'Human detection analysis completed',
      data: {
        playerId: playerId,
        detectionResult: detectionResult,
        timestamp: logData.timestamp,
        confidence: detectionResult.confidence
      }
    });

  } catch (error) {
    console.error('❌ Human Detection Error:', error);
    res.status(500).json({
      success: false,
      message: 'Error analyzing human detection'
    });
  }
});

// POST /api/detection/stream - Real-time detection stream
router.post('/stream', async (req, res) => {
  try {
    const { playerId, detectionData } = req.body;

    // Validasi input
    if (!playerId || !detectionData) {
      return res.status(400).json({
        success: false,
        message: 'Data deteksi tidak lengkap'
      });
    }

    // Anti-cheat validation
    if (!antiCheat.validateHumanDetection(playerId, detectionData)) {
      return res.status(403).json({
        success: false,
        message: 'Stream deteksi terlalu sering'
      });
    }

    // Process real-time detection data
    const processedResult = await processRealTimeDetection(detectionData);

    // Save stream log
    const logData = {
      playerId: playerId,
      timestamp: Date.now(),
      detectionData: detectionData,
      processedResult: processedResult,
      type: 'stream'
    };

    database.saveHumanDetectionLog(logData);

    res.json({
      success: true,
      message: 'Real-time detection processed',
      data: {
        playerId: playerId,
        result: processedResult,
        timestamp: logData.timestamp
      }
    });

  } catch (error) {
    console.error('❌ Detection Stream Error:', error);
    res.status(500).json({
      success: false,
      message: 'Error processing detection stream'
    });
  }
});

// GET /api/detection/history/:playerId - Get detection history
router.get('/history/:playerId', async (req, res) => {
  try {
    const { playerId } = req.params;
    const { limit = 50, type } = req.query;

    const allLogs = database.humanDetectionLogs || [];
    let filteredLogs = allLogs.filter(log => log.playerId === playerId);

    if (type) {
      filteredLogs = filteredLogs.filter(log => log.type === type);
    }

    const history = filteredLogs.slice(-parseInt(limit));

    res.json({
      success: true,
      data: {
        playerId: playerId,
        history: history,
        totalDetections: history.length
      }
    });

  } catch (error) {
    console.error('❌ Detection History Error:', error);
    res.status(500).json({
      success: false,
      message: 'Error retrieving detection history'
    });
  }
});

// GET /api/detection/stats/:playerId - Get detection statistics
router.get('/stats/:playerId', async (req, res) => {
  try {
    const { playerId } = req.params;
    const { timeRange = '24h' } = req.query;

    const allLogs = database.humanDetectionLogs || [];
    const playerLogs = allLogs.filter(log => log.playerId === playerId);

    // Calculate time range
    const now = Date.now();
    const timeRangeMs = timeRange === '1h' ? 3600000 : 
                       timeRange === '6h' ? 21600000 : 
                       timeRange === '12h' ? 43200000 : 86400000; // 24h default

    const recentLogs = playerLogs.filter(log => 
      (now - new Date(log.timestamp).getTime()) <= timeRangeMs
    );

    // Calculate statistics
    const stats = {
      totalDetections: recentLogs.length,
      successfulDetections: recentLogs.filter(log => 
        log.detectionResult && log.detectionResult.humansDetected > 0
      ).length,
      averageConfidence: recentLogs.length > 0 ? 
        recentLogs.reduce((sum, log) => sum + (log.detectionResult?.confidence || 0), 0) / recentLogs.length : 0,
      detectionRate: recentLogs.length > 0 ? recentLogs.length / (timeRangeMs / 3600000) : 0, // per hour
      timeRange: timeRange
    };

    res.json({
      success: true,
      data: {
        playerId: playerId,
        stats: stats
      }
    });

  } catch (error) {
    console.error('❌ Detection Stats Error:', error);
    res.status(500).json({
      success: false,
      message: 'Error calculating detection statistics'
    });
  }
});

// POST /api/detection/validate - Validate detection data
router.post('/validate', async (req, res) => {
  try {
    const { playerId, detectionData } = req.body;

    const isValid = antiCheat.validateHumanDetection(playerId, detectionData);

    res.json({
      success: true,
      data: {
        isValid: isValid,
        playerId: playerId
      }
    });

  } catch (error) {
    console.error('❌ Detection Validation Error:', error);
    res.status(500).json({
      success: false,
      message: 'Error validating detection data'
    });
  }
});

// Helper functions
async function simulateHumanDetection(imageBuffer) {
  // Simulate TensorFlow.js human detection
  // Dalam implementasi nyata, ini akan menggunakan model ML yang sebenarnya
  
  const confidence = Math.random() * 0.8 + 0.2; // 20-100% confidence
  const humansDetected = Math.random() > 0.5 ? Math.floor(Math.random() * 3) + 1 : 0;
  
  return {
    humansDetected: humansDetected,
    confidence: confidence,
    boundingBoxes: humansDetected > 0 ? generateBoundingBoxes(humansDetected) : [],
    processingTime: Math.random() * 100 + 50 // 50-150ms
  };
}

async function processRealTimeDetection(detectionData) {
  // Process real-time detection data
  const confidence = Math.random() * 0.9 + 0.1;
  const humansDetected = Math.random() > 0.3 ? Math.floor(Math.random() * 2) + 1 : 0;
  
  return {
    humansDetected: humansDetected,
    confidence: confidence,
    realTime: true,
    processingTime: Math.random() * 50 + 20 // 20-70ms
  };
}

function generateBoundingBoxes(count) {
  const boxes = [];
  for (let i = 0; i < count; i++) {
    boxes.push({
      x: Math.random() * 0.8,
      y: Math.random() * 0.8,
      width: Math.random() * 0.3 + 0.1,
      height: Math.random() * 0.3 + 0.1,
      confidence: Math.random() * 0.8 + 0.2
    });
  }
  return boxes;
}

module.exports = router; 