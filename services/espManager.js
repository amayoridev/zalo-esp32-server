const { ESP_OFFLINE_THRESHOLD_SEC } = require('../config');

// Names for 21 slots (7 days x 3 sessions)
const DAY_NAMES = ['Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7', 'Chủ Nhật'];
const SESSION_NAMES = ['Sáng', 'Trưa', 'Chiều'];

function getSlotName(id) {
  const dayIdx = Math.floor(id / 3);
  const sessIdx = id % 3;
  if (dayIdx >= 0 && dayIdx < 7 && sessIdx >= 0 && sessIdx < 3) {
    return `${DAY_NAMES[dayIdx]} ${SESSION_NAMES[sessIdx]}`;
  }
  return `Cữ ${id}`;
}

// In-Memory State for ESP32 Connection & IP Recording
let espState = {
  ip: null,
  previousIp: null,
  lastPingTime: null,
  pingCount: 0,
  pullCount: 0,
  connectedSince: null
};

// Pending Queue for Command Pulling (Solves No Port Forwarding / CGNAT problem)
let pendingQueue = [];

// 21 Alarm slots state mirror on server
let alarmSchedule = Array.from({ length: 21 }, (_, i) => ({
  id: i,
  h: 7,
  m: 0,
  en: false,
  slotName: getSlotName(i)
}));

// Logs memory buffer
let systemLogs = [];

function addLog(type, message, details = null) {
  const timestamp = new Date().toISOString();
  const logEntry = { id: Date.now() + Math.random(), timestamp, type, message, details };
  systemLogs.unshift(logEntry);
  if (systemLogs.length > 100) {
    systemLogs.pop();
  }
  console.log(`[${timestamp}] [${type.toUpperCase()}] ${message}`, details ? JSON.stringify(details) : '');
}

/**
 * Ghi nhận & Ghi đè IP của ESP32 khi nhận request từ ESP32
 */
function recordEspActivity(clientIp, action = 'PING') {
  let cleanIp = clientIp || 'Unknown';
  if (cleanIp.startsWith('::ffff:')) {
    cleanIp = cleanIp.replace('::ffff:', '');
  }

  const now = new Date();
  
  // Nếu phát hiện IP mới -> Ghi đè IP cũ
  if (espState.ip !== cleanIp) {
    espState.previousIp = espState.ip;
    espState.ip = cleanIp;
    addLog('ip_change', `⚠️ Đã phát hiện IP mới từ ESP32: ${cleanIp} (Ghi đè IP cũ: ${espState.previousIp || 'Chưa có'})`, {
      newIp: cleanIp,
      oldIp: espState.previousIp
    });
  }

  if (!espState.connectedSince) {
    espState.connectedSince = now;
  }

  espState.lastPingTime = now;
  if (action === 'PING') {
    espState.pingCount++;
    addLog('ping', `📡 ESP32 đã Ping server thành công từ IP: ${cleanIp}`);
  } else if (action === 'PULL') {
    espState.pullCount++;
  }
}

/**
 * Thêm lệnh đổi giờ vào hàng đợi (Pending Queue) cho ESP32 rút về qua /esp-pull
 */
function queueAlarmUpdate(id, h, m, en) {
  if (id < 0 || id >= 21) return false;

  const slotName = getSlotName(id);
  const hour = parseInt(h, 10);
  const minute = parseInt(m, 10);
  const active = Boolean(en);

  // Cập nhật bộ nhớ trên Server
  alarmSchedule[id] = { id, h: hour, m: minute, en: active, slotName };

  const formattedTime = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
  const existingIdx = pendingQueue.findIndex(cmd => cmd.id === id);
  const commandItem = { id, h: hour, m: minute, en: active, slotName };

  if (existingIdx >= 0) {
    pendingQueue[existingIdx] = commandItem;
  } else {
    pendingQueue.push(commandItem);
  }

  addLog('alarm_queue', `➕ Đã thêm lệnh cập nhật: ${slotName} -> ${formattedTime} (${active ? 'BẬT' : 'TẮT'})`, commandItem);
  return true;
}

/**
 * ESP32 gọi GET /esp-pull -> Xả hàng đợi lệnh gửi cho ESP32
 */
function popPendingQueue() {
  if (pendingQueue.length === 0) return [];
  const commands = [...pendingQueue];
  pendingQueue = [];
  addLog('queue_flush', `📤 Đã chuyển ${commands.length} lệnh cài đặt sang ESP32 qua polling /esp-pull`, commands);
  return commands;
}

function getEspStatus() {
  const now = new Date();
  let isOnline = false;
  let secondsSinceLastPing = null;

  if (espState.lastPingTime) {
    secondsSinceLastPing = Math.floor((now - espState.lastPingTime) / 1000);
    isOnline = secondsSinceLastPing <= ESP_OFFLINE_THRESHOLD_SEC;
  }

  return {
    isOnline,
    ip: espState.ip,
    previousIp: espState.previousIp,
    lastPingTime: espState.lastPingTime ? espState.lastPingTime.toISOString() : null,
    secondsSinceLastPing,
    pingCount: espState.pingCount,
    pullCount: espState.pullCount,
    pendingQueueLength: pendingQueue.length,
    pendingQueue: pendingQueue,
    connectedSince: espState.connectedSince ? espState.connectedSince.toISOString() : null
  };
}

function getAlarms() { return alarmSchedule; }
function getLogs() { return systemLogs; }

module.exports = {
  getSlotName,
  recordEspActivity,
  queueAlarmUpdate,
  popPendingQueue,
  getEspStatus,
  getAlarms,
  getLogs,
  addLog,
  DAY_NAMES,
  SESSION_NAMES
};
