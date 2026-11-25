import 'dotenv/config';
import cors from 'cors';
import express from 'express';
import { cert, getApps, initializeApp } from 'firebase-admin/app';

import { paymentRouter } from './payments/payment-routes.js';

if (getApps().length === 0) {
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');

  if (projectId && clientEmail && privateKey) {
    initializeApp({
      credential: cert({ projectId, clientEmail, privateKey }),
    });
  } else {
    initializeApp({
      ...(projectId ? { projectId } : {}),
    });
  }
}

const app = express();
app.use(cors());
app.use(express.json());

app.get('/health', (_req, res) => {
  res.json({ ok: true, service: 'labora-payment-server' });
});

app.use('/api/payment', paymentRouter);

const port = Number(process.env.PORT || 4000);
app.listen(port, () => {
  console.log(`[PaymentServer] Berjalan di http://localhost:${port}`);
});
