import { NotificationModel, INotification } from '../models/notification.model';
import { TemplateModel } from '../models/template.model';
import { Logger } from '@inventory/shared-logger';

export interface IEmailClient {
  send(to: string, subject: string, body: string): Promise<unknown>;
}

export class NotificationService {
  public retryBackoffMs = 1000; // Customizable for testing

  constructor(
    private readonly emailClient: IEmailClient,
    private readonly logger: Logger
  ) {}

  // TEMPLATING UTILITY
  private render(templateStr: string, variables: Record<string, unknown>): string {
    let result = templateStr;
    for (const [key, value] of Object.entries(variables)) {
      result = result.replace(new RegExp(`{{${key}}}`, 'g'), String(value));
    }
    return result;
  }

  // Render a template by key, then dispatch. Used for templated notifications (welcome).
  private async sendNotificationWithRetry(
    userId: string | undefined | null,
    type: string,
    recipient: string,
    templateKey: string,
    variables: Record<string, unknown>
  ): Promise<INotification> {
    const template = await TemplateModel.findOne({ key: templateKey });
    if (!template) {
      throw new Error(`Notification template not found: ${templateKey}`);
    }

    const subject = this.render(template.subject, variables);
    const body = this.render(template.body, variables);
    return this.dispatch(userId, type, recipient, subject, body);
  }

  // CORE NOTIFICATION DISPATCHER WITH RETRY LOGIC — persists with the given
  // pre-rendered subject/body (so callers can build human, name-based messages).
  private async dispatch(
    userId: string | undefined | null,
    type: string,
    recipient: string,
    subject: string,
    body: string
  ): Promise<INotification> {
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
  async handleUserCreated(payload: unknown): Promise<void> {
    const { userId, username, email } = payload as { userId: string; username: string; email: string };
    this.logger.info('Processing user.created notification event', { userId });
    await this.sendNotificationWithRetry(userId, 'WELCOME', email, 'welcome', { username });
  }

  async handleStockLowDetected(payload: unknown): Promise<void> {
    const { productId, productName, currentQuantity } = payload as { productId: string; productName?: string; currentQuantity: number };
    this.logger.info('Processing stock.low.detected notification event', { productId });
    const label = productName ?? productId;
    // Admin broadcast (userId null): shows in the DB, not scoped to a single user.
    await this.dispatch(
      null,
      'LOW_STOCK',
      'admin@example.com',
      'Low stock alert',
      `${label} is low on stock (${currentQuantity} remaining).`
    );
  }

  async handleStockIn(payload: unknown): Promise<void> {
    await this.notifyStockMovement(payload, 'stock.in.created');
  }

  async handleStockOut(payload: unknown): Promise<void> {
    await this.notifyStockMovement(payload, 'stock.out.created');
  }

  // Persists a STOCK_MOVEMENT notification scoped to userId (so it appears on the
  // user's notifications page). Body uses the product name, falling back to its id.
  private async notifyStockMovement(payload: unknown, source: string): Promise<void> {
    const { productId, productName, quantity, userId, userEmail } = payload as {
      productId: string;
      productName?: string;
      quantity: number;
      userId?: string;
      userEmail?: string;
    };
    this.logger.info(`Processing ${source} notification event`, { productId, userId });
    const label = productName ?? productId;
    await this.dispatch(
      userId ?? null,
      'STOCK_MOVEMENT',
      userEmail ?? 'user@example.com',
      'Stock movement recorded',
      `Stock movement recorded for ${label}: quantity ${quantity}.`
    );
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
