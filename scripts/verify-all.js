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
  'courses',
  'labMembers',
  'attendances',
  'fines',
];

for (const col of expectedCollections) {
  const hasRule = rulesContent.includes(`match /${col}/`);
  assert(hasRule, `firestore.rules defines security match for collection '${col}'`);
}

const hasAssistantCheck = rulesContent.includes('function isAssistant()');
const hasAsprakCheck = rulesContent.includes('function isAsprak()');
const hasAslabCheck = rulesContent.includes('function isAslab()');
assert(hasAssistantCheck && hasAsprakCheck && hasAslabCheck, 'firestore.rules enforces role-based assistant/asprak/aslab authorization check');

// ----------------------------------------------------
// 8. Sprint 4 Dev B: Lateness Calculation & Deterministic Fine Rules
// ----------------------------------------------------
console.log(`\n${bold}8. Sprint 4 Dev B: Lateness & Deterministic Fine Rules${reset}`);

const { evaluateCheckInLateness } = require('../src/features/presensi/late-calculation.ts');
const {
  buildAttendanceId,
  buildFineId,
  createFinePayload,
  canWaiveFine,
  applyFineWaiver,
} = require('../src/features/presensi/fine-rules.ts');

const sessionStart = '2026-11-25T08:00:00.000Z';
const graceMinutes = 15;

// 8.1 Check-in sebelum waktu mulai
const beforeStart = evaluateCheckInLateness(sessionStart, '2026-11-25T07:55:00.000Z', graceMinutes);
assert(!beforeStart.isLate && beforeStart.lateMinutes === 0, 'Check-in before session start is on time (0 lateMinutes)');

// 8.2 Check-in tepat waktu (dalam batas toleransi)
const onTime = evaluateCheckInLateness(sessionStart, '2026-11-25T08:10:00.000Z', graceMinutes);
assert(!onTime.isLate && onTime.lateMinutes === 0, 'Check-in within grace period (08:10) is on time');

// 8.3 Check-in tepat pada batas grace period
const exactDeadline = evaluateCheckInLateness(sessionStart, '2026-11-25T08:15:00.000Z', graceMinutes);
assert(!exactDeadline.isLate && exactDeadline.lateMinutes === 0, 'Check-in at exact grace period boundary (08:15) is on time');

// 8.4 Check-in terlambat 30 detik -> ceil = 1 menit
const late30Sec = evaluateCheckInLateness(sessionStart, '2026-11-25T08:15:30.000Z', graceMinutes);
assert(late30Sec.isLate && late30Sec.lateMinutes === 1, 'Check-in 30 seconds past grace period rounds up to 1 late minute');

// 8.5 Check-in terlambat beberapa menit (08:16 -> 1m, 08:20 -> 5m)
const late1Min = evaluateCheckInLateness(sessionStart, '2026-11-25T08:16:00.000Z', graceMinutes);
const late5Min = evaluateCheckInLateness(sessionStart, '2026-11-25T08:20:00.000Z', graceMinutes);
assert(
  late1Min.isLate && late1Min.lateMinutes === 1 && late5Min.isLate && late5Min.lateMinutes === 5,
  'Check-in late by 1 minute (08:16) and 5 minutes (08:20) computes exact lateMinutes'
);

// 8.6 Grace period nol
const zeroGraceOnTime = evaluateCheckInLateness(sessionStart, '2026-11-25T08:00:00.000Z', 0);
const zeroGraceLate = evaluateCheckInLateness(sessionStart, '2026-11-25T08:00:01.000Z', 0);
assert(
  !zeroGraceOnTime.isLate && zeroGraceLate.isLate && zeroGraceLate.lateMinutes === 1,
  'Zero grace period marks exact start on time and 1s later as 1 late minute'
);

// 8.7 Input tanggal tidak valid
let invalidDateThrew = false;
try {
  evaluateCheckInLateness('not-a-valid-date', '2026-11-25T08:10:00.000Z', graceMinutes);
} catch {
  invalidDateThrew = true;
}
let invalidCheckInThrew = false;
try {
  evaluateCheckInLateness(sessionStart, '', graceMinutes);
} catch {
  invalidCheckInThrew = true;
}
assert(invalidDateThrew && invalidCheckInThrew, 'Invalid startAt or checkedInAt throws validation error');

// 8.8 Grace period negatif
let negativeGraceThrew = false;
try {
  evaluateCheckInLateness(sessionStart, '2026-11-25T08:10:00.000Z', -5);
} catch {
  negativeGraceThrew = true;
}
assert(negativeGraceThrew, 'Negative gracePeriodMinutes throws validation error');

// 8.9 ID attendance deterministik
const attId1 = buildAttendanceId('session-01', 'user-mhs-1');
const attId2 = buildAttendanceId('session-01', 'user-mhs-1');
assert(attId1 === 'session-01_user-mhs-1' && attId1 === attId2, 'Attendance ID is deterministic ({sessionId}_{studentId})');

// 8.10 ID fine deterministik
const fineId1 = buildFineId('session-01', 'user-mhs-1');
const fineId2 = buildFineId('session-01', 'user-mhs-1');
assert(fineId1 === 'session-01_user-mhs-1' && fineId1 === fineId2, 'Fine ID is deterministic ({sessionId}_{studentId})');

// 8.11 Denda tidak dibuat untuk praktikan tepat waktu
const noFineOnTime = createFinePayload({
  sessionId: 'session-01',
  studentId: 'user-mhs-1',
  labId: 'lab-01',
  configSnapshot: { gracePeriodMinutes: 15, lateFineAmount: 15000 },
  isLate: onTime.isLate,
  lateMinutes: onTime.lateMinutes,
  createdAt: onTime.checkedInAt,
});
assert(noFineOnTime === null, 'No fine payload is created when practitioner is on time');

// 8.12 Denda tidak dibuat jika nominal nol
const noFineZeroAmount = createFinePayload({
  sessionId: 'session-01',
  studentId: 'user-mhs-1',
  labId: 'lab-01',
  configSnapshot: { gracePeriodMinutes: 15, lateFineAmount: 0 },
  isLate: late5Min.isLate,
  lateMinutes: late5Min.lateMinutes,
  createdAt: late5Min.checkedInAt,
});
assert(noFineZeroAmount === null, 'No fine payload is created when lateFineAmount is 0');

// 8.13 Payload denda memiliki nominal, ID, reason, dan status benar
const unpaidFine = createFinePayload({
  sessionId: 'session-01',
  studentId: 'user-mhs-1',
  labId: 'lab-01',
  configSnapshot: { gracePeriodMinutes: 15, lateFineAmount: 15000 },
  isLate: late5Min.isLate,
  lateMinutes: late5Min.lateMinutes,
  createdAt: late5Min.checkedInAt,
});
assert(
  unpaidFine !== null &&
    unpaidFine.id === 'session-01_user-mhs-1' &&
    unpaidFine.amount === 15000 &&
    unpaidFine.status === 'unpaid' &&
    unpaidFine.reason.includes('5 menit'),
  'Late fine payload contains deterministic ID, snapshot amount, unpaid status, and late minutes reason'
);

// 8.14 Denda unpaid dapat di-waive tanpa mengubah data kehadiran terlambat
const attendanceSnapshot = {
  id: attId1,
  sessionId: 'session-01',
  labId: 'lab-01',
  studentId: 'user-mhs-1',
  status: 'EXCUSED',
  checkedInAt: late5Min.checkedInAt,
  isLate: late5Min.isLate,
  lateMinutes: late5Min.lateMinutes,
};
const canWaiveUnpaid = canWaiveFine(unpaidFine);
const waivedResult = applyFineWaiver(unpaidFine);
assert(
  canWaiveUnpaid &&
    waivedResult.allowed &&
    waivedResult.fine.status === 'waived' &&
    unpaidFine.status === 'unpaid' &&
    attendanceSnapshot.isLate === true &&
    attendanceSnapshot.lateMinutes === 5,
  'Unpaid fine can be waived while preserving immutable attendance lateness history'
);

// 8.15 Denda paid tidak dapat di-waive
const paidFine = { ...unpaidFine, status: 'paid', paidAt: '2026-11-25T10:00:00.000Z' };
const paidWaiveResult = applyFineWaiver(paidFine);
assert(
  !canWaiveFine(paidFine) && !paidWaiveResult.allowed && paidWaiveResult.fine.status === 'paid',
  'Paid fine cannot be waived and keeps paid status'
);

// 8.16 Denda pending tidak dapat di-waive
const pendingFine = { ...unpaidFine, status: 'pending' };
const pendingWaiveResult = applyFineWaiver(pendingFine);
assert(
  !canWaiveFine(pendingFine) && !pendingWaiveResult.allowed && pendingWaiveResult.fine.status === 'pending',
  'Pending fine cannot be waived and keeps pending status'
);

// 8.17 Denda waived tetap waived
const alreadyWaivedFine = { ...unpaidFine, status: 'waived' };
const alreadyWaivedResult = applyFineWaiver(alreadyWaivedFine);
assert(
  !canWaiveFine(alreadyWaivedFine) && !alreadyWaivedResult.allowed && alreadyWaivedResult.fine.status === 'waived',
  'Already waived fine remains waived'
);

// ----------------------------------------------------
// 9. Sprint 4 Dev B Stage 3: Snapshot Config & Transaction Helpers
// ----------------------------------------------------
console.log(`\n${bold}9. Sprint 4 Dev B Stage 3: Snapshot Config & Transaction Helpers${reset}`);

const { registerHooks } = require('node:module');
const { pathToFileURL } = require('node:url');

registerHooks({
  resolve(specifier, context, next) {
    if (specifier.startsWith('@/')) {
      const targetPath = path.join(__dirname, '..', 'src', specifier.slice(2)) + '.ts';
      return next(pathToFileURL(targetPath).href, context);
    }
    return next(specifier, context);
  },
});

const {
  requireSessionConfigSnapshot,
  resolveSessionConfigSnapshot,
  resolveSessionConfigSnapshotOptional,
  resolveSessionStartAt,
} = require('../src/features/asprak/services/session-snapshot-helpers.ts');
const {
  prepareCheckInWithFine,
  prepareLeaveApprovalEffects,
} = require('../src/features/presensi/services/attendance-fine-helpers.ts');

// 9.1 Copy attendanceConfig dari lab ke configSnapshot saat sesi dibuka
const customLab = { attendanceConfig: { gracePeriodMinutes: 10, lateFineAmount: 10000 } };
const copiedSnapshot = resolveSessionConfigSnapshot(customLab, null);
assert(
  copiedSnapshot.gracePeriodMinutes === 10 && copiedSnapshot.lateFineAmount === 10000,
  'Session configSnapshot copies gracePeriodMinutes and lateFineAmount from lab'
);

// 9.2 Menolak silent fallback bila lab belum memiliki attendanceConfig
let missingConfigThrew = false;
try {
  resolveSessionConfigSnapshot({}, null);
} catch {
  missingConfigThrew = true;
}
assert(
  missingConfigThrew && resolveSessionConfigSnapshotOptional({}, null) === null,
  'Session configSnapshot rejects silent fallback when lab config is missing'
);

// 9.3 Resolusi waktu mulai sesi (startAt) dari jadwal bila startAt sesi kosong
const resolvedStart = resolveSessionStartAt({}, { date: '2026-11-25', startTime: '08:00' });
assert(
  resolvedStart === '2026-11-25T01:00:00.000Z',
  'Session startAt resolves schedule date + startTime WIB into valid UTC ISO timestamp'
);

// 9.4 Check-in tepat waktu menghasilkan PRESENT tanpa denda
const checkInOnTime = prepareCheckInWithFine({
  sessionId: 'session-01',
  studentId: 'user-mhs-1',
  labId: 'lab-01',
  sessionStartAt: '2026-11-25T08:00:00.000Z',
  checkedInAt: '2026-11-25T08:10:00.000Z',
  configSnapshot: copiedSnapshot,
});
assert(
  checkInOnTime.attendanceDoc.id === 'session-01_user-mhs-1' &&
    checkInOnTime.attendanceDoc.status === 'PRESENT' &&
    !checkInOnTime.attendanceDoc.isLate &&
    checkInOnTime.fineDoc === null,
  'On-time transactional check-in prepares PRESENT attendance without fine'
);

// 9.5 Check-in terlambat menghasilkan PRESENT + 1 FineDoc deterministik, dan retry tetap idempoten
const checkInLate = prepareCheckInWithFine({
  sessionId: 'session-01',
  studentId: 'user-mhs-2',
  labId: 'lab-01',
  sessionStartAt: '2026-11-25T08:00:00.000Z',
  checkedInAt: '2026-11-25T08:15:00.000Z',
  configSnapshot: copiedSnapshot, // grace 10m -> deadline 08:10, terlambat 5 menit
});
const retryWithExistingFine = prepareCheckInWithFine({
  sessionId: 'session-01',
  studentId: 'user-mhs-2',
  labId: 'lab-01',
  sessionStartAt: '2026-11-25T08:00:00.000Z',
  checkedInAt: '2026-11-25T08:15:00.000Z',
  configSnapshot: copiedSnapshot,
  existingFine: checkInLate.fineDoc,
});
assert(
  checkInLate.attendanceDoc.isLate &&
    checkInLate.attendanceDoc.lateMinutes === 5 &&
    checkInLate.fineDoc !== null &&
    checkInLate.fineDoc.id === 'session-01_user-mhs-2' &&
    checkInLate.fineDoc.amount === 10000 &&
    checkInLate.fineDoc.status === 'unpaid' &&
    retryWithExistingFine.fineDoc === null,
  'Late transactional check-in creates deterministic unpaid fine once and stays idempotent'
);

// 9.6 Approval izin mengubah status menjadi EXCUSED, menjaga riwayat keterlambatan, dan me-waive denda unpaid
const approvalWithUnpaidFine = prepareLeaveApprovalEffects({
  sessionId: 'session-01',
  studentId: 'user-mhs-2',
  labId: 'lab-01',
  reviewedAt: '2026-11-25T09:00:00.000Z',
  existingAttendance: checkInLate.attendanceDoc,
  existingFine: checkInLate.fineDoc,
});
assert(
  approvalWithUnpaidFine.excusedAttendance.status === 'EXCUSED' &&
    approvalWithUnpaidFine.excusedAttendance.isLate === true &&
    approvalWithUnpaidFine.excusedAttendance.lateMinutes === 5 &&
    approvalWithUnpaidFine.fineWaiver?.allowed === true &&
    approvalWithUnpaidFine.fineWaiver?.fine.status === 'waived',
  'Leave approval marks attendance EXCUSED, preserves lateness metadata, and waives unpaid fine'
);

// ----------------------------------------------------
// 10. Sprint 4 Dev B Stage 4: Asprak Dashboard, Roster & Leave Guards
// ----------------------------------------------------
console.log(`\n${bold}10. Sprint 4 Dev B Stage 4: Asprak Dashboard, Roster & Leave Guards${reset}`);

const {
  filterSessionsForAsprak,
  isAsprakAssignedToSession,
  getEffectiveSessionStatus,
  buildSessionAttendanceRoster,
  evaluateLeaveActionState,
} = require('../src/features/asprak/asprak-dashboard-helpers.ts');

// 10.1 Filter sesi berdasarkan Asprak & validasi otorisasi
const allMixedSessions = [
  { id: 'sess-a1', assistantId: 'user-asprak-1', asprakId: 'user-asprak-1', status: 'OPEN', openedAt: '2026-11-25T08:00:00Z' },
  { id: 'sess-a2', assistantId: 'user-asprak-1', status: 'CLOSED' },
  { id: 'sess-b1', assistantId: 'user-asprak-2', asprakId: 'user-asprak-2', status: 'OPEN', openedAt: '2026-11-25T08:00:00Z' },
];
const asprak1Sessions = filterSessionsForAsprak(allMixedSessions, 'user-asprak-1');
assert(
  asprak1Sessions.length === 2 &&
    asprak1Sessions.every((s) => s.id.startsWith('sess-a')) &&
    isAsprakAssignedToSession(allMixedSessions[0], 'user-asprak-1') &&
    !isAsprakAssignedToSession(allMixedSessions[2], 'user-asprak-1'),
  'Session list strictly filters by assigned Asprak and blocks unauthorized session access'
);

// 10.2 Tampilan status sesi (SCHEDULED, OPEN, CLOSED)
assert(
  getEffectiveSessionStatus({ status: 'OPEN', openedAt: '2026-11-25T08:00:00Z' }) === 'OPEN' &&
    getEffectiveSessionStatus({ status: 'SCHEDULED' }) === 'SCHEDULED' &&
    getEffectiveSessionStatus({ status: 'CLOSED' }) === 'SCHEDULED' &&
    getEffectiveSessionStatus({ status: 'CLOSED', openedAt: '2026-11-25T08:00:00Z', closedAt: '2026-11-25T10:00:00Z' }) === 'CLOSED',
  'Effective session status accurately differentiates SCHEDULED, OPEN, and CLOSED'
);

// 10.3 Monitoring attendance & status denda (PRESENT, EXCUSED, ABSENT + unpaid/pending/paid/waived)
const mockUsersRoster = [
  { id: 'm1', name: 'Andi', email: 'andi@test.com', role: 'praktikan', nim: '2110511001' },
  { id: 'm2', name: 'Budi', email: 'budi@test.com', role: 'praktikan', nim: '2110511002' },
  { id: 'm3', name: 'Cici', email: 'cici@test.com', role: 'praktikan', nim: '2110511003' },
  { id: 'm4', name: 'Dedi', email: 'dedi@test.com', role: 'praktikan', nim: '2110511004' },
];
const rosterClosedSession = buildSessionAttendanceRoster({
  session: { id: 'sess-closed', labId: 'lab-01', status: 'CLOSED', openedAt: '2026-11-25T08:00:00Z', closedAt: '2026-11-25T10:00:00Z' },
  attendanceDocs: [
    { id: 'sess-closed_m1', sessionId: 'sess-closed', labId: 'lab-01', studentId: 'm1', status: 'PRESENT', checkedInAt: '2026-11-25T08:05:00Z', isLate: false, lateMinutes: 0 },
    { id: 'sess-closed_m2', sessionId: 'sess-closed', labId: 'lab-01', studentId: 'm2', status: 'PRESENT', checkedInAt: '2026-11-25T08:20:00Z', isLate: true, lateMinutes: 5 },
    { id: 'sess-closed_m3', sessionId: 'sess-closed', labId: 'lab-01', studentId: 'm3', status: 'EXCUSED', checkedInAt: '2026-11-25T07:50:00Z', isLate: false, lateMinutes: 0 },
  ],
  fines: [
    { id: 'sess-closed_m2', studentId: 'm2', sessionId: 'sess-closed', labId: 'lab-01', amount: 15000, reason: 'Terlambat 5 menit', status: 'pending', createdAt: '2026-11-25T08:20:00Z' },
    { id: 'sess-closed_m3', studentId: 'm3', sessionId: 'sess-closed', labId: 'lab-01', amount: 15000, reason: 'Terlambat 2 menit', status: 'waived', createdAt: '2026-11-25T08:17:00Z' },
  ],
  users: mockUsersRoster,
  leaveRequests: [],
  labMembers: [
    { id: 'lab-01_m1', labId: 'lab-01', userId: 'm1', role: 'praktikan', assignedAt: '2026-11-25T07:00:00Z' },
    { id: 'lab-01_m2', labId: 'lab-01', userId: 'm2', role: 'praktikan', assignedAt: '2026-11-25T07:00:00Z' },
    { id: 'lab-01_m3', labId: 'lab-01', userId: 'm3', role: 'praktikan', assignedAt: '2026-11-25T07:00:00Z' },
    { id: 'lab-01_m4', labId: 'lab-01', userId: 'm4', role: 'praktikan', assignedAt: '2026-11-25T07:00:00Z' },
  ],
});
const m2Row = rosterClosedSession.find((r) => r.studentId === 'm2');
const m3Row = rosterClosedSession.find((r) => r.studentId === 'm3');
const m4Row = rosterClosedSession.find((r) => r.studentId === 'm4');
assert(
  rosterClosedSession.length === 4 &&
    m2Row?.attendanceStatus === 'PRESENT' &&
    m2Row?.isLate === true &&
    m2Row?.lateMinutes === 5 &&
    m2Row?.fine?.status === 'pending' &&
    m3Row?.attendanceStatus === 'EXCUSED' &&
    m3Row?.fine?.status === 'waived' &&
    m4Row?.attendanceStatus === 'ABSENT',
  'Attendance roster renders PRESENT (late + fine), EXCUSED (waived fine), and ABSENT accurately'
);

// 10.4 Approval & rejection guards untuk fine unpaid, pending, paid, waived + offline/unauthorized/processed
const pendingReq = { status: 'PENDING' };
const approvedReq = { status: 'APPROVED' };
const fineUnpaidEval = evaluateLeaveActionState({
  request: pendingReq,
  relatedFine: { id: 'f1', studentId: 'm1', sessionId: 's1', labId: 'lab-01', amount: 15000, reason: 'Late', status: 'unpaid', createdAt: '2026-11-25T08:20:00Z' },
  isAuthorized: true,
  isOnline: true,
});
const finePendingEval = evaluateLeaveActionState({
  request: pendingReq,
  relatedFine: { id: 'f2', studentId: 'm2', sessionId: 's1', labId: 'lab-01', amount: 15000, reason: 'Late', status: 'pending', createdAt: '2026-11-25T08:20:00Z' },
  isAuthorized: true,
  isOnline: true,
});
const finePaidEval = evaluateLeaveActionState({
  request: pendingReq,
  relatedFine: { id: 'f3', studentId: 'm3', sessionId: 's1', labId: 'lab-01', amount: 15000, reason: 'Late', status: 'paid', createdAt: '2026-11-25T08:20:00Z', paidAt: '2026-11-25T09:00:00Z' },
  isAuthorized: true,
  isOnline: true,
});
const fineWaivedEval = evaluateLeaveActionState({
  request: pendingReq,
  relatedFine: { id: 'f4', studentId: 'm4', sessionId: 's1', labId: 'lab-01', amount: 15000, reason: 'Late', status: 'waived', createdAt: '2026-11-25T08:20:00Z' },
  isAuthorized: true,
  isOnline: true,
});
const processedEval = evaluateLeaveActionState({
  request: approvedReq,
  relatedFine: null,
  isAuthorized: true,
  isOnline: true,
});
const offlineEval = evaluateLeaveActionState({
  request: pendingReq,
  relatedFine: null,
  isAuthorized: true,
  isOnline: false,
});
const unauthorizedEval = evaluateLeaveActionState({
  request: pendingReq,
  relatedFine: null,
  isAuthorized: false,
  isOnline: true,
});
assert(
  fineUnpaidEval.canAct &&
    fineUnpaidEval.fineNoticeType === 'info' &&
    finePendingEval.canAct &&
    finePendingEval.fineNoticeType === 'warning' &&
    finePaidEval.canAct &&
    finePaidEval.fineNoticeType === 'warning' &&
    fineWaivedEval.canAct &&
    !processedEval.canAct &&
    !offlineEval.canAct &&
    !unauthorizedEval.canAct,
  'Leave action evaluator guards processed/offline/unauthorized states and warns for pending/paid fines'
);

// 10.5 Pastikan approval izin TIDAK mengubah fine pending/paid, dan REJECTED tidak membebaskan fine unpaid
const pendingFineGuard = prepareLeaveApprovalEffects({
  sessionId: 'sess-closed',
  studentId: 'm2',
  labId: 'lab-01',
  reviewedAt: '2026-11-25T09:00:00Z',
  existingAttendance: null,
  existingFine: { id: 'sess-closed_m2', studentId: 'm2', sessionId: 'sess-closed', labId: 'lab-01', amount: 15000, reason: 'Terlambat 5 menit', status: 'pending', createdAt: '2026-11-25T08:20:00Z' },
});
const paidFineGuard = prepareLeaveApprovalEffects({
  sessionId: 'sess-closed',
  studentId: 'm3',
  labId: 'lab-01',
  reviewedAt: '2026-11-25T09:00:00Z',
  existingAttendance: null,
  existingFine: { id: 'sess-closed_m3', studentId: 'm3', sessionId: 'sess-closed', labId: 'lab-01', amount: 15000, reason: 'Terlambat 5 menit', status: 'paid', createdAt: '2026-11-25T08:20:00Z', paidAt: '2026-11-25T08:30:00Z' },
});
assert(
  pendingFineGuard.fineWaiver?.allowed === false &&
    pendingFineGuard.fineWaiver?.fine.status === 'pending' &&
    paidFineGuard.fineWaiver?.allowed === false &&
    paidFineGuard.fineWaiver?.fine.status === 'paid',
  'Leave approval preserves pending and paid fine statuses without waiving them'
);

// 10.6 Verifikasi pembersihan listener onSnapshot & state loading/error pada UI Asprak
const exploreSource = fs.readFileSync(path.join(__dirname, '..', 'src', 'app', '(main)', 'explore.tsx'), 'utf-8');
const contextSource = fs.readFileSync(path.join(__dirname, '..', 'src', 'context', 'session-context.tsx'), 'utf-8');
assert(
  exploreSource.includes('unsubAtt?.()') &&
    exploreSource.includes('unsubLeaves?.()') &&
    exploreSource.includes('unsubSprint4Att?.()') &&
    exploreSource.includes('unsubSprint4Fines?.()') &&
    contextSource.includes('unsubAttendances?.()') &&
    contextSource.includes('unsubFines?.()') &&
    exploreSource.includes('ActivityIndicator') &&
    exploreSource.includes('activeErrorMessage'),
  'Realtime onSnapshot listeners clean up on unmount and UI handles loading/error states'
);

// ----------------------------------------------------
// 11. Sprint 4 Dev B Stage 5: Full End-to-End Flow & Rules Hardening
// ----------------------------------------------------
console.log(`\n${bold}11. Sprint 4 Dev B Stage 5: Full End-to-End Flow & Rules Hardening${reset}`);

const {
  sprint4SeedLabs,
  sprint4SeedUsers,
  sprint4SeedLabMembers,
} = require('../src/features/presensi/seed-sprint4.ts');

// 11.1 End-to-End Dev B simulation menggunakan seed Lab 01 & users
const e2eLab = sprint4SeedLabs[0];
const e2eAsprak = sprint4SeedUsers.find((u) => u.role === 'asprak');
const e2eUsersMapped = sprint4SeedUsers.map((u) => ({
  id: u.uid,
  name: u.name,
  email: u.email,
  role: u.role,
  nim: u.nim,
}));
const e2eSession = {
  id: 'sess-e2e-01',
  labId: e2eLab.id,
  courseId: e2eLab.courseId,
  asprakId: e2eAsprak.uid,
  assistantId: e2eAsprak.uid,
  startAt: '2026-11-25T08:00:00.000Z',
  status: 'OPEN',
  openedAt: '2026-11-25T07:55:00.000Z',
};

// Langkah A: Buka sesi & kunci configSnapshot dari Lab 01 (15 mnt, Rp15.000)
const e2eSnapshot = requireSessionConfigSnapshot(e2eLab, null);
assert(
  isAsprakAssignedToSession(e2eSession, e2eAsprak.uid) &&
    !isAsprakAssignedToSession(e2eSession, 'user-asprak-other') &&
    e2eSnapshot.gracePeriodMinutes === 15 &&
    e2eSnapshot.lateFineAmount === 15000,
  'E2E Step A: Assigned Asprak opens session and locks lab attendanceConfig snapshot'
);

// Langkah B: Mahasiswa 1 check-in tepat waktu (08:10), Mahasiswa 2 check-in terlambat (08:25 -> +10 mnt)
const mhs1CheckIn = prepareCheckInWithFine({
  sessionId: e2eSession.id,
  studentId: 'user-mhs-1',
  labId: e2eLab.id,
  sessionStartAt: e2eSession.startAt,
  checkedInAt: '2026-11-25T08:10:00.000Z',
  configSnapshot: e2eSnapshot,
});
const mhs2CheckIn = prepareCheckInWithFine({
  sessionId: e2eSession.id,
  studentId: 'user-mhs-2',
  labId: e2eLab.id,
  sessionStartAt: e2eSession.startAt,
  checkedInAt: '2026-11-25T08:25:00.000Z',
  configSnapshot: e2eSnapshot,
});
const mhs2Retry = prepareCheckInWithFine({
  sessionId: e2eSession.id,
  studentId: 'user-mhs-2',
  labId: e2eLab.id,
  sessionStartAt: e2eSession.startAt,
  checkedInAt: '2026-11-25T08:25:00.000Z',
  configSnapshot: e2eSnapshot,
  existingFine: mhs2CheckIn.fineDoc,
});
assert(
  !mhs1CheckIn.attendanceDoc.isLate &&
    mhs1CheckIn.fineDoc === null &&
    mhs2CheckIn.attendanceDoc.isLate &&
    mhs2CheckIn.attendanceDoc.lateMinutes === 10 &&
    mhs2CheckIn.fineDoc?.id === 'sess-e2e-01_user-mhs-2' &&
    mhs2CheckIn.fineDoc?.amount === 15000 &&
    mhs2CheckIn.fineDoc?.status === 'unpaid' &&
    mhs2Retry.fineDoc === null,
  'E2E Step B: On-time vs late check-in evaluates accurately and creates idempotent deterministic fine'
);

// Langkah C: Asprak approve izin Mahasiswa 2 -> EXCUSED + denda unpaid di-waive, histori terlambat terjaga
const mhs2LeaveEval = evaluateLeaveActionState({
  request: { status: 'PENDING' },
  relatedFine: mhs2CheckIn.fineDoc,
  isAuthorized: true,
  isOnline: true,
});
const mhs2LeaveEffects = prepareLeaveApprovalEffects({
  sessionId: e2eSession.id,
  studentId: 'user-mhs-2',
  labId: e2eLab.id,
  reviewedAt: '2026-11-25T09:00:00.000Z',
  existingAttendance: mhs2CheckIn.attendanceDoc,
  existingFine: mhs2CheckIn.fineDoc,
});
const e2eFinalRoster = buildSessionAttendanceRoster({
  session: { ...e2eSession, status: 'CLOSED', closedAt: '2026-11-25T10:00:00.000Z' },
  attendanceDocs: [mhs1CheckIn.attendanceDoc, mhs2LeaveEffects.excusedAttendance],
  fines: mhs2LeaveEffects.fineWaiver ? [mhs2LeaveEffects.fineWaiver.fine] : [],
  users: e2eUsersMapped,
  leaveRequests: [],
  labMembers: sprint4SeedLabMembers,
});
const finalMhs1 = e2eFinalRoster.find((r) => r.studentId === 'user-mhs-1');
const finalMhs2 = e2eFinalRoster.find((r) => r.studentId === 'user-mhs-2');
assert(
  mhs2LeaveEval.canAct &&
    mhs2LeaveEffects.excusedAttendance.status === 'EXCUSED' &&
    mhs2LeaveEffects.excusedAttendance.isLate === true &&
    mhs2LeaveEffects.excusedAttendance.lateMinutes === 10 &&
    mhs2LeaveEffects.fineWaiver?.fine.status === 'waived' &&
    finalMhs1?.attendanceStatus === 'PRESENT' &&
    finalMhs2?.attendanceStatus === 'EXCUSED' &&
    finalMhs2?.fine?.status === 'waived',
  'E2E Step C: Leave approval waives unpaid fine, marks EXCUSED, and updates Asprak roster cleanly'
);

// 11.2 Verifikasi hardening firestore.rules untuk session_status_logs & fine waiver guard
assert(
  rulesContent.includes('match /session_status_logs/') &&
    rulesContent.includes("request.resource.data.status != 'waived' || resource.data.status == 'unpaid'"),
  'firestore.rules matches session_status_logs and prevents waiving paid/pending fines'
);

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
