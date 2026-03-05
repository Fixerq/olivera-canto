const { Resend } = require('resend');

const resend = new Resend(process.env.RESEND_API_KEY);

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { name, email, checkin, checkout, guests, phone, message, turnstileToken } = req.body;

  // Verify Turnstile token
  const turnstileRes = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      secret: process.env.TURNSTILE_SECRET_KEY,
      response: turnstileToken,
    }),
  });
  const turnstileData = await turnstileRes.json();
  if (!turnstileData.success) {
    return res.status(403).json({ error: 'Security check failed. Please try again.' });
  }

  if (!name || !email) {
    return res.status(400).json({ error: 'Name and email are required.' });
  }

  const htmlBody = `
    <h2>New Enquiry from Villa Olivera Canto Website</h2>
    <table style="border-collapse:collapse;width:100%;max-width:600px;font-family:Arial,sans-serif;">
      <tr style="border-bottom:1px solid #e0d5c8;">
        <td style="padding:10px 12px;font-weight:bold;color:#1a2744;width:160px;">Name</td>
        <td style="padding:10px 12px;">${escapeHtml(name)}</td>
      </tr>
      <tr style="border-bottom:1px solid #e0d5c8;">
        <td style="padding:10px 12px;font-weight:bold;color:#1a2744;">Email</td>
        <td style="padding:10px 12px;"><a href="mailto:${escapeHtml(email)}">${escapeHtml(email)}</a></td>
      </tr>
      ${checkin ? `<tr style="border-bottom:1px solid #e0d5c8;">
        <td style="padding:10px 12px;font-weight:bold;color:#1a2744;">Check-in</td>
        <td style="padding:10px 12px;">${escapeHtml(checkin)}</td>
      </tr>` : ''}
      ${checkout ? `<tr style="border-bottom:1px solid #e0d5c8;">
        <td style="padding:10px 12px;font-weight:bold;color:#1a2744;">Check-out</td>
        <td style="padding:10px 12px;">${escapeHtml(checkout)}</td>
      </tr>` : ''}
      <tr style="border-bottom:1px solid #e0d5c8;">
        <td style="padding:10px 12px;font-weight:bold;color:#1a2744;">Guests</td>
        <td style="padding:10px 12px;">${escapeHtml(guests || '2')}</td>
      </tr>
      ${phone ? `<tr style="border-bottom:1px solid #e0d5c8;">
        <td style="padding:10px 12px;font-weight:bold;color:#1a2744;">Phone</td>
        <td style="padding:10px 12px;">${escapeHtml(phone)}</td>
      </tr>` : ''}
      ${message ? `<tr>
        <td style="padding:10px 12px;font-weight:bold;color:#1a2744;vertical-align:top;">Message</td>
        <td style="padding:10px 12px;white-space:pre-wrap;">${escapeHtml(message)}</td>
      </tr>` : ''}
    </table>
  `;

  try {
    await resend.emails.send({
      from: 'Villa Olivera Canto <noreply@olivera-canto.de>',
      to: 'Info@olivera-canto.de',
      replyTo: email,
      subject: `New Enquiry from ${name}`,
      html: htmlBody,
    });

    return res.status(200).json({ success: true });
  } catch (err) {
    console.error('Resend error:', err);
    return res.status(500).json({ error: 'Failed to send email. Please try again.' });
  }
};

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
