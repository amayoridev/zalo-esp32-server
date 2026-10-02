const express = require('express');
const router = express.Router();
const espManager = require('../services/espManager');
const zaloService = require('../services/zaloService');

// Lấy trạng thái ESP32 & IP ghi nhận
router.get('/status', (req, res) => {
  res.json(espManager.getEspStatus());
});

// Lấy danh sách 21 cữ thuốc hiện tại
router.get('/alarms', (req, res) => {
  res.json(espManager.getAlarms());
});

// Đặt cữ thuốc lẻ từ Web Control Panel
router.post('/alarms/set', (req, res) => {
  const { id, h, m, en } = req.body;
  
  if (id === undefined || h === undefined || m === undefined) {
    return res.status(400).json({ error: 'Thiếu tham số: id, h, m' });
  }

  const numId = parseInt(id, 10);
  const numH = parseInt(h, 10);
  const numM = parseInt(m, 10);
  const boolEn = en === true || en === 'true' || en === 1 || en === '1';

  if (numId < 0 || numId >= 21) {
    return res.status(400).json({ error: 'Slot ID không hợp lệ (phải từ 0 đến 20)' });
  }

  espManager.queueAlarmUpdate(numId, numH, numM, boolEn);
  
  res.json({ 
    success: true, 
    message: `Đã đưa cữ ${espManager.getSlotName(numId)} (${numH}:${numM}) vào hàng đợi gửi ESP32`,
    status: espManager.getEspStatus()
  });
});

// Lấy nhật ký hoạt động hệ thống
router.get('/logs', (req, res) => {
  res.json(espManager.getLogs());
});

// Gửi thử tin nhắn Zalo từ Web Admin
router.post('/zalo/test', async (req, res) => {
  const { message } = req.body;
  const msgText = message || '🔔 Tin nhắn kiểm tra từ Máy Chủ Public ESP32 Smart Pill Box!';
  const result = await zaloService.sendZaloMessage(msgText);
  
  if (result) {
    res.json({ success: true, result });
  } else {
    res.status(500).json({ success: false, error: 'Không thể gửi tin nhắn Zalo' });
  }
});

module.exports = router;
