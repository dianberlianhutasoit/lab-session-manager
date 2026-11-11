import NetInfo from '@react-native-community/netinfo';

import type { PermissionCategory } from '@/types';

export interface AIClassificationResult {
  category: PermissionCategory;
  summary: string;
}

// Konfigurasi API Model AI Gemini (gratis & cepat)
// API Key diambil secara aman dari environment variable (.env.local)
const GEMINI_API_KEY = process.env.EXPO_PUBLIC_GEMINI_API_KEY || '';

const GEMINI_ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`;

/**
 * SRS-12: Mengklasifikasi alasan izin praktikan menggunakan Google Gemini API via fetch REST API.
 * SRS-13: Menangani batas timeout (5 detik) dan fallback otomatis ke "Unclassified" jika terjadi kegagalan.
 */
export async function classifyPermissionReason(
  reasonText: string
): Promise<AIClassificationResult> {
  // SRS-15: Cek kondisi offline terlebih dahulu untuk menghindari request sia-sia
  try {
    const netState = await NetInfo.fetch();
    if (netState.isConnected === false) {
      return {
        category: 'Unclassified',
        summary: 'Klasifikasi otomatis dilewati (perangkat offline)',
      };
    }
  } catch {
    // Abaikan jika pengecekan NetInfo tidak didukung di platform tertentu
  }

  // Batas waktu timeout 5 detik (SRS-13)
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 5000);

  const prompt = `
Kamu adalah asisten AI sistem akademik laboratorium.
Tugasmu adalah menganalisis dan mengklasifikasikan teks alasan izin praktikan ke dalam SALAH SATU kategori berikut:
- SAKIT (jika menyebutkan kondisi fisik sakit, demam, rawat inap, surat dokter, dsb)
- AKADEMIK (jika lomba, seminar, ujian susulan, konferensi, tugas kampus lain)
- DARURAT (jika musibah, keluarga inti meninggal, bencana, kecelakaan mendadak)
- LAINNYA (jika keperluan pribadi, urusan keluarga biasa, kendala teknis ringan, dsb)

Teks alasan praktikan: "${reasonText}"

Berikan respons HANYA dalam format JSON murni tanpa kutip markdown atau backtick:
{
  "category": "SAKIT | AKADEMIK | DARURAT | LAINNYA",
  "summary": "penjelasan singkat 1 kalimat alasan klasifikasi dalam Bahasa Indonesia"
}
`.trim();

  try {
    const response = await fetch(GEMINI_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [{ text: prompt }],
          },
        ],
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`Gemini API HTTP Error: ${response.status}`);
    }

    const jsonResponse = await response.json();
    const rawOutput =
      jsonResponse.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ?? '{}';

    // Bersihkan pembungkus markdown ```json ... ``` jika model menyertakannya
    const cleanedOutput = rawOutput
      .replace(/```json/gi, '')
      .replace(/```/g, '')
      .trim();

    const parsed = JSON.parse(cleanedOutput);

    const validCategories: PermissionCategory[] = [
      'SAKIT',
      'AKADEMIK',
      'DARURAT',
      'LAINNYA',
    ];

    const category: PermissionCategory = validCategories.includes(
      parsed.category?.toUpperCase()
    )
      ? (parsed.category.toUpperCase() as PermissionCategory)
      : 'LAINNYA';

    return {
      category,
      summary:
        parsed.summary ??
        `Alasan berhasil diklasifikasikan sebagai ${category}.`,
    };
  } catch (error) {
    // SRS-13: Handling fallback jika timeout / error / kuota / offline
    console.warn('AI Classifier fallback triggered:', error);

    return {
      category: 'Unclassified',
      summary: 'Klasifikasi otomatis tidak tersedia (timeout/error)',
    };
  }
}

