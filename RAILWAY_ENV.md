# 🚀 Railway Environment Variables untuk Airsoft AR Battle Backend

## 📋 **Environment Variables yang Harus Diset di Railway:**

### **1. Server Configuration**
```env
NODE_ENV=production
PORT=3000
```

### **2. CORS Configuration**
```env
CORS_ORIGIN=https://airsoftar.vercel.app
CORS_CREDENTIALS=true
```

### **3. Socket.io Configuration**
```env
SOCKETIO_CORS_ORIGIN=https://airsoftar.vercel.app
SOCKETIO_TRANSPORTS=websocket,polling
```

### **4. Security Configuration**
```env
RATE_LIMIT_WINDOW=900000
RATE_LIMIT_MAX=100
```

### **5. Logging Configuration**
```env
LOG_LEVEL=info
```

## 🔧 **Cara Set Environment Variables di Railway:**

1. **Buka Railway Dashboard**
   - Kunjungi https://railway.app
   - Pilih project backend

2. **Set Variables**
   - Klik tab "Variables"
   - Tambahkan setiap variable di atas

3. **Redeploy**
   - Setelah set variables, klik "Deploy"
   - Tunggu deployment selesai

## 🌐 **Vercel Environment Variables:**

### **Frontend Variables:**
```env
NEXT_PUBLIC_API_URL=https://confident-clarity-production.up.railway.app
NEXT_PUBLIC_WS_URL=wss://confident-clarity-production.up.railway.app
```

## 🚨 **Troubleshooting:**

### **Jika Socket.io masih tidak terhubung:**
1. Cek Railway logs untuk error
2. Pastikan CORS_ORIGIN benar
3. Pastikan PORT tidak conflict
4. Cek apakah server start dengan benar

### **Test Connection:**
```bash
# Test backend health
curl https://backendairsoftar-production.up.railway.app

# Test Socket.io endpoint
curl https://backendairsoftar-production.up.railway.app/socket-test
``` 