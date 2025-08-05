# 🚀 Railway Deployment Guide

## 📋 Prerequisites
- Railway account (https://railway.app)
- GitHub repository
- Node.js project ready

## 🔧 Step-by-Step Deployment

### 1. Login ke Railway
```bash
# Install Railway CLI
npm install -g @railway/cli

# Login
railway login
```

### 2. Create New Project
1. Buka https://railway.app
2. Klik "New Project"
3. Pilih "Deploy from GitHub repo"
4. Connect repository ini

### 3. Set Environment Variables
Di Railway dashboard, set environment variables:
```env
NODE_ENV=production
PORT=3000
CORS_ORIGIN=https://airsoft-ar-battle.netlify.app
RATE_LIMIT_WINDOW=900000
RATE_LIMIT_MAX=100
```

### 4. Deploy
Railway akan otomatis deploy dari GitHub!

---

## 📁 Files Ready for Deployment

### ✅ Package.json
- Dependencies sudah lengkap
- Scripts sudah dikonfigurasi
- Engine requirements sudah set

### ✅ Railway Configuration
- `railway.json` - Railway config
- `Procfile` - Process configuration
- `.gitignore` - Git ignore rules

### ✅ Server Configuration
- `server-deploy.js` - Main server file
- Environment variables support
- Production-ready settings

### ✅ API Endpoints
- GPS Tracking: `/api/gps/*`
- Human Detection: `/api/detection/*`
- Shooting Mechanics: `/api/shooting/*`
- Anti-Cheat: `/api/anti-cheat/*`
- WebSocket: `ws://domain:port`

---

## 🔍 Verification Steps

### 1. Check Deployment
```bash
# Check if server is running
curl https://shaky-meeting-production.up.railway.app

# Expected response:
{
  "status": "🚀 Airsoft AR Battle Advanced PvP Server",
  "version": "2.0.0",
  "players": 0,
  "mode": "Real-Time Person vs Person dengan Anti-Cheat"
}
```

### 2. Test API Endpoints
```bash
# Test players endpoint
curl https://shaky-meeting-production.up.railway.app/api/players

# Test weapons endpoint
curl https://shaky-meeting-production.up.railway.app/api/shooting/weapons

# Test anti-cheat status
curl https://shaky-meeting-production.up.railway.app/api/anti-cheat/status
```

### 3. Test WebSocket
```javascript
// Test WebSocket connection
const socket = io('wss://shaky-meeting-production.up.railway.app');
socket.on('serverStatus', (data) => {
  console.log('Connected:', data.message);
});
```

---

## 🛠️ Troubleshooting

### Common Issues

#### 1. Build Failed
- Check Node.js version (>= 18.0.0)
- Verify all dependencies in package.json
- Check for syntax errors in code

#### 2. Environment Variables
- Ensure all required env vars are set
- Check CORS_ORIGIN matches frontend domain
- Verify PORT is set correctly

#### 3. WebSocket Issues
- Check if WebSocket is enabled in Railway
- Verify CORS settings for WebSocket
- Test connection with wscat

#### 4. Database Issues
- Check if data directory is writable
- Verify file permissions
- Monitor disk space usage

### Debug Commands
```bash
# Check Railway logs
railway logs

# Check deployment status
railway status

# Restart deployment
railway up
```

---

## 📊 Monitoring

### Health Checks
- **Server Status:** `GET /`
- **API Health:** `GET /api/status`
- **Anti-Cheat:** `GET /api/anti-cheat/status`

### Metrics to Monitor
- Active player count
- WebSocket connections
- API response times
- Anti-cheat violations
- GPS tracking accuracy

---

## 🔒 Security

### Production Security
- ✅ Helmet.js security headers
- ✅ CORS protection
- ✅ Rate limiting
- ✅ Input validation
- ✅ Anti-cheat system
- ✅ Error handling

### Environment Variables
```env
NODE_ENV=production
PORT=3000
CORS_ORIGIN=https://airsoft-ar-battle.netlify.app
RATE_LIMIT_WINDOW=900000
RATE_LIMIT_MAX=100
```

---

## 🎯 Success Criteria

### ✅ Deployment Successful
- [ ] Server responds to health check
- [ ] All API endpoints working
- [ ] WebSocket connection established
- [ ] Environment variables loaded
- [ ] Anti-cheat system active

### ✅ API Endpoints Working
- [ ] GPS tracking endpoints
- [ ] Human detection endpoints
- [ ] Shooting mechanics endpoints
- [ ] Anti-cheat endpoints
- [ ] General status endpoints

### ✅ WebSocket Events
- [ ] Player join/leave events
- [ ] GPS update events
- [ ] Shooting events
- [ ] Chat events
- [ ] Team events

---

## 🚀 Ready for Production!

Setelah deployment berhasil, backend akan tersedia di:
- **URL:** https://shaky-meeting-production.up.railway.app
- **WebSocket:** wss://shaky-meeting-production.up.railway.app
- **API Docs:** https://shaky-meeting-production.up.railway.app/API_DOCUMENTATION.md

**Happy deploying! 💕** 