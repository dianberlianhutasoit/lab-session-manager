import * as WebBrowser from 'expo-web-browser';

const DEFAULT_PAYMENT_API_URL = 'http://localhost:4000';

export interface ChargePaymentResponse {
  paymentId: string;
  orderId: string;
  snapToken: string;
  redirectUrl: string;
  amount: number;
}

function getPaymentApiBaseUrl(): string {
  const configured = process.env.EXPO_PUBLIC_PAYMENT_API_URL?.trim();
  const baseUrl = configured && configured.length > 0 ? configured : DEFAULT_PAYMENT_API_URL;
  return baseUrl.replace(/\/+$/, '');
}

/**
 * Meminta Snap Token & Redirect URL ke backend /api/payment/charge.
 * Server Key hanya tersimpan di backend, tidak pernah di aplikasi React Native.
 */
export async function chargeFinePayment(params: {
  fineId: string;
  studentId: string;
}): Promise<ChargePaymentResponse> {
  const endpoint = `${getPaymentApiBaseUrl()}/api/payment/charge`;

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      fineId: params.fineId,
      studentId: params.studentId,
    }),
  });

  const payload = (await response.json().catch(() => ({}))) as Partial<
    ChargePaymentResponse & { error?: string }
  >;

  if (!response.ok) {
    throw new Error(
      payload.error || `Gagal memulai pembayaran (HTTP ${response.status}).`,
    );
  }

  if (!payload.snapToken || !payload.redirectUrl || !payload.orderId) {
    throw new Error('Respons server pembayaran tidak lengkap.');
  }

  return {
    paymentId: payload.paymentId ?? payload.orderId,
    orderId: payload.orderId,
    snapToken: payload.snapToken,
    redirectUrl: payload.redirectUrl,
    amount: payload.amount ?? 0,
  };
}

/**
 * Membuka halaman Midtrans Snap di in-app browser (expo-web-browser).
 */
export async function openMidtransSnap(redirectUrl: string): Promise<void> {
  await WebBrowser.openBrowserAsync(redirectUrl, {
    presentationStyle: WebBrowser.WebBrowserPresentationStyle.PAGE_SHEET,
  });
}
