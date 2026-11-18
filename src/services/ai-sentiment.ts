/**
 * Service Analisis Sentimen & Klasifikasi AI On-Device (Pure JavaScript inference).
 * Menggunakan model lokal dari folder `ai/` tanpa panggilan internet / network request.
 */

import type { LeaveCategory, SentimentLabel } from '@/types';

export type { SentimentLabel };

export interface AISentimentResult {
  label: SentimentLabel;
  status: string;
  summary: string;
  scores?: number[] | null;
}

export interface AIPermissionAnalysisResult extends AISentimentResult {
  category: LeaveCategory;
  categoryLabel: string;
}

// Load model dan classifier lokal dari folder ai/
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { createSentimentClassifier } = require('../../ai/sentiment');
const sentimentModel = require('../../ai/model-edom.json');

const classifier = createSentimentClassifier(sentimentModel);

/**
 * SRS-12: Deteksi kategori izin berbasis ekstraksi kata kunci alasan ketidakhadiran
 */
export function detectLeaveCategory(text: string): LeaveCategory {
  if (!text || typeof text !== 'string') return 'LAINNYA';
  const lower = text.toLowerCase();

  // 1. Kata kunci kondisi kesehatan / medis
  if (
    /sakit|demam|flu|batuk|pusing|rawat|opname|dokter|medis|klinik|rumah sakit|rs\b|tidak enak badan|lemas|cedera|kecelakaan|tifus|maag|diare|panas|muntah/i.test(
      lower
    )
  ) {
    return 'SAKIT';
  }

  // 2. Kata kunci penugasan institusi / lomba / organisasi resmi / dispensasi
  if (
    /dispensasi|lomba|kompetisi|delegasi|mewakili|turnamen|dinas|organisasi|kepanitiaan|kepengurusan|konferensi|seminar nasional/i.test(
      lower
    )
  ) {
    return 'DISPENSASI';
  }

  // 3. Kata kunci kegiatan akademik wajib / bentrok perkuliahan
  if (
    /kuliah|ujian|uts|uas|kuis|responsi|sidang|sempro|skripsi|kelas pengganti|bimbingan|akademik/i.test(
      lower
    )
  ) {
    return 'IZIN_AKADEMIK';
  }

  return 'LAINNYA';
}

/**
 * Menghasilkan label teks ramah pengguna untuk kategori izin
 */
export function getCategoryDisplayName(category: LeaveCategory): string {
  switch (category) {
    case 'SAKIT':
      return 'Sakit';
    case 'IZIN_AKADEMIK':
      return 'Izin Akademik';
    case 'DISPENSASI':
      return 'Dispensasi';
    default:
      return 'Keperluan Lain';
  }
}

/**
 * Analisis komprehensif alasan izin: menggabungkan deteksi kategori dan model sentimen lokal
 */
export function analyzePermissionReason(text: string): AIPermissionAnalysisResult {
  const sentimentResult = analyzeSentiment(text);
  const category = detectLeaveCategory(text);
  const categoryLabel = getCategoryDisplayName(category);

  const sentimentPart = sentimentResult.label
    ? `Sentimen: ${sentimentResult.label}`
    : 'Sentimen: netral';

  const summary = `Kategori terdeteksi: ${categoryLabel} (${sentimentPart})`;

  return {
    ...sentimentResult,
    category,
    categoryLabel,
    summary,
  };
}

/**
 * Menganalisis sentimen dari teks komentar atau alasan izin.
 * Menghasilkan label 'positif', 'netral', 'negatif', atau null jika tidak dapat dianalisis.
 */
export function analyzeSentiment(text: string): AISentimentResult {
  if (!text || typeof text !== 'string' || !text.trim()) {
    return {
      label: null,
      status: 'empty_input',
      summary: 'Komentar/alasan belum dapat dianalisis (teks kosong).',
      scores: null,
    };
  }

  try {
    const result = classifier(text);

    if (!result.label) {
      return {
        label: null,
        status: result.status ?? 'unknown_vocabulary',
        summary: 'Komentar/alasan belum dapat dianalisis. Coba gunakan kalimat yang lebih jelas.',
        scores: result.scores ?? null,
      };
    }

    const label = result.label as SentimentLabel;
    const summary = `Sentimen terdeteksi: ${label}`;

    return {
      label,
      status: result.status,
      summary,
      scores: result.scores ?? null,
    };
  } catch (error) {
    console.warn('[AI Sentiment] Terjadi kesalahan inferensi sentimen:', error);
    return {
      label: null,
      status: 'error',
      summary: 'Gagal menganalisis sentimen teks.',
      scores: null,
    };
  }
}
