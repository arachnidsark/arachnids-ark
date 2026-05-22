import { resend, IS_SANDBOX_MODE, TEST_EMAIL } from '@/lib/resend';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { order, adminEmail, changeSummary } = await req.json();

    if (!order) {
      return NextResponse.json({ error: 'Missing order details' }, { status: 400 });
    }

    const { items, totalPrice, shippingCharge, id: orderId, userName, userEmail } = order;
    const subtotal = items.reduce((acc: number, item: any) => acc + (item.price * item.quantity), 0);
    
    const recipientEmail = IS_SANDBOX_MODE ? TEST_EMAIL : userEmail;
    const senderEmail = IS_SANDBOX_MODE ? 'ArachnidsArk <onboarding@resend.dev>' : 'ArachnidsArk <orders@arachnidsark.com>';
    const adminNotificationEmail = adminEmail || TEST_EMAIL;

    const itemsHtml = items.map((item: any) => `
      <tr>
        <td style="padding: 10px; border-bottom: 1px solid #eee;">
          ${item.name} 
          <span style="font-size: 10px; color: #718096; display: block;">
            ${item.type === 'product' ? (item.metadata?.size || 'N/A') : (item.metadata?.label || item.type)}
          </span>
        </td>
        <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: center;">
          <span style="padding: 2px 8px; border-radius: 12px; font-size: 10px; background: #eee; color: #666; text-transform: uppercase; font-weight: bold;">
            ${item.status?.replace(/_/g, ' ') || 'Pending'}
          </span>
        </td>
        <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: center;">${item.quantity}</td>
        <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: right;">₹${item.price * item.quantity}</td>
      </tr>
    `).join('');

    const emailHtml = `
      <div style="font-family: sans-serif; max-width: 600px; margin: auto; color: #333;">
        <h2 style="color: #b7791f;">Order Updated - #${orderId.split('-')[0]}</h2>
        <p>Hello ${userName},</p>
        <p>Your order with <strong>ArachnidsArk</strong> has been updated by our team.</p>
        
        ${changeSummary ? `
        <div style="background: #fdfcea; border: 1px solid #fbd38d; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
          <strong style="color: #9c4221; font-size: 14px;">Updates:</strong>
          <p style="margin: 5px 0 0; font-size: 14px; color: #744210;">${changeSummary}</p>
        </div>
        ` : ''}

        <h3 style="border-bottom: 2px solid #eee; padding-bottom: 5px;">Updated Order Summary</h3>
        <table style="width: 100%; border-collapse: collapse;">
          <thead>
            <tr style="background: #f4f4f4;">
              <th style="padding: 10px; text-align: left;">Item</th>
              <th style="padding: 10px; text-align: center;">Status</th>
              <th style="padding: 10px; text-align: center;">Qty</th>
              <th style="padding: 10px; text-align: right;">Price</th>
            </tr>
          </thead>
          <tbody>
            ${itemsHtml}
          </tbody>
          <tfoot>
            <tr>
              <td colspan="3" style="padding: 10px; text-align: right; color: #718096;">Subtotal:</td>
              <td style="padding: 10px; text-align: right;">₹${subtotal}</td>
            </tr>
            ${order.discountAmount && order.discountAmount > 0 ? `
            <tr>
              <td colspan="3" style="padding: 10px; text-align: right; color: #38a169;">Discount (${order.coupon?.code}):</td>
              <td style="padding: 10px; text-align: right; color: #38a169; font-weight: bold;">-₹${order.discountAmount}</td>
            </tr>
            ` : ''}
            <tr>
              <td colspan="3" style="padding: 10px; text-align: right; color: #718096;">Shipping:</td>
              <td style="padding: 10px; text-align: right;">₹${shippingCharge || 0}</td>
            </tr>
            <tr>
              <td colspan="3" style="padding: 10px; font-weight: bold; text-align: right;">Total Amount:</td>
              <td style="padding: 10px; font-weight: bold; text-align: right; color: #b7791f;">₹${totalPrice}</td>
            </tr>
          </tfoot>
        </table>

        <p style="margin-top: 30px; font-size: 14px;">
          If you have any questions about these changes, please reply to this email or contact us via WhatsApp.
        </p>

        <p style="margin-top: 30px; font-size: 12px; color: #999; text-align: center;">
          ArachnidsArk - Quality Exotics & Supplies<br>
          This is an automated message.
        </p>
      </div>
    `;

    const { data, error } = await resend.emails.send({
      from: senderEmail,
      to: [recipientEmail],
      bcc: [adminNotificationEmail],
      replyTo: adminNotificationEmail,
      subject: `Order Updated #${orderId.split('-')[0]} - ArachnidsArk`,
      html: emailHtml,
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, data });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
