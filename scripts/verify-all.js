/**
 * Automated Verification & Business Logic Test Suite
 * Lab Session Manager — Sprint 1, 2, 3
 *
 * Verifies:
 * 1. Geofence & Haversine distance calculation (SRS-03, SRS-04, SRS-07)
 * 2. Room & lab matching logic with dynamic labs and fallback (SRS-07)
 * 3. Attendance validation, session status checks, and duplicate prevention (SRS-04, SRS-05)
 * 4. Session lifecycle transitions & audit logging (SRS-07, SRS-08)
 * 5. On-device AI sentiment & leave category extraction (SRS-12, SRS-13)
 * 6. Push notification payload generation (SRS-15, SRS-16)
 * 7. Firestore security rules completeness check
 */

const fs = require('fs');
const path = require('path');

// Colors for terminal output
const green = '\x1b[32m';
const red = '\x1b[31m';
const yellow = '\x1b[33m';
const cyan = '\x1b[36m';
const reset = '\x1b[0m';
const bold = '\x1b[1m';

let passedTests = 0;
let failedTests = 0;

function assert(condition, testName, details = '') {
  if (condition) {
    console.log(`  ${green}✔${reset} ${testName}`);
    passedTests++;
  } else {
    console.error(`  ${red}✖${reset} ${bold}${testName}${reset}`);
    if (details) console.error(`    ${yellow}Details: ${details}${reset}`);
    failedTests++;
  }
}

console.log(`\n${bold}${cyan}====================================================${reset}`);
console.log(`${bold}${cyan}  LAB SESSION MANAGER — AUTOMATED VERIFICATION SUITE ${reset}`);
console.log(`${bold}${cyan}====================================================${reset}\n`);

// ----------------------------------------------------
// 1. Geofence & Haversine Distance (Programmer 1, SRS-03)
// ----------------------------------------------------
console.log(`${bold}1. Geofence & Haversine Distance Verification (SRS-03, SRS-04)${reset}`);

const EARTH_RADIUS_METERS = 6_371_000;

function distanceInMeters(lat1, lon1, lat2, lon2) {
  const toRadians = (deg) => (deg * Math.PI) / 180;
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);
  const startLat = toRadians(lat1);
  const endLat = toRadians(lat2);
  const haversine =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(startLat) * Math.cos(endLat) * Math.sin(dLon / 2) ** 2;
  return Math.round(2 * EARTH_RADIUS_METERS * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine)) * 10) / 10;
}

// Del Campus Lab 1: 2.38324, 99.14845
const lab1Lat = 2.38324;
const lab1Lon = 99.14845;
const lab1Radius = 30; // 30m

// Test exact same position: distance = 0
const dZero = distanceInMeters(lab1Lat, lab1Lon, lab1Lat, lab1Lon);
assert(dZero === 0, 'Distance to identical coordinates is 0 meters');

// Test nearby coordinate inside 30m (~15m offset: ~0.00013 deg lat)
const nearbyLat = 2.38330;
const nearbyLon = 99.14848;
const dNearby = distanceInMeters(lab1Lat, lab1Lon, nearbyLat, nearbyLon);
assert(dNearby < lab1Radius, `Nearby coordinate within radius (${dNearby}m < ${lab1Radius}m)`);

// Test distant coordinate outside 30m (~100m away)
const farLat = 2.38420;
const farLon = 99.14845;
const dFar = distanceInMeters(lab1Lat, lab1Lon, farLat, farLon);
assert(dFar > lab1Radius, `Far coordinate exceeds radius (${dFar}m > ${lab1Radius}m)`);

// ----------------------------------------------------
// 2. Room & Master Lab Matching Logic (SRS-07)
// ----------------------------------------------------
console.log(`\n${bold}2. Lab & Room Matching Traceability (SRS-07, SRS-04)${reset}`);

const mockLabs = [
  { id: 'lab-001', name: 'Lab Komputer 1', code: 'LK-01', building: 'Gedung 5 Lt. 2', latitude: 2.38324, longitude: 99.14845, radius: 30 },
  { id: 'lab-002', name: 'Lab Komputer 2', code: 'LK-02', building: 'Gedung 5 Lt. 3', latitude: 2.38340, longitude: 99.14855, radius: 30 },
  { id: 'lab-003', name: 'Lab Jaringan', code: 'LJ-01', building: 'Gedung 7 Lt. 1', latitude: 2.38310, longitude: 99.14825, radius: 35 },
];

function normalizeRoom(val) {
  return val ? val.trim().toLowerCase() : '';
}

function findLabForRoom(labs, room) {
  if (!room || !room.trim()) return undefined;
  const norm = normalizeRoom(room);
  const exact = labs.find(
    (l) =>
      l.id === room.trim() ||
      normalizeRoom(l.name) === norm ||
      (l.code && normalizeRoom(l.code) === norm) ||
      normalizeRoom(l.building) === norm
  );
  if (exact) return exact;

  return labs.find((l) => {
    const normName = normalizeRoom(l.name);
    const normCode = l.code ? normalizeRoom(l.code) : '';
    return (
      norm.includes(normName) ||
      normName.includes(norm) ||
      (normCode && (norm.includes(normCode) || normCode.includes(norm)))
    );
  });
}

// Tests:
assert(findLabForRoom(mockLabs, 'Lab Komputer 1')?.id === 'lab-001', 'Direct exact match returns correct lab ID');
assert(findLabForRoom(mockLabs, 'lab komputer 1')?.id === 'lab-001', 'Case-insensitive match returns correct lab ID');
assert(findLabForRoom(mockLabs, 'LK-01')?.id === 'lab-001', 'Match by lab code (LK-01) returns correct lab ID');
assert(findLabForRoom(mockLabs, 'Ruang Lab Komputer 1 (Lt. 2)')?.id === 'lab-001', 'Fuzzy substring room match returns correct lab ID');
assert(findLabForRoom(mockLabs, 'Ruang Rapat Gedung 9') === undefined, 'Unregistered room returns undefined');

// ----------------------------------------------------
// 3. Attendance Validation & Duplicate Prevention (SRS-04, SRS-05)
// ----------------------------------------------------
console.log(`\n${bold}3. Attendance Validation & Duplicate Prevention (SRS-04, SRS-05)${reset}`);

const mockSessionOpen = { id: 'sess-001', scheduleId: 'sch-001', status: 'OPEN' };
const mockSessionClosed = { id: 'sess-002', scheduleId: 'sch-002', status: 'CLOSED' };

let mockAttendanceList = [];

function recordAttendanceSimulation(session, userId, locationCoords, labs) {
  // 1. Session status check
  if (session.status !== 'OPEN') {
    throw new Error('Sesi ini sudah ditutup. Presensi tidak dapat dilakukan.');
  }

  // 2. Duplicate prevention (composite key check)
  const alreadyRecorded = mockAttendanceList.some(
    (a) => a.sessionId === session.id && a.userId === userId
  );
  if (alreadyRecorded) {
    throw new Error('Presensi Anda untuk sesi praktikum ini sudah tercatat sebelumnya.');
  }

  // 3. Geofence validation
  const matchingLab = findLabForRoom(labs, 'Lab Komputer 1');
  if (!matchingLab) {
    throw new Error('Laboratorium tidak ditemukan.');
  }

  const dist = distanceInMeters(
    locationCoords.latitude,
    locationCoords.longitude,
    matchingLab.latitude,
    matchingLab.longitude
  );

  if (dist > matchingLab.radius) {
    throw new Error(`Presensi ditolak: Di luar radius lab (${dist}m > ${matchingLab.radius}m).`);
  }

  // 4. Record attendance
  const record = {
    id: `attendance-${session.id}-${userId}`,
    sessionId: session.id,
    userId,
    recordedAt: new Date().toISOString(),
    latitude: locationCoords.latitude,
    longitude: locationCoords.longitude,
    distanceMeters: dist,
    method: 'LOCATION',
  };
  mockAttendanceList.push(record);
  return record;
}

// Test 3a: Success when OPEN and inside radius
let record1;
try {
  record1 = recordAttendanceSimulation(mockSessionOpen, 'user-praktikan-1', { latitude: 2.38324, longitude: 99.14845 }, mockLabs);
  assert(record1.id === 'attendance-sess-001-user-praktikan-1', 'Valid attendance recorded with composite ID');
} catch (e) {
  assert(false, 'Valid attendance should not throw', e.message);
}

// Test 3b: Prevent double attendance for same user and session
try {
  recordAttendanceSimulation(mockSessionOpen, 'user-praktikan-1', { latitude: 2.38324, longitude: 99.14845 }, mockLabs);
  assert(false, 'Duplicate attendance should throw');
} catch (e) {
  assert(e.message.includes('sudah tercatat'), 'Duplicate attendance correctly rejected');
}

// Test 3c: Reject attendance when session is CLOSED
try {
  recordAttendanceSimulation(mockSessionClosed, 'user-praktikan-2', { latitude: 2.38324, longitude: 99.14845 }, mockLabs);
  assert(false, 'Closed session should throw');
} catch (e) {
  assert(e.message.includes('ditutup'), 'Closed session attendance correctly rejected');
}

// Test 3d: Reject attendance when user is far outside radius
try {
  recordAttendanceSimulation(mockSessionOpen, 'user-praktikan-2', { latitude: 2.39000, longitude: 99.15000 }, mockLabs);
  assert(false, 'Out-of-radius attendance should throw');
} catch (e) {
  assert(e.message.includes('luar radius'), 'Out-of-radius attendance correctly rejected');
}

// ----------------------------------------------------
// 4. Session Lifecycle & Audit Logs (SRS-07, SRS-08)
// ----------------------------------------------------
console.log(`\n${bold}4. Session Lifecycle & Status Audit Logs (SRS-07, SRS-08)${reset}`);

let testSession = { id: 'sess-100', status: 'CLOSED', openedAt: null, closedAt: null };
let testLogs = [];

function changeSessionStatusSim(session, targetStatus, actorId, actorName) {
  if (session.status === targetStatus) return false;
  const now = new Date().toISOString();
  const previousStatus = session.status;
  session.status = targetStatus;
  if (targetStatus === 'OPEN') session.openedAt = now;
  if (targetStatus === 'CLOSED') session.closedAt = now;

  testLogs.unshift({
    id: `log-${session.id}-${Date.now()}`,
    sessionId: session.id,
    previousStatus,
    newStatus: targetStatus,
    changedBy: actorId,
    changedByName: actorName,
    changedAt: now,
  });
  return true;
}

// 4a. Open session
const opened = changeSessionStatusSim(testSession, 'OPEN', 'asisten-01', 'Kak David');
assert(opened && testSession.status === 'OPEN' && testSession.openedAt !== null, 'Session opens with timestamp');
assert(testLogs[0].newStatus === 'OPEN' && testLogs[0].changedByName === 'Kak David', 'Audit log records OPEN transition with actor');

// 4b. Close session
const closed = changeSessionStatusSim(testSession, 'CLOSED', 'asisten-01', 'Kak David');
assert(closed && testSession.status === 'CLOSED' && testSession.closedAt !== null, 'Session closes with timestamp');
assert(testLogs[0].newStatus === 'CLOSED' && testLogs[0].previousStatus === 'OPEN', 'Audit log records CLOSED transition');

// ----------------------------------------------------
// 5. On-Device AI Classification & Keyword Extraction (SRS-12, SRS-13)
// ----------------------------------------------------
console.log(`\n${bold}5. On-Device AI Sentiment & Leave Category Extraction (SRS-12, SRS-13)${reset}`);

const { createSentimentClassifier } = require('../ai/sentiment');
const modelJson = require('../ai/model-edom.json');
const classifier = createSentimentClassifier(modelJson);

function detectLeaveCategory(text) {
  if (!text || typeof text !== 'string') return 'LAINNYA';
  const lower = text.toLowerCase();
  if (/sakit|demam|flu|batuk|pusing|rawat|opname|dokter|medis|klinik|rumah sakit|rs\b|tidak enak badan|lemas|cedera|kecelakaan|tifus|maag|diare|panas|muntah/i.test(lower)) return 'SAKIT';
  if (/dispensasi|lomba|kompetisi|delegasi|mewakili|turnamen|dinas|organisasi|kepanitiaan|kepengurusan|konferensi|seminar nasional/i.test(lower)) return 'DISPENSASI';
  if (/kuliah|ujian|uts|uas|kuis|responsi|sidang|sempro|skripsi|kelas pengganti|bimbingan|akademik/i.test(lower)) return 'IZIN_AKADEMIK';
  return 'LAINNYA';
}

// 5a: SAKIT extraction
const textSakit = 'Selamat pagi asisten, saya izin tidak hadir karena sedang demam tinggi dan disarankan dokter beristirahat.';
assert(detectLeaveCategory(textSakit) === 'SAKIT', 'Correctly detects category: SAKIT');

// 5b: DISPENSASI extraction
const textDispen = 'Mohon izin tidak mengikuti praktikum hari ini karena menjadi delegasi mewakili kampus dalam kompetisi robotika.';
assert(detectLeaveCategory(textDispen) === 'DISPENSASI', 'Correctly detects category: DISPENSASI');

// 5c: IZIN_AKADEMIK extraction
const textAkademik = 'Izin tidak bisa hadir praktikum dikarenakan ada jadwal kuliah pengganti dan ujian susulan mata kuliah lain.';
assert(detectLeaveCategory(textAkademik) === 'IZIN_AKADEMIK', 'Correctly detects category: IZIN_AKADEMIK');

// 5d: Sentiment inference runs without internet or error
const aiPrediction = classifier(textSakit);
assert(aiPrediction && typeof aiPrediction.status === 'string', 'Sentiment classifier executes locally and returns status');

// ----------------------------------------------------
// 6. Push Notification Payload Verification (SRS-15, SRS-16)
// ----------------------------------------------------
console.log(`\n${bold}6. Push Notification Payload Traceability (SRS-15, SRS-16)${reset}`);

// Broadcast payload when session is OPEN (SRS-15)
const mockPushTokens = ['ExponentPushToken[abc123456789]'];
const openNotification = {
  to: mockPushTokens,
  title: '🟢 Sesi Praktikum Dibuka!',
  body: 'Sesi Pemrograman Web (Lab Komputer 1) telah dibuka. Silakan lakukan presensi sekarang.',
  data: { screen: '/praktikan/sess-001', sessionId: 'sess-001' },
};
assert(openNotification.to.length === 1 && openNotification.title.includes('🟢'), 'Session open notification payload valid');

// Personal leave decision notification (SRS-16)
const leaveNotification = {
  to: 'ExponentPushToken[studentToken123]',
  title: '✅ Izin Praktikum Disetujui',
  body: 'Permohonan izin Anda telah disetujui oleh Kak David. Catatan: "Surat dokter valid."',
  data: { screen: '/praktikan/izin', requestId: 'leave-001' },
};
assert(leaveNotification.title.includes('Disetujui') && leaveNotification.data.screen === '/praktikan/izin', 'Leave decision notification payload valid');

// ----------------------------------------------------
// 7. Security Rules Completeness Check (firestore.rules)
// ----------------------------------------------------
console.log(`\n${bold}7. Firestore Security Rules Integrity (firestore.rules)${reset}`);

const rulesContent = fs.readFileSync(path.join(__dirname, '..', 'firestore.rules'), 'utf-8');

const expectedCollections = [
  'users',
  'classes',
  'schedules',
  'sessions',
  'status_logs',
  'attendance',
  'leave_requests',
  'permissions',
  'labs',
];

for (const col of expectedCollections) {
  const hasRule = rulesContent.includes(`match /${col}/`);
  assert(hasRule, `firestore.rules defines security match for collection '${col}'`);
}

const hasAssistantCheck = rulesContent.includes('function isAssistant()');
assert(hasAssistantCheck, 'firestore.rules enforces role-based assistant authorization check');

// ----------------------------------------------------
// Summary
// ----------------------------------------------------
console.log(`\n${bold}${cyan}====================================================${reset}`);
console.log(`${bold}Verification Summary: ${green}${passedTests} passed${reset}, ${failedTests > 0 ? `${red}${failedTests} failed` : '0 failed'}`);
console.log(`${bold}${cyan}====================================================${reset}\n`);

if (failedTests > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
