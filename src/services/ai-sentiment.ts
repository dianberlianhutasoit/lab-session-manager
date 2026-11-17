/**
 * Service Analisis Sentimen AI On-Device (Pure JavaScript inference).
 * Menggunakan model lokal dari folder `ai/` tanpa panggilan internet / network request.
 */

export type SentimentLabel = 'positif' | 'netral' | 'negatif' | null;

export interface AISentimentResult {
  label: SentimentLabel;
  status: string;
  summary: string;
  scores?: number[] | null;
}

// Load model dan classifier lokal dari folder ai/
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { createSentimentClassifier } = require('../../ai/sentiment');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const sentimentModel = require('../../ai/model-edom.json');

const classifier = createSentimentClassifier(sentimentModel);

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
