const express = require('express');
const cors = require('cors');
const path = require('path');
const { PORT } = require('./config');

const espRoutes = require('./routes/esp');
const apiRoutes = require('./routes/api');
const webhookRoutes = require('./routes/webhook');

const app = express();

// Trust reverse proxy (Nginx, Render, Cloudflare, etc.) để lấy IP thực của ESP32
app.set('trust proxy', true);

// Middlewares
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static web dashboard
app.use(express.static(path.join(__dirname, 'public')));

// Register Routes
app.use('/', espRoutes);        // Route /esp-ping và /esp-pull cho ESP32
app.use('/api', apiRoutes);     // REST API cho giao diện Web Admin
app.use('/', webhookRoutes);    // Webhook /zalo-webhook cho Zalo Bot API

// Fallback route đến giao diện Web Dashboard
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Khởi động server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`=======================================================`);
  console.log(`🚀 NODE.JS PUBLIC SERVER CHO HỘP THUỐC THÔNG MINH ESP32`);
  console.log(`📡 Lắng nghe trên cổng: ${PORT}`);
  console.log(`🌐 Endpoint Ping ESP32:  GET  /esp-ping`);
  console.log(`📥 Endpoint Pull ESP32:  GET  /esp-pull`);
  console.log(`💬 Endpoint Webhook Zalo: POST /zalo-webhook`);
  console.log(`🖥️ Web Dashboard Admin:   http://localhost:${PORT}`);
  console.log(`=======================================================`);
});
