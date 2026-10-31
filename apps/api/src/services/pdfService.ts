import PDFDocument from 'pdfkit';
import { config } from '../config';

export class PdfService {
  /**
   * Generates a professional tax invoice PDF document as a Buffer.
   */
  static async generateInvoicePdf(invoice: any): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ margin: 40, size: 'A4' });
      const buffers: Buffer[] = [];

      doc.on('data', buffers.push.bind(buffers));
      doc.on('end', () => resolve(Buffer.concat(buffers)));
      doc.on('error', reject);

      // ---------------------------------------------------------
      // HEADER
      // ---------------------------------------------------------
      doc
        .fillColor('#0f172a')
        .fontSize(22)
        .font('Helvetica-Bold')
        .text(config.company.name, 40, 40);

      doc
        .fillColor('#64748b')
        .fontSize(9)
        .font('Helvetica')
        .text(config.company.address, 40, 68)
        .text(`GSTIN: ${config.company.gstin} | Email: ${config.company.email}`, 40, 80)
        .text(`Phone: ${config.company.phone} | Web: ${config.company.website}`, 40, 92);

      // Invoice Badge / Title
      doc
        .fillColor('#4f46e5')
        .fontSize(18)
        .font('Helvetica-Bold')
        .text('TAX INVOICE', 380, 40, { align: 'right' });

      doc
        .fillColor('#0f172a')
        .fontSize(10)
        .font('Helvetica-Bold')
        .text(`Invoice #: ${invoice.invoiceNumber}`, 380, 65, { align: 'right' })
        .font('Helvetica')
        .fillColor('#475569')
        .text(`Invoice Date: ${new Date(invoice.invoiceDate).toLocaleDateString()}`, 380, 80, { align: 'right' })
        .text(`Due Date: ${new Date(invoice.dueDate).toLocaleDateString()}`, 380, 95, { align: 'right' })
        .text(`Status: ${invoice.status}`, 380, 110, { align: 'right' });

      doc.moveTo(40, 130).lineTo(555, 130).strokeColor('#e2e8f0').stroke();

      // ---------------------------------------------------------
      // BILL TO SECTION
      // ---------------------------------------------------------
      doc
        .fillColor('#0f172a')
        .fontSize(11)
        .font('Helvetica-Bold')
        .text('BILL TO:', 40, 145);

      const customerName = invoice.customer?.user?.name || invoice.customer?.companyName || 'Valued Customer';
      const customerCompany = invoice.customer?.companyName ? ` (${invoice.customer.companyName})` : '';
      doc
        .fontSize(10)
        .font('Helvetica')
        .fillColor('#334155')
        .text(`${customerName}${customerCompany}`, 40, 162)
        .text(invoice.customer?.billingAddress || 'Billing Address Not Specified', 40, 177)
        .text(`GSTIN / Tax ID: ${invoice.customer?.taxId || 'N/A'}`, 40, 192)
        .text(`Email: ${invoice.customer?.user?.email || 'N/A'}`, 40, 207);

      // ---------------------------------------------------------
      // LINE ITEMS TABLE HEADER
      // ---------------------------------------------------------
      const tableTop = 235;
      doc.rect(40, tableTop, 515, 24).fill('#f1f5f9');

      doc
        .fillColor('#1e293b')
        .fontSize(9)
        .font('Helvetica-Bold')
        .text('Item & Description', 50, tableTop + 7)
        .text('Qty', 300, tableTop + 7, { width: 40, align: 'center' })
        .text('Unit Price (₹)', 350, tableTop + 7, { width: 70, align: 'right' })
        .text('Total (₹)', 440, tableTop + 7, { width: 105, align: 'right' });

      let currentY = tableTop + 28;

      // ---------------------------------------------------------
      // LINE ITEMS ROWS
      // ---------------------------------------------------------
      doc.font('Helvetica').fontSize(9).fillColor('#334155');

      if (invoice.lines && invoice.lines.length > 0) {
        for (const line of invoice.lines) {
          const description = line.description || line.product?.name || 'Subscription Service';
          const variantText = line.variant ? ` (${line.variant.name}: ${line.variant.value})` : '';
          const fullDesc = `${description}${variantText}`;

          doc
            .text(fullDesc, 50, currentY, { width: 240 })
            .text(String(line.quantity), 300, currentY, { width: 40, align: 'center' })
            .text(Number(line.unitPrice).toFixed(2), 350, currentY, { width: 70, align: 'right' })
            .text(Number(line.subtotal).toFixed(2), 440, currentY, { width: 105, align: 'right' });

          currentY += 22;
        }
      }

      doc.moveTo(40, currentY + 5).lineTo(555, currentY + 5).strokeColor('#e2e8f0').stroke();
      currentY += 15;

      // ---------------------------------------------------------
      // TOTALS SUMMARY SECTION
      // ---------------------------------------------------------
      const totalsX = 350;
      const valuesX = 450;
      const summaryWidth = 95;

      doc
        .fontSize(9)
        .font('Helvetica')
        .text('Subtotal:', totalsX, currentY)
        .text(`₹${Number(invoice.subtotal).toFixed(2)}`, valuesX, currentY, { width: summaryWidth, align: 'right' });
      currentY += 16;

      if (Number(invoice.discountAmount) > 0) {
        doc
          .fillColor('#059669')
          .text('Discount Applied:', totalsX, currentY)
          .text(`-₹${Number(invoice.discountAmount).toFixed(2)}`, valuesX, currentY, { width: summaryWidth, align: 'right' });
        currentY += 16;
      }

      if (Number(invoice.taxAmount) > 0) {
        doc
          .fillColor('#334155')
          .text('Taxes (GST):', totalsX, currentY)
          .text(`₹${Number(invoice.taxAmount).toFixed(2)}`, valuesX, currentY, { width: summaryWidth, align: 'right' });
        currentY += 16;
      }

      doc.rect(340, currentY, 215, 26).fill('#f8fafc');
      doc
        .fillColor('#0f172a')
        .font('Helvetica-Bold')
        .fontSize(11)
        .text('Total Amount Due:', totalsX, currentY + 7)
        .text(`₹${Number(invoice.totalAmount).toFixed(2)}`, valuesX, currentY + 7, { width: summaryWidth, align: 'right' });
      currentY += 34;

      doc
        .font('Helvetica')
        .fontSize(9)
        .fillColor('#475569')
        .text('Amount Paid:', totalsX, currentY)
        .text(`₹${Number(invoice.amountPaid).toFixed(2)}`, valuesX, currentY, { width: summaryWidth, align: 'right' });
      currentY += 16;

      doc
        .font('Helvetica-Bold')
        .fontSize(10)
        .fillColor(Number(invoice.balance) <= 0 ? '#10b981' : '#e11d48')
        .text('Outstanding Balance:', totalsX, currentY)
        .text(`₹${Number(invoice.balance).toFixed(2)}`, valuesX, currentY, { width: summaryWidth, align: 'right' });

      // ---------------------------------------------------------
      // PAYMENT INSTRUCTIONS & FOOTER
      // ---------------------------------------------------------
      doc
        .font('Helvetica-Bold')
        .fontSize(10)
        .fillColor('#0f172a')
        .text('Payment Instructions:', 40, currentY - 50);

      doc
        .font('Helvetica')
        .fontSize(8)
        .fillColor('#64748b')
        .text('Online Payments: Log in to your customer portal to pay via Razorpay (UPI, Credit/Debit cards, Netbanking).', 40, currentY - 35, { width: 280 })
        .text('Bank Wire: Brightloop Software Pvt Ltd | HDFC Bank | A/C: 50200012345678 | IFSC: HDFC0001234', 40, currentY - 18, { width: 280 });

      // Footer notice
      doc
        .fontSize(8)
        .fillColor('#94a3b8')
        .text('This is a computer-generated tax invoice and requires no physical signature.', 40, 780, { align: 'center', width: 515 });

      doc.end();
    });
  }

  /**
   * Generates a formal Quotation PDF document as a Buffer.
   */
  static async generateQuotationPdf(quotation: any): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ margin: 40, size: 'A4' });
      const buffers: Buffer[] = [];

      doc.on('data', buffers.push.bind(buffers));
      doc.on('end', () => resolve(Buffer.concat(buffers)));
      doc.on('error', reject);

      // Header
      doc
        .fillColor('#0f172a')
        .fontSize(22)
        .font('Helvetica-Bold')
        .text(config.company.name, 40, 40);

      doc
        .fillColor('#64748b')
        .fontSize(9)
        .font('Helvetica')
        .text(config.company.address, 40, 68)
        .text(`GSTIN: ${config.company.gstin} | Email: ${config.company.email}`, 40, 80);

      doc
        .fillColor('#4f46e5')
        .fontSize(18)
        .font('Helvetica-Bold')
        .text('OFFICIAL QUOTATION', 350, 40, { align: 'right' });

      doc
        .fillColor('#0f172a')
        .fontSize(10)
        .font('Helvetica-Bold')
        .text(`Quotation #: ${quotation.quotationNumber}`, 350, 65, { align: 'right' })
        .font('Helvetica')
        .fillColor('#475569')
        .text(`Date: ${new Date(quotation.createdAt).toLocaleDateString()}`, 350, 80, { align: 'right' })
        .text(`Valid Until: ${new Date(quotation.validityDate).toLocaleDateString()}`, 350, 95, { align: 'right' })
        .text(`Status: ${quotation.status}`, 350, 110, { align: 'right' });

      doc.moveTo(40, 130).lineTo(555, 130).strokeColor('#e2e8f0').stroke();

      // Customer
      doc
        .fillColor('#0f172a')
        .fontSize(11)
        .font('Helvetica-Bold')
        .text('PREPARED FOR:', 40, 145);

      const customerName = quotation.customer?.user?.name || quotation.customer?.companyName || 'Valued Customer';
      doc
        .fontSize(10)
        .font('Helvetica')
        .fillColor('#334155')
        .text(customerName, 40, 162)
        .text(quotation.customer?.companyName || '', 40, 177)
        .text(`Email: ${quotation.customer?.user?.email || 'N/A'}`, 40, 192);

      // Lines table
      const tableTop = 225;
      doc.rect(40, tableTop, 515, 24).fill('#f1f5f9');
      doc
        .fillColor('#1e293b')
        .fontSize(9)
        .font('Helvetica-Bold')
        .text('Item Description', 50, tableTop + 7)
        .text('Qty', 300, tableTop + 7, { width: 40, align: 'center' })
        .text('Unit Price (₹)', 350, tableTop + 7, { width: 70, align: 'right' })
        .text('Total (₹)', 440, tableTop + 7, { width: 105, align: 'right' });

      let currentY = tableTop + 28;
      doc.font('Helvetica').fontSize(9).fillColor('#334155');

      if (quotation.lines && quotation.lines.length > 0) {
        for (const line of quotation.lines) {
          const desc = line.product?.name || 'Service Plan';
          const variant = line.variant ? ` (${line.variant.name}: ${line.variant.value})` : '';
          doc
            .text(`${desc}${variant}`, 50, currentY, { width: 240 })
            .text(String(line.quantity), 300, currentY, { width: 40, align: 'center' })
            .text(Number(line.unitPrice).toFixed(2), 350, currentY, { width: 70, align: 'right' })
            .text(Number(line.totalAmount).toFixed(2), 440, currentY, { width: 105, align: 'right' });
          currentY += 22;
        }
      }

      doc.moveTo(40, currentY + 5).lineTo(555, currentY + 5).strokeColor('#e2e8f0').stroke();
      currentY += 20;

      // Total
      doc
        .rect(340, currentY, 215, 30)
        .fill('#f8fafc')
        .fillColor('#0f172a')
        .font('Helvetica-Bold')
        .fontSize(11)
        .text('Estimated Total:', 350, currentY + 8)
        .text(`₹${Number(quotation.totalAmount).toFixed(2)}`, 450, currentY + 8, { width: 95, align: 'right' });

      doc.end();
    });
  }
}
