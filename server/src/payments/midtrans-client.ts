import crypto from 'node:crypto';

const MIDTRANS_SANDBOX_SNAP_URL =
  'https://app.sandbox.midtrans.com/snap/v1/transactions';

export interface CreateSnapTransactionInput {
  orderId: string;
  grossAmount: number;
  customerName?: string;
  customerEmail?: string;
  itemName: string;
  itemId: string;
}

export interface SnapTransactionResponse {
  token: string;
  redirect_url: string;
}

export async function createSnapTransaction(
  input: CreateSnapTransactionInput,
  serverKey: string,
): Promise<SnapTransactionResponse> {
  const authHeader = Buffer.from(`${serverKey}:`).toString('base64');

  const payload = {
    transaction_details: {
      order_id: input.orderId,
      gross_amount: Math.round(input.grossAmount),
    },
    item_details: [
      {
        id: input.itemId,
        price: Math.round(input.grossAmount),
        quantity: 1,
        name: input.itemName.slice(0, 50),
      },
    ],
    customer_details: {
      first_name: input.customerName || 'Praktikan',
      email: input.customerEmail || 'praktikan@labora.local',
    },
  };

  const response = await fetch(MIDTRANS_SANDBOX_SNAP_URL, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      Authorization: `Basic ${authHeader}`,
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Midtrans Snap API error (${response.status}): ${errText}`);
  }

  const data = (await response.json()) as Partial<SnapTransactionResponse>;
  if (!data.token || !data.redirect_url) {
    throw new Error('Midtrans Snap API tidak mengembalikan token/redirect_url.');
  }

  return {
    token: data.token,
    redirect_url: data.redirect_url,
  };
}

/**
 * Verifikasi signature Midtrans: SHA512(order_id + status_code + gross_amount + ServerKey)
 */
export function verifyMidtransSignature(params: {
  orderId: string;
  statusCode: string;
  grossAmount: string;
  serverKey: string;
  signatureKey: string;
}): boolean {
  const raw = `${params.orderId}${params.statusCode}${params.grossAmount}${params.serverKey}`;
  const expected = crypto.createHash('sha512').update(raw).digest('hex');

  const expectedBuf = Buffer.from(expected, 'utf8');
  const actualBuf = Buffer.from(params.signatureKey, 'utf8');

  if (expectedBuf.length !== actualBuf.length) {
    return false;
  }

  return crypto.timingSafeEqual(expectedBuf, actualBuf);
}
