export type NotificationType = 'fine_created' | 'payment_success' | 'payment_failed';

/**
 * Kontrak Skema Firestore: notifications/{notificationId} (Owned by Dev C)
 */
export interface NotificationDoc {
  id: string;
  userId: string;
  title: string;
  body: string;
  type: NotificationType;
  data?: Record<string, unknown>;
  isRead: boolean;
  createdAt: string;
}

export type NotificationFilter = 'ALL' | 'UNREAD' | 'FINE' | 'PAYMENT';
