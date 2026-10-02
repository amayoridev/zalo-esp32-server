const axios = require('axios');
const { ZALO_BOT_TOKEN, ZALO_CHAT_ID, ZALO_API_URL } = require('../config');
const espManager = require('./espManager');

/**
 * Gửi tin nhắn Zalo tới Chat ID
 */
async function sendZaloMessage(text, customChatId = null, customToken = null) {
  const token = customToken || ZALO_BOT_TOKEN;
  const chatId = customChatId || ZALO_CHAT_ID;

  if (!token || !chatId) {
    espManager.addLog('zalo_error', 'Không thể gửi tin nhắn Zalo: Thiếu Token hoặc Chat ID');
    return false;
  }

  const url = `${ZALO_API_URL}${token}/sendMessage`;
  try {
    const response = await axios.post(url, {
      chat_id: chatId,
      text: text
    }, {
      headers: { 'Content-Type': 'application/json' },
      timeout: 8000
    });

    espManager.addLog('zalo_sent', `💬 Đã gửi Zalo tới ${chatId}: ${text.substring(0, 40)}...`);
    return response.data;
  } catch (error) {
    espManager.addLog('zalo_error', `❌ Lỗi gửi Zalo API: ${error.message}`, error.response ? error.response.data : null);
    return false;
  }
}

/**
 * Xử lý tin nhắn từ Zalo Bot Webhook
 */
async function processZaloWebhook(payload) {
  espManager.addLog('zalo_webhook', '📩 Nhận Webhook từ Zalo', payload);

  let text = '';
  let chatId = ZALO_CHAT_ID;

  if (payload && payload.message && payload.message.text) {
    text = payload.message.text.trim();
    if (payload.message.chat && payload.message.chat.id) {
      chatId = payload.message.chat.id;
    }
  } else if (payload && payload.text) {
    text = payload.text.trim();
    if (payload.chat_id) chatId = payload.chat_id;
  } else {
    return { success: false, reason: 'Invalid payload format' };
  }

  const lowerText = text.toLowerCase();

  // Câu lệnh 1: Kiểm tra IP & Trạng thái ESP32
  if (lowerText.includes('status') || lowerText.includes('ip') || lowerText.includes('trang thai') || lowerText.includes('trạng thái')) {
    const status = espManager.getEspStatus();
    let reply = `🤖 BÁO CÁO TRẠNG THÁI MẠCH ESP32:\n\n`;
    reply += `🌐 IP Hiện Tại: ${status.ip || 'Chưa nhận diện'}\n`;
    reply += `🔄 IP Trước Đó: ${status.previousIp || 'Chưa có'}\n`;
    reply += `📡 Trạng Thái: ${status.isOnline ? '🟢 ONLINE (Hoạt động tốt)' : '🔴 OFFLINE (Mất kết nối)'}\n`;
    reply += `⏱ Lần Ping Cuối: ${status.secondsSinceLastPing !== null ? status.secondsSinceLastPing + 's trước' : 'Chưa có'}\n`;
    reply += `📥 Lệnh Đang Chờ ESP Lấy: ${status.pendingQueueLength} lệnh`;
    
    await sendZaloMessage(reply, chatId);
    return { success: true, command: 'status' };
  }

  // Câu lệnh 2: Xem danh sách lịch 21 cữ thuốc
  if (lowerText.includes('lich') || lowerText.includes('lịch') || lowerText.includes('danh sach')) {
    const alarms = espManager.getAlarms();
    let reply = `📋 LỊCH UỐNG THUỐC HIỆN TẠI (21 CỮ):\n`;
    
    const dayNames = espManager.DAY_NAMES;
    dayNames.forEach((day, dIdx) => {
      reply += `\n📌 ${day}:\n`;
      const sessions = ['Sáng', 'Trưa', 'Chiều'];
      sessions.forEach((sess, sIdx) => {
        const id = dIdx * 3 + sIdx;
        const a = alarms[id];
        const timeStr = `${String(a.h).padStart(2, '0')}:${String(a.m).padStart(2, '0')}`;
        reply += `  • ${sess}: ${timeStr} [${a.en ? 'BẬT' : 'TẮT'}]\n`;
      });
    });

    await sendZaloMessage(reply, chatId);
    return { success: true, command: 'schedule' };
  }

  // Câu lệnh 3: Hướng dẫn sử dụng
  if (lowerText.includes('help') || lowerText.includes('tro giup') || lowerText.includes('hướng dẫn')) {
    let reply = `💡 HƯỚNG DẪN ĐỔI GIỜ UỐNG THUỐC QUA ZALO:\n\n`;
    reply += `Cú pháp đổi giờ:\n`;
    reply += `👉 [Thứ] [Cữ] [Giờ:Phút] [Bật/Tắt]\n\n`;
    reply += `Ví dụ:\n`;
    reply += `• T2 Sang 08:30 Bat -> Đặt Thứ 2 Sáng 08:30 Bật\n`;
    reply += `• T3 Trua 12:00 Tat -> Đặt Thứ 3 Trưa 12:00 Tắt\n`;
    reply += `• CN Chieu 18:00 -> Đặt Chủ Nhật Chiều 18:00\n\n`;
    reply += `Các câu lệnh khác:\n`;
    reply += `• Status / IP -> Xem trạng thái ESP32 & IP\n`;
    reply += `• Lich -> Xem toàn bộ 21 cữ thuốc`;

    await sendZaloMessage(reply, chatId);
    return { success: true, command: 'help' };
  }

  // Câu lệnh 4: Đổi giờ uống thuốc (Parse cú pháp text)
  const parsed = parseAlarmCommand(text);
  if (parsed) {
    espManager.queueAlarmUpdate(parsed.id, parsed.h, parsed.m, parsed.en);
    const timeBuf = `${String(parsed.h).padStart(2, '0')}:${String(parsed.m).padStart(2, '0')}`;
    const slotName = espManager.getSlotName(parsed.id);

    let reply = `✅ ĐÃ GHI NHẬN LỆNH ĐỔI GIỜ!\n\n`;
    reply += `📍 Cữ Thuốc: ${slotName}\n`;
    reply += `⏰ Giờ Mới: ${timeBuf}\n`;
    reply += `⚙️ Trạng Thái: ${parsed.en ? 'BẬT' : 'TẮT'}\n\n`;
    reply += `👉 Lệnh đã được đưa vào hàng đợi server. ESP32 sẽ rút lệnh về cập nhật trong 3 giây (qua /esp-pull).`;

    await sendZaloMessage(reply, chatId);
    return { success: true, command: 'set_alarm', parsed };
  }

  await sendZaloMessage(`❓ Lệnh không hợp lệ. Hãy soạn "Help" hoặc "Lich" để xem hướng dẫn!`, chatId);
  return { success: false, reason: 'Unknown command' };
}

function parseAlarmCommand(text) {
  const dayMatch = text.match(/(t2|t3|t4|t5|t6|t7|cn|thứ 2|thứ 3|thứ 4|thứ 5|thứ 6|thứ 7|chủ nhật)/i);
  const sessMatch = text.match(/(sang|sáng|sa|trua|trưa|tr|chieu|chiều|ch)/i);
  const timeMatch = text.match(/(\d{1,2})[:hH\s](\d{2})/);

  if (!dayMatch || !sessMatch || !timeMatch) return null;

  let dayIdx = -1;
  const dStr = dayMatch[1].toLowerCase();
  if (dStr.includes('2') || dStr.includes('t2')) dayIdx = 0;
  else if (dStr.includes('3') || dStr.includes('t3')) dayIdx = 1;
  else if (dStr.includes('4') || dStr.includes('t4')) dayIdx = 2;
  else if (dStr.includes('5') || dStr.includes('t5')) dayIdx = 3;
  else if (dStr.includes('6') || dStr.includes('t6')) dayIdx = 4;
  else if (dStr.includes('7') || dStr.includes('t7')) dayIdx = 5;
  else if (dStr.includes('cn') || dStr.includes('chủ nhật')) dayIdx = 6;

  let sessIdx = -1;
  const sStr = sessMatch[1].toLowerCase();
  if (sStr.includes('sang') || sStr.includes('sáng') || sStr === 'sa') sessIdx = 0;
  else if (sStr.includes('trua') || sStr.includes('trưa') || sStr === 'tr') sessIdx = 1;
  else if (sStr.includes('chieu') || sStr.includes('chiều') || sStr === 'ch') sessIdx = 2;

  if (dayIdx === -1 || sessIdx === -1) return null;

  const id = dayIdx * 3 + sessIdx;
  const h = parseInt(timeMatch[1], 10);
  const m = parseInt(timeMatch[2], 10);

  if (h < 0 || h > 23 || m < 0 || m > 59) return null;

  let en = true;
  if (/tat|tắt|off|0/i.test(text)) {
    en = false;
  }

  return { id, h, m, en };
}

module.exports = {
  sendZaloMessage,
  processZaloWebhook
};
