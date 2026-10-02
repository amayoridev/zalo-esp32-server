const express = require('express');
const router = express.Router();
const espManager = require('../services/espManager');

/**
 * GET /esp-ping
 * Được gọi khi ESP32 bật nguồn hoặc kiểm tra kết nối Server.
 * 1. Trích xuất địa chỉ IP public/mạng của ESP32.
 * 2. Ghi nhận và ghi đè IP mới vào bộ nhớ Server.
 * 3. Trả về đúng văn bản "OK" kèm HTTP status 200.
 * -> ESP32 kiểm tra httpCode == 200 & body == "OK" để in LCD: " SERVER LINK: OK"
 */
router.get('/esp-ping', (req, res) => {
  // Lấy IP chính xác kể cả khi chạy qua Nginx / Cloudflare / Reverse Proxy của Host Public
  const clientIp = req.headers['x-forwarded-for'] 
    ? req.headers['x-forwarded-for'].split(',')[0].trim() 
    : (req.socket.remoteAddress || req.ip);

  espManager.recordEspActivity(clientIp, 'PING');

  res.setHeader('Content-Type', 'text/plain');
  res.status(200).send('OK');
});

/**
 * GET /esp-pull
 * Được ESP32 gọi liên tục mỗi 3 giây trong hàm pollZaloCommands().
 * 1. Ghi nhận hoạt động kết nối.
 * 2. Lấy danh sách các lệnh đổi giờ đang chờ trong hàng đợi (Pending Queue).
 * 3. Trả về JSON Array: [{id, h, m, en, slotName}, ...] hoặc [] nếu không có lệnh.
 * -> ĐÂY LÀ GIẢI PHÁP CHÍ MẠNG: Giúp điều khiển ESP32 100% thành công mà KHÔNG CẦN MỞ PORT (NAT Port Forwarding) trên router nhà!
 */
router.get('/esp-pull', (req, res) => {
  const clientIp = req.headers['x-forwarded-for'] 
    ? req.headers['x-forwarded-for'].split(',')[0].trim() 
    : (req.socket.remoteAddress || req.ip);

  espManager.recordEspActivity(clientIp, 'PULL');

  const pendingCommands = espManager.popPendingQueue();

  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.status(200).json(pendingCommands);
});

module.exports = router;
