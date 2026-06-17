import { NotificationModel, INotification } from '../models/notification.model';
import { TemplateModel } from '../models/template.model';

export interface IEmailClient {
  send(to: string, subject: string, body: string): Promise<any>;
}

export class NotificationService {
  public retryBackoffMs = 1000; // Customizable for testing

  constructor(
    private readonly emailClient: IEmailClient,
    private readonly logger: any
  ) {}

  // TEMPLATING UTILITY
  private render(templateStr: string, variables: Record<string, any>): string {
    let result = templateStr;
    for (const [key, value] of Object.entries(variables)) {
      result = result.replace(new RegExp(`{{${key}}}`, 'g'), String(value));
    }
    return result;
  }

  // CORE NOTIFICATION DISPATCHER WITH RETRY LOGIC
  private async sendNotificationWithRetry(
    userId: string | undefined | null,
    type: string,
    recipient: string,
    templateKey: string,
    variables: Record<string, any>
  ): Promise<INotification> {
    const template = await TemplateModel.findOne({ key: templateKey });
    if (!template) {
      throw new Error(`Notification template not found: ${templateKey}`);
    }

    const subject = this.render(template.subject, variables);
    const body = this.render(template.body, variables);

    const notification = new NotificationModel({
      userId,
      type,
      recipient,
      subject,
      body,
      status: 'PENDING',
      attempts: 0,
      read: false,
    });

    let attempt = 0;
    while (attempt < 3) {
      attempt++;
      notification.attempts = attempt;
      try {
        await this.emailClient.send(recipient, subject, body);
        notification.status = 'SENT';
        await notification.save();
        this.logger.info(`Notification sent successfully to ${recipient}`, { type, attempt });
        return notification;
      } catch (err) {
        const errMsg = err instanceof Error ? err.message : String(err);
        this.logger.warn(`Failed notification send attempt ${attempt} to ${recipient}: ${errMsg}`);
        notification.error = errMsg;
        
        if (attempt < 3) {
          const delay = Math.pow(2, attempt) * this.retryBackoffMs;
          if (delay > 0) {
            await new Promise((resolve) => setTimeout(resolve, delay));
          }
        }
      }
    }

    notification.status = 'FAILED';
    await notification.save();
    this.logger.error(`Notification permanently failed after 3 attempts to ${recipient}`);
    throw new Error(notification.error || 'SMTP connection failed');
  }

  // EVENT HANDLERS
  async handleUserCreated(payload: any): Promise<void> {
    const { userId, username, email } = payload;
    this.logger.info('Processing user.created notification event', { userId });
    await this.sendNotificationWithRetry(userId, 'WELCOME', email, 'welcome', { username });
  }

  async handleStockLowDetected(payload: any): Promise<void> {
    const { productId, currentQuantity } = payload;
    this.logger.info('Processing stock.low.detected notification event', { productId });
    // Sends email to admin recipient
    await this.sendNotificationWithRetry(
      null,
      'LOW_STOCK',
      'admin@example.com',
      'low-stock',
      { productId, currentQuantity }
    );
  }

  async handleStockIn(payload: any): Promise<void> {
    const { productId, quantity, userId, userEmail } = payload;
    this.logger.info('Processing stock.in.created notification event', { productId, userId });
    if (userEmail) {
      await this.sendNotificationWithRetry(
        userId,
        'STOCK_MOVEMENT',
        userEmail,
        'stock-confirm',
        { productId, quantity }
      );
    }
  }

  async handleStockOut(payload: any): Promise<void> {
    const { productId, quantity, userId, userEmail } = payload;
    this.logger.info('Processing stock.out.created notification event', { productId, userId });
    if (userEmail) {
      await this.sendNotificationWithRetry(
        userId,
        'STOCK_MOVEMENT',
        userEmail,
        'stock-confirm',
        { productId, quantity }
      );
    }
  }

  // DATABASE API ACTIONS
  async getNotificationsForUser(userId: string): Promise<INotification[]> {
    return NotificationModel.find({ userId }).sort({ createdAt: -1 });
  }

  async markAsRead(notificationId: string, userId: string): Promise<INotification> {
    const notification = await NotificationModel.findById(notificationId);
    if (!notification) {
      throw new Error('Notification not found');
    }
    if (notification.userId !== userId) {
      throw new Error('Forbidden');
    }
    notification.read = true;
    await notification.save();
    return notification;
  }
}
