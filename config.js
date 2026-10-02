require('dotenv').config();

module.exports = {
  PORT: process.env.PORT || 3000,
  ZALO_BOT_TOKEN: process.env.ZALO_BOT_TOKEN || '3516935780710466264:ugSstUzvFeZmZfcybnQrfsiuegGQekOlaVOxAzbPqtOnWjqsADfSVjQcraMywtBt',
  ZALO_CHAT_ID: process.env.ZALO_CHAT_ID || 'zgr-283fb837225acb04924b',
  ZALO_API_URL: 'https://bot-api.zaloplatforms.com/bot',
  ESP_OFFLINE_THRESHOLD_SEC: 15
};
