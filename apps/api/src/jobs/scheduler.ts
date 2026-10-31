import cron from 'node-cron';
import { config } from '../config';
import { logger } from '../utils/logger';
import { prisma } from '../utils/prisma';
import { BillingEngine } from '../services/billingEngine';
import { EmailService } from '../services/emailService';
import { AlertService } from '../services/alertService';

export class JobScheduler {
  private static tasks: cron.ScheduledTask[] = [];

  static start() {
    if (!config.jobs.enabled) {
      logger.info('Background jobs are disabled via configuration');
      return;
    }

    logger.info('Initializing background job scheduler...');

    // 1. Recurring Billing Engine Cron
    const billingTask = cron.schedule(config.jobs.billingCron, async () => {
      logger.info('Starting scheduled recurring billing job...');
      try {
        await BillingEngine.executeBillingRun('CRON_BILLING_JOB');
      } catch (err) {
        logger.error({ err }, 'Error during scheduled billing job execution');
      }
    });
    this.tasks.push(billingTask);

    // 2. Overdue Invoices & Renewal Reminders Cron
    const reminderTask = cron.schedule(config.jobs.reminderCron, async () => {
      logger.info('Starting scheduled reminder and overdue detection job...');
      try {
        await this.processOverdueInvoices();
        await this.processRenewalReminders();
        await this.processExpiredResetTokens();
      } catch (err) {
        logger.error({ err }, 'Error during reminder job execution');
      }
    });
    this.tasks.push(reminderTask);

    logger.info(
      {
        billingCron: config.jobs.billingCron,
        reminderCron: config.jobs.reminderCron,
      },
      'Background job scheduler successfully registered and running'
    );
  }

  static stop() {
    for (const task of this.tasks) {
      task.stop();
    }
    this.tasks = [];
    logger.info('Background job scheduler stopped');
  }

  /**
   * Identifies invoices that have passed their due date and creates alerts/notifications.
   */
  private static async processOverdueInvoices() {
    const now = new Date();
    const overdueInvoices = await prisma.invoice.findMany({
      where: {
        balance: { gt: 0 },
        dueDate: { lt: now },
        status: { in: ['CONFIRMED', 'PARTIALLY_PAID'] },
      },
      include: {
        customer: { include: { user: true } },
      },
    });

    for (const inv of overdueInvoices) {
      // Mark as OVERDUE
      await prisma.invoice.update({
        where: { id: inv.id },
        data: { status: 'OVERDUE' },
      });

      // Create administrative alert if not already logged
      const existingAlert = await prisma.systemAlert.findFirst({
        where: {
          alertType: 'OVERDUE_INVOICE',
          entityId: inv.id,
          isReviewed: false,
        },
      });

      if (!existingAlert) {
        await AlertService.createAlert({
          alertType: 'OVERDUE_INVOICE',
          severity: 'HIGH',
          title: `Overdue Invoice: ${inv.invoiceNumber}`,
          message: `Invoice ${inv.invoiceNumber} for ${inv.customer.companyName || inv.customer.user.name} is overdue. Balance: ₹${inv.balance}`,
          entityType: 'INVOICE',
          entityId: inv.id,
        });
      }
    }
  }

  /**
   * Dispatches reminders for subscriptions renewing within the next 3 days.
   */
  private static async processRenewalReminders() {
    const now = new Date();
    const threeDaysFromNow = new Date();
    threeDaysFromNow.setDate(now.getDate() + 3);

    const renewingSubscriptions = await prisma.subscription.findMany({
      where: {
        status: 'ACTIVE',
        nextBillingDate: { gte: now, lte: threeDaysFromNow },
      },
      include: {
        customer: { include: { user: true } },
        plan: true,
      },
    });

    for (const sub of renewingSubscriptions) {
      logger.info(
        { subscriptionNumber: sub.subscriptionNumber, nextBillingDate: sub.nextBillingDate },
        'Upcoming subscription renewal detected'
      );
    }
  }

  /**
   * Cleans up expired password reset tokens older than 24 hours.
   */
  private static async processExpiredResetTokens() {
    const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);
    await prisma.passwordResetToken.deleteMany({
      where: { expiresAt: { lt: cutoff } },
    });
  }
}
