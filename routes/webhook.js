const express = require('express');
const router = express.Router();
const zaloService = require('../services/zaloService');

// Xác minh Webhook Zalo (khi cấu hình trên Zalo Developers Platform)
router.get('/zalo-webhook', (req, res) => {
  const challenge = req.query['hub.challenge'] || req.query.challenge;
  if (challenge) {
    return res.status(200).send(challenge);
  }
  res.status(200).send('Zalo Webhook Endpoint Ready');
});

// Lắng nghe sự kiện / tin nhắn gửi đến từ Zalo Bot
router.post('/zalo-webhook', async (req, res) => {
  try {
    const result = await zaloService.processZaloWebhook(req.body);
    res.status(200).json({ status: 'ok', result });
  } catch (error) {
    console.error('Error processing Zalo Webhook:', error);
    res.status(500).json({ status: 'error', message: error.message });
  }
});

module.exports = router;
