import sgMail from '@sendgrid/mail';

let isInitialized = false;

// Lazy initialization of SendGrid
function initializeSendGrid() {
  if (isInitialized) return;

  if (!process.env.SENDGRID_API_KEY) {
    throw new Error('SENDGRID_API_KEY is not set in environment variables');
  }

  sgMail.setApiKey(process.env.SENDGRID_API_KEY);
  isInitialized = true;
}

export interface SendEmailOptions {
  to: string;
  from: {
    email: string;
    name: string;
  };
  replyTo?: string;
  subject: string;
  html: string;
  text?: string;
  trackingSettings?: {
    clickTracking?: { enable: boolean };
    openTracking?: { enable: boolean };
  };
  customArgs?: Record<string, string>;
}

/**
 * Send a single email via SendGrid
 */
export async function sendEmail(options: SendEmailOptions) {
  initializeSendGrid();

  const msg = {
    to: options.to,
    from: options.from,
    replyTo: options.replyTo,
    subject: options.subject,
    html: options.html,
    text: options.text || stripHtml(options.html),
    trackingSettings: options.trackingSettings || {
      clickTracking: { enable: true },
      openTracking: { enable: true },
    },
    customArgs: options.customArgs,
  };

  try {
    const response = await sgMail.send(msg);
    return {
      success: true,
      messageId: response[0].headers['x-message-id'],
      statusCode: response[0].statusCode,
    };
  } catch (error: any) {
    console.error('SendGrid Error:', error);

    if (error.response) {
      console.error('SendGrid Error Body:', error.response.body);
    }

    return {
      success: false,
      error: error.message,
      code: error.code,
    };
  }
}

/**
 * Send bulk emails via SendGrid (multiple recipients)
 */
export async function sendBulkEmails(emails: SendEmailOptions[]) {
  initializeSendGrid();

  const messages = emails.map(options => ({
    to: options.to,
    from: options.from,
    replyTo: options.replyTo,
    subject: options.subject,
    html: options.html,
    text: options.text || stripHtml(options.html),
    trackingSettings: options.trackingSettings || {
      clickTracking: { enable: true },
      openTracking: { enable: true },
    },
    customArgs: options.customArgs,
  }));

  try {
    const response = await sgMail.send(messages);
    return {
      success: true,
      count: messages.length,
      statusCode: response[0].statusCode,
    };
  } catch (error: any) {
    console.error('SendGrid Bulk Error:', error);

    if (error.response) {
      console.error('SendGrid Error Body:', error.response.body);
    }

    return {
      success: false,
      error: error.message,
      code: error.code,
    };
  }
}

/**
 * Strip HTML tags for plain text fallback
 */
function stripHtml(html: string): string {
  return html
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .trim();
}

/**
 * Add tracking pixel to email HTML
 */
export function addTrackingPixel(html: string, trackingUrl: string): string {
  const pixel = `<img src="${trackingUrl}" width="1" height="1" alt="" />`;

  // Try to add before closing body tag, otherwise append
  if (html.includes('</body>')) {
    return html.replace('</body>', `${pixel}</body>`);
  }

  return html + pixel;
}

/**
 * Add unsubscribe link to email HTML
 */
export function addUnsubscribeLink(html: string, unsubscribeUrl: string): string {
  const footer = `
    <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #e0e0e0; font-size: 12px; color: #666; text-align: center;">
      <p>
        If you no longer wish to receive these emails, you can
        <a href="${unsubscribeUrl}" style="color: #666; text-decoration: underline;">unsubscribe here</a>.
      </p>
      <p style="margin-top: 10px; font-size: 11px;">
        This email was sent to you because you requested information about Medicare or life insurance services.
      </p>
    </div>
  `;

  // Try to add before closing body tag, otherwise append
  if (html.includes('</body>')) {
    return html.replace('</body>', `${footer}</body>`);
  }

  return html + footer;
}
