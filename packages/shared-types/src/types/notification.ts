export interface Notification {
  _id: string;
  userId: string | null;
  type: string;
  recipient: string;
  subject: string;
  body: string;
  status: 'PENDING' | 'SENT' | 'FAILED';
  read: boolean;
  attempts: number;
  error?: string;
  createdAt: string;
}

export interface NotificationListResponse {
  success: boolean;
  data: Notification[];
}

export interface NotificationDetailResponse {
  success: boolean;
  data: Notification;
}
