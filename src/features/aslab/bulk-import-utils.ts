import * as DocumentPicker from 'expo-document-picker';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { Platform } from 'react-native';
import * as XLSX from 'xlsx';

import type { User } from '@/types';
import type {
  BulkImportType,
  BulkLabRow,
  BulkMemberRow,
  BulkTemplateFormat,
} from './types';

// ============================================================
// TEMPLATE DEFINITIONS (CSV & XLSX) FOR ALL 3 BULK MODES
// ============================================================

const TEMPLATE_SPECS: Record<
  BulkImportType,
  {
    baseFileName: string;
    sheetName: string;
    headers: string[];
    sampleRows: (string | number)[][];
  }
> = {
  labs: {
    baseFileName: 'template_bulk_1_lab_per_matkul',
    sheetName: 'Bulk_Labs',
    headers: [
      'name',
      'building',
      'address',
      'latitude',
      'longitude',
      'radiusMeters',
      'gracePeriodMinutes',
      'lateFineAmount',
    ],
    sampleRows: [
      [
        'Lab Pemrograman A',
        'Gedung Fasilkom Lt. 2',
        'Ruang 201 Gedung Fasilkom',
        -6.9175,
        107.6191,
        30,
        15,
        10000,
      ],
      [
        'Lab Pemrograman B',
        'Gedung Fasilkom Lt. 2',
        'Ruang 202 Gedung Fasilkom',
        -6.9176,
        107.6192,
        30,
        15,
        15000,
      ],
    ],
  },
  praktikan: {
    baseFileName: 'template_bulk_2_alokasi_praktikan',
    sheetName: 'Bulk_Praktikan',
    headers: ['email', 'nim', 'name', 'userId'],
    sampleRows: [
      ['mhs1@test.com', '2110511001', 'Nadia Putri', 'user-mhs-1'],
      ['mhs2@test.com', '2110511002', 'Rafi Pratama', 'user-mhs-2'],
    ],
  },
  asprak: {
    baseFileName: 'template_bulk_3_alokasi_asprak',
    sheetName: 'Bulk_Asprak',
    headers: ['email', 'name', 'userId'],
    sampleRows: [
      ['asprak@test.com', 'Dimas Saputra', 'user-asprak-1'],
      ['ayu.asprak@test.com', 'Ayu Lestari', 'user-asprak-2'],
    ],
  },
};

export function getTemplateSpec(type: BulkImportType) {
  return TEMPLATE_SPECS[type];
}

export async function downloadBulkTemplate(
  type: BulkImportType,
  format: BulkTemplateFormat
): Promise<{ fileName: string; uri?: string }> {
  const spec = TEMPLATE_SPECS[type];
  const fileName = `${spec.baseFileName}.${format}`;
  const aoa = [spec.headers, ...spec.sampleRows];
  const ws = XLSX.utils.aoa_to_sheet(aoa);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, spec.sheetName);

  const mimeType =
    format === 'csv'
      ? 'text/csv'
      : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

  if (Platform.OS === 'web') {
    const data =
      format === 'csv'
        ? XLSX.utils.sheet_to_csv(ws)
        : (XLSX.write(wb, { bookType: 'xlsx', type: 'array' }) as ArrayBuffer);
    const blob = new Blob([data], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = fileName;
    anchor.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    return { fileName };
  }

  const targetFile = new File(Paths.cache, fileName);
  if (format === 'csv') {
    const csvContent = XLSX.utils.sheet_to_csv(ws);
    await targetFile.write(csvContent);
  } else {
    const bytes = XLSX.write(wb, { bookType: 'xlsx', type: 'array' }) as Uint8Array;
    await targetFile.write(new Uint8Array(bytes));
  }

  const canShare = await Sharing.isAvailableAsync();
  if (canShare) {
    await Sharing.shareAsync(targetFile.uri, {
      mimeType,
      dialogTitle: `Unduh ${fileName}`,
      UTI: format === 'csv' ? 'public.comma-separated-values-text' : 'org.openxmlformats.spreadsheetml.sheet',
    });
  }

  return { fileName, uri: targetFile.uri };
}

// ============================================================
// ROW VALIDATION (LIVE EDITABLE REVIEW SCREEN)
// ============================================================

export function validateBulkLabRow(row: Omit<BulkLabRow, 'errors'>): BulkLabRow {
  const errors: string[] = [];

  if (!row.name.trim()) {
    errors.push('Nama lab wajib diisi.');
  }
  if (!row.building.trim()) {
    errors.push('Gedung/lokasi wajib diisi.');
  }

  const lat = Number.parseFloat(row.latitude);
  if (Number.isNaN(lat) || lat < -90 || lat > 90) {
    errors.push('Latitude harus antara -90 s/d 90.');
  }

  const lng = Number.parseFloat(row.longitude);
  if (Number.isNaN(lng) || lng < -180 || lng > 180) {
    errors.push('Longitude harus antara -180 s/d 180.');
  }

  const radius = Number.parseFloat(row.radiusMeters);
  if (Number.isNaN(radius) || radius <= 0) {
    errors.push('Radius presensi harus > 0 meter.');
  }

  const grace = Number.parseInt(row.gracePeriodMinutes, 10);
  if (Number.isNaN(grace) || grace < 0) {
    errors.push('Toleransi keterlambatan minimal 0 menit.');
  }

  const fine = Number.parseInt(row.lateFineAmount, 10);
  if (Number.isNaN(fine) || fine < 0) {
    errors.push('Nominal denda minimal Rp0.');
  }

  return { ...row, errors };
}

export function validateBulkMemberRow(
  row: Omit<BulkMemberRow, 'errors' | 'matchedUserId' | 'matchedUserName' | 'matchedUserRole'>,
  expectedRole: 'praktikan' | 'asprak',
  users: User[]
): BulkMemberRow {
  const errors: string[] = [];
  const cleanUserId = row.userId.trim();
  const cleanEmail = row.email.trim().toLowerCase();
  const cleanNim = row.nim.trim().toLowerCase();

  if (!cleanUserId && !cleanEmail && !cleanNim) {
    errors.push('Isi minimal salah satu: Email, NIM, atau User ID.');
  }

  let matched: User | undefined;
  if (cleanUserId) {
    matched = users.find((u) => u.id === cleanUserId || u.uid === cleanUserId);
  }
  if (!matched && cleanEmail) {
    matched = users.find((u) => u.email.trim().toLowerCase() === cleanEmail);
  }
  if (!matched && cleanNim) {
    matched = users.find((u) => (u.nim ?? '').trim().toLowerCase() === cleanNim);
  }

  if (!matched) {
    errors.push('Pengguna belum ditemukan di koleksi users.');
  } else if (matched.role !== expectedRole) {
    errors.push(`Role akun adalah "${matched.role}", bukan "${expectedRole}".`);
  }

  return {
    ...row,
    matchedUserId: matched?.id ?? null,
    matchedUserName: matched?.name ?? null,
    matchedUserRole: matched?.role ?? null,
    errors,
  };
}

// ============================================================
// FLEXIBLE HEADER NORMALIZATION & PARSER (CSV & XLSX)
// ============================================================

function pickCell(record: Record<string, unknown>, aliases: string[]): string {
  const normalizedEntries = Object.entries(record).map(([k, v]) => [
    k.trim().toLowerCase().replace(/[\s_-]+/g, ''),
    v,
  ] as const);

  for (const alias of aliases) {
    const key = alias.toLowerCase().replace(/[\s_-]+/g, '');
    const found = normalizedEntries.find(([k]) => k === key);
    if (found && found[1] !== undefined && found[1] !== null) {
      return String(found[1]).trim();
    }
  }
  return '';
}

function parseRawRecordsFromWorkbook(workbook: XLSX.WorkBook): Record<string, unknown>[] {
  const firstSheetName = workbook.SheetNames[0];
  if (!firstSheetName) return [];
  const sheet = workbook.Sheets[firstSheetName];
  return XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
    defval: '',
    raw: false,
  });
}

export function parseLabRowsFromRecords(records: Record<string, unknown>[]): BulkLabRow[] {
  return records
    .filter((r) => Object.values(r).some((v) => String(v ?? '').trim() !== ''))
    .map((record, index) =>
      validateBulkLabRow({
        rowId: `lab-row-${index + 1}-${Date.now().toString(36)}`,
        rowNumber: index + 2,
        decision: 'accepted',
        name: pickCell(record, ['name', 'namalab', 'nama', 'labname', 'laboratorium']),
        building: pickCell(record, ['building', 'gedung', 'locationname', 'lokasi']),
        address: pickCell(record, ['address', 'alamat', 'ruang', 'room']),
        latitude: pickCell(record, ['latitude', 'lat']),
        longitude: pickCell(record, ['longitude', 'lng', 'lon', 'long']),
        radiusMeters: pickCell(record, ['radiusmeters', 'radius', 'geofence']) || '30',
        gracePeriodMinutes:
          pickCell(record, ['graceperiodminutes', 'graceperiod', 'toleransi', 'toleransimenit']) ||
          '15',
        lateFineAmount:
          pickCell(record, ['latefineamount', 'denda', 'nominaldenda', 'fine']) || '10000',
      })
    );
}

export function parseMemberRowsFromRecords(
  records: Record<string, unknown>[],
  expectedRole: 'praktikan' | 'asprak',
  users: User[]
): BulkMemberRow[] {
  return records
    .filter((r) => Object.values(r).some((v) => String(v ?? '').trim() !== ''))
    .map((record, index) =>
      validateBulkMemberRow(
        {
          rowId: `member-row-${index + 1}-${Date.now().toString(36)}`,
          rowNumber: index + 2,
          decision: 'accepted',
          userId: pickCell(record, ['userid', 'uid', 'id']),
          email: pickCell(record, ['email', 'emailsso', 'mail']),
          nim: pickCell(record, ['nim', 'npm', 'nrp']),
          name: pickCell(record, ['name', 'nama', 'namalengkap']),
        },
        expectedRole,
        users
      )
    );
}

export async function pickAndParseSpreadsheetFile(): Promise<{
  fileName: string;
  records: Record<string, unknown>[];
} | null> {
  const result = await DocumentPicker.getDocumentAsync({
    type: [
      'text/csv',
      'text/comma-separated-values',
      'application/csv',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      '*/*',
    ],
    copyToCacheDirectory: true,
    multiple: false,
  });

  if (result.canceled || !result.assets || result.assets.length === 0) {
    return null;
  }

  const asset = result.assets[0];
  let workbook: XLSX.WorkBook;

  if (Platform.OS === 'web' && asset.file) {
    const buffer = await asset.file.arrayBuffer();
    workbook = XLSX.read(buffer, { type: 'array' });
  } else {
    const file = new File(asset.uri);
    const buffer = await file.arrayBuffer();
    workbook = XLSX.read(buffer, { type: 'array' });
  }

  const records = parseRawRecordsFromWorkbook(workbook);
  return {
    fileName: asset.name || 'import-file',
    records,
  };
}

export function parseSampleRecordsForPreview(type: BulkImportType): Record<string, unknown>[] {
  const spec = TEMPLATE_SPECS[type];
  return spec.sampleRows.map((row) => {
    const obj: Record<string, unknown> = {};
    spec.headers.forEach((h, i) => {
      obj[h] = String(row[i] ?? '');
    });
    return obj;
  });
}
