import { Router, Request, Response, NextFunction } from 'express';
import { ContactFormSchema } from '@brightloop/shared';
import { prisma } from '../utils/prisma';
import { EmailService } from '../services/emailService';

const router = Router();

// -------------------------------------------------------------
// GET /api/v1/public/plans (Active public subscription plans)
// -------------------------------------------------------------
router.get('/plans', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const plans = await prisma.plan.findMany({
      where: { isActive: true },
      include: {
        planProducts: {
          include: {
            product: { select: { id: true, name: true, type: true } },
          },
        },
      },
      orderBy: { basePrice: 'asc' },
    });

    res.json({
      success: true,
      data: plans,
    });
  } catch (error) {
    next(error);
  }
});

// -------------------------------------------------------------
// POST /api/v1/public/contact (Public Landing Page Contact Form)
// -------------------------------------------------------------
router.post('/contact', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const validated = ContactFormSchema.parse(req.body);

    const submission = await prisma.contactSubmission.create({
      data: {
        name: validated.name,
        email: validated.email,
        company: validated.company || null,
        message: validated.message,
      },
    });

    // Notify administrators asynchronously
    EmailService.sendEmail({
      to: 'sales@brightloopsoftware.com',
      subject: `New Inquiry from ${validated.name}`,
      html: `
        <p><strong>Name:</strong> ${validated.name}</p>
        <p><strong>Email:</strong> ${validated.email}</p>
        <p><strong>Company:</strong> ${validated.company || 'N/A'}</p>
        <p><strong>Message:</strong></p>
        <p>${validated.message.replace(/\n/g, '<br/>')}</p>
      `,
    }).catch(() => {});

    res.status(201).json({
      success: true,
      message: 'Thank you for reaching out! A representative will contact you shortly.',
      data: submission,
    });
  } catch (error) {
    next(error);
  }
});

export default router;
