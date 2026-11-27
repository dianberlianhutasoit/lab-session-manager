import { Router } from 'express';

import {
  handleChargePayment,
  handleMidtransNotification,
} from './payment-controller.js';

export const paymentRouter = Router();

paymentRouter.post('/charge', handleChargePayment);
paymentRouter.post('/notification', handleMidtransNotification);
