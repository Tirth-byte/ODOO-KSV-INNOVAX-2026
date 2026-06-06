import { NextResponse } from 'next/server';
import { Resend } from 'resend';
import { formatINRFull as formatCurrency } from '@/lib/formatCurrency';
import type { LineItem } from '@/lib/types';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

interface SendInvoiceBody {
  invoiceId: string;
  invoiceNumber: string;
  to: string;
  vendorName: string;
  lineItems: LineItem[];
  subtotal: number;
  taxRate: number;
  taxAmount: number;
  grandTotal: number;
  dueDate: string;
}

function buildHtml(b: SendInvoiceBody): string {
  const rows = b.lineItems
    .map(
      (it) =>
        `<tr>
          <td style="padding: 12px 8px; border-bottom: 1px solid #E2E8F0; text-align: left; color: #1E293B; font-size: 14px;">${it.description}</td>
          <td style="padding: 12px 8px; border-bottom: 1px solid #E2E8F0; text-align: right; color: #475569; font-size: 14px;">${it.qty}</td>
          <td style="padding: 12px 8px; border-bottom: 1px solid #E2E8F0; text-align: right; color: #475569; font-size: 14px;">${formatCurrency(it.unitPrice)}</td>
          <td style="padding: 12px 8px; border-bottom: 1px solid #E2E8F0; text-align: right; color: #0F172A; font-weight: 600; font-size: 14px;">${formatCurrency(it.total)}</td>
        </tr>`,
    )
    .join('');

  return `
  <!DOCTYPE html>
  <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Invoice ${b.invoiceNumber}</title>
    </head>
    <body style="margin: 0; padding: 20px 0; background-color: #F8FAFC; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
      <div style="max-width: 600px; margin: 0 auto; background-color: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03);">
        
        <!-- Premium Brand Header -->
        <div style="background: linear-gradient(135deg, #FF8A00 0%, #E52E71 100%); padding: 32px 24px; text-align: center; color: #FFFFFF;">
          <div style="display: inline-block; width: 48px; height: 48px; line-height: 48px; border-radius: 12px; background-color: rgba(255, 255, 255, 0.2); font-weight: 800; font-size: 20px; letter-spacing: -0.5px; margin-bottom: 12px;">VB</div>
          <h1 style="margin: 0; font-size: 24px; font-weight: 800; letter-spacing: -0.5px;">VendorBridge</h1>
          <p style="margin: 4px 0 0; font-size: 14px; opacity: 0.9;">Professional Procurement Invoice</p>
        </div>

        <!-- Document Info -->
        <div style="padding: 24px;">
          <div style="display: flex; justify-content: space-between; border-bottom: 2px solid #F1F5F9; padding-bottom: 16px; margin-bottom: 24px;">
            <div>
              <span style="font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; color: #64748B;">Invoice Number</span>
              <h2 style="margin: 2px 0 0; font-size: 18px; font-weight: 700; color: #0F172A;">${b.invoiceNumber}</h2>
            </div>
            <div style="text-align: right;">
              <span style="font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; color: #64748B;">Payment Due</span>
              <h2 style="margin: 2px 0 0; font-size: 18px; font-weight: 700; color: #EF4444;">${new Date(b.dueDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</h2>
            </div>
          </div>

          <p style="font-size: 15px; color: #334155; line-height: 1.5; margin: 0 0 20px;">
            Dear <strong>${b.vendorName}</strong>,
          </p>
          <p style="font-size: 14px; color: #475569; line-height: 1.5; margin: 0 0 24px;">
            This email serves as the official invoice notification from VendorBridge. Please review the itemized billing details below. Payment should be processed according to our standard payment terms by the due date.
          </p>

          <!-- Line Items Table -->
          <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px;">
            <thead>
              <tr style="border-bottom: 2px solid #E2E8F0;">
                <th style="padding: 8px; text-align: left; font-size: 12px; font-weight: 700; text-transform: uppercase; color: #64748B;">Description</th>
                <th style="padding: 8px; text-align: right; font-size: 12px; font-weight: 700; text-transform: uppercase; color: #64748B;">Qty</th>
                <th style="padding: 8px; text-align: right; font-size: 12px; font-weight: 700; text-transform: uppercase; color: #64748B;">Rate</th>
                <th style="padding: 8px; text-align: right; font-size: 12px; font-weight: 700; text-transform: uppercase; color: #64748B;">Total</th>
              </tr>
            </thead>
            <tbody>
              ${rows}
            </tbody>
          </table>

          <!-- Financial Summary -->
          <div style="background-color: #F8FAFC; border-radius: 12px; padding: 16px; width: 280px; margin-left: auto; margin-bottom: 32px; border: 1px solid #E2E8F0;">
            <div style="display: flex; justify-content: space-between; margin-bottom: 8px; font-size: 13px;">
              <span style="color: #64748B;">Subtotal</span>
              <span style="color: #0F172A; font-weight: 500;">${formatCurrency(b.subtotal)}</span>
            </div>
            <div style="display: flex; justify-content: space-between; margin-bottom: 12px; font-size: 13px; border-bottom: 1px solid #E2E8F0; padding-bottom: 8px;">
              <span style="color: #64748B;">Tax (${b.taxRate}%)</span>
              <span style="color: #0F172A; font-weight: 500;">${formatCurrency(b.taxAmount)}</span>
            </div>
            <div style="display: flex; justify-content: space-between; font-size: 16px; font-weight: 700;">
              <span style="color: #0F172A;">Total Amount</span>
              <span style="color: #EA580C;">${formatCurrency(b.grandTotal)}</span>
            </div>
          </div>

          <!-- Divider -->
          <div style="border-top: 1px solid #E2E8F0; padding-top: 24px; text-align: center;">
            <p style="margin: 0; font-size: 12px; color: #94A3B8; line-height: 1.5;">
              This is an automated system notification. If you have any inquiries regarding this bill, please contact your VendorBridge procurement officer.
            </p>
            <p style="margin: 8px 0 0; font-size: 12px; font-weight: 600; color: #64748B;">
              © 2026 VendorBridge Inc. | All rights reserved.
            </p>
          </div>

        </div>
      </div>
    </body>
  </html>`;
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as SendInvoiceBody;

    if (!body.to || !body.invoiceNumber) {
      return NextResponse.json({ error: 'Missing required invoice fields.' }, { status: 400 });
    }

    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      // Simulation mode fallback for hackathon
      console.log(`[SIMULATOR] Email sent to ${body.to} with HTML:`, buildHtml(body));
      return NextResponse.json({ success: true, simulated: true });
    }

    const resend = new Resend(apiKey);
    const from = process.env.RESEND_FROM_EMAIL || 'VendorBridge <onboarding@resend.dev>';

    const { error } = await resend.emails.send({
      from,
      to: body.to,
      subject: `Invoice ${b_safeNumber(body.invoiceNumber)} from VendorBridge`,
      html: buildHtml(body),
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 502 });
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Failed to send invoice email.' }, { status: 500 });
  }
}

function b_safeNumber(n: string): string {
  return n.replace(/[^\w-]/g, '');
}
