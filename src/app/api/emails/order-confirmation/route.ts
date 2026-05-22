import { resend, IS_SANDBOX_MODE, TEST_EMAIL } from '@/lib/resend';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { order, paymentDetails, adminEmail } = await req.json();

    if (!order || !paymentDetails) {
      return NextResponse.json({ error: 'Missing order or payment details' }, { status: 400 });
    }

    const { items, totalPrice, shippingCharge, id: orderId, userName, userEmail } = order;
    const subtotal = items.reduce((acc: number, item: any) => acc + (item.price * item.quantity), 0);
    
    // Determine recipient based on Sandbox mode
    const recipientEmail = IS_SANDBOX_MODE ? TEST_EMAIL : userEmail;
    const senderEmail = IS_SANDBOX_MODE ? 'ArachnidsArk <onboarding@resend.dev>' : 'ArachnidsArk <orders@arachnidsark.com>';
    const adminNotificationEmail = adminEmail || TEST_EMAIL;
    const { upiIds, bankDetails, paymentInstructions } = paymentDetails;

    const itemsHtml = items.map((item: any) => `
      <tr>
        <td style="padding: 10px; border-bottom: 1px solid #eee;">
          ${item.name || item.productName} 
          <span style="font-size: 10px; color: #718096; display: block;">
            ${item.type === 'product' ? (item.metadata?.size || item.size || 'N/A') : (item.metadata?.label || item.type)}
          </span>
        </td>
        <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: center;">${item.quantity}</td>
        <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: right;">₹${item.price * item.quantity}</td>
      </tr>
    `).join('');

    const upiHtml = upiIds.map((upi: any) => `
      <div style="margin-bottom: 10px; padding: 10px; background: #f9f9f9; border-radius: 5px;">
        <strong>${upi.label}:</strong> <span style="font-family: monospace;">${upi.value}</span>
      </div>
    `).join('');

    const emailHtml = `
      <div style="font-family: sans-serif; max-width: 600px; margin: auto; color: #333;">
        <h2 style="color: #c53030;">Order Confirmation - #${orderId.split('-')[0]}</h2>
        <p>Hello ${userName},</p>
        <p>Thank you for your order with <strong>ArachnidsArk</strong>! Your order request has been received and is currently being processed.</p>
        
        <h3 style="border-bottom: 2px solid #eee; padding-bottom: 5px;">Order Summary</h3>
        <table style="width: 100%; border-collapse: collapse;">
          <thead>
            <tr style="background: #f4f4f4;">
              <th style="padding: 10px; text-align: left;">Item</th>
              <th style="padding: 10px; text-align: center;">Qty</th>
              <th style="padding: 10px; text-align: right;">Price</th>
            </tr>
          </thead>
          <tbody>
            ${itemsHtml}
          </tbody>
          <tfoot>
            <tr>
              <td colspan="2" style="padding: 10px; text-align: right; color: #718096;">Subtotal:</td>
              <td style="padding: 10px; text-align: right;">₹${subtotal}</td>
            </tr>
            ${order.discountAmount && order.discountAmount > 0 ? `
            <tr>
              <td colspan="2" style="padding: 10px; text-align: right; color: #38a169;">Discount (${order.coupon?.code}):</td>
              <td style="padding: 10px; text-align: right; color: #38a169; font-weight: bold;">-₹${order.discountAmount}</td>
            </tr>
            ` : ''}
            <tr>
              <td colspan="2" style="padding: 10px; text-align: right; color: #718096;">Shipping:</td>
              <td style="padding: 10px; text-align: right;">₹${shippingCharge || 0}</td>
            </tr>
            <tr>
              <td colspan="2" style="padding: 10px; font-weight: bold; text-align: right;">Total Amount:</td>
              <td style="padding: 10px; font-weight: bold; text-align: right; color: #b7791f;">₹${totalPrice}</td>
            </tr>
          </tfoot>
        </table>

        <div style="margin-top: 30px; padding: 20px; border: 2px solid #b7791f; border-radius: 10px;">
          <h3 style="margin-top: 0; color: #b7791f;">Payment Instructions</h3>
          <p>Please complete your payment using one of the following methods:</p>
          
          <div style="margin-bottom: 20px;">
            <h4 style="margin-bottom: 5px;">UPI IDs:</h4>
            ${upiHtml}
          </div>

          <div style="margin-bottom: 20px;">
            <h4 style="margin-bottom: 5px;">Bank Transfer:</h4>
            <pre style="background: #f9f9f9; padding: 10px; border-radius: 5px; font-family: monospace; white-space: pre-wrap;">${bankDetails}</pre>
          </div>

          <p style="font-style: italic; font-size: 14px; color: #666;">
            ${paymentInstructions || `Important: Please include your Order ID (#${orderId.split('-')[0]}) in the payment remarks.`}
          </p>

          <div style="background: #fff5f5; padding: 15px; border-left: 4px solid #c53030; margin-top: 20px;">
            <strong style="color: #c53030;">Action Required:</strong> 
            Please reply to this email with a screenshot of your successful transaction. Once verified, we will proceed with your order.
          </div>
        </div>

        <p style="margin-top: 30px; font-size: 12px; color: #999; text-align: center;">
          ArachnidsArk - Quality Exotics & Supplies<br>
          This is an automated message. Please reply to this email for any queries.
        </p>
      </div>
    `;

    const { data, error } = await resend.emails.send({
      from: senderEmail,
      to: [recipientEmail],
      bcc: [adminNotificationEmail],
      replyTo: adminNotificationEmail,
      subject: `Order Confirmation #${orderId.split('-')[0]} - ArachnidsArk`,
      html: emailHtml,
    });

    if (error) {
      console.error('Resend error:', error);
      // Even if email fails, we don't want to break the user flow entirely in a mock app
      // but we should log it.
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, data });
  } catch (err: any) {
    console.error('Email API error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
