import { emailProvider } from "@/server/email/resend.provider";
import { env } from "@/lib/env";

function appUrl(path: string) {
  return `${env.NEXTAUTH_URL}${path}`;
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

type EmailCta = {
  label: string;
  href: string;
};

type RenderEmailOptions = {
  title: string;
  preview?: string;
  bodyHtml: string;
  cta?: EmailCta;
};

function renderEmail({ title, preview, bodyHtml, cta }: RenderEmailOptions) {
  const previewText = preview ?? title;
  const ctaBlock = cta
    ? `
      <tr>
        <td style="padding: 8px 32px 28px;">
          <a href="${escapeHtml(cta.href)}"
             style="display:inline-block;background:#1f4e79;color:#ffffff;text-decoration:none;font-size:14px;font-weight:600;padding:12px 22px;border-radius:6px;">
            ${escapeHtml(cta.label)}
          </a>
        </td>
      </tr>
      <tr>
        <td style="padding: 0 32px 28px; color:#6b7280; font-size:12px; line-height:1.5;">
          Or copy and paste this link into your browser:<br />
          <a href="${escapeHtml(cta.href)}" style="color:#1f4e79;word-break:break-all;">${escapeHtml(cta.href)}</a>
        </td>
      </tr>`
    : "";

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(title)}</title>
</head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#111827;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;">${escapeHtml(previewText)}</div>
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f3f4f6;padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;background:#ffffff;border-radius:10px;overflow:hidden;border:1px solid #e5e7eb;">
          <tr>
            <td style="background:#1f4e79;padding:22px 32px;">
              <p style="margin:0;color:#ffffff;font-size:18px;font-weight:700;letter-spacing:0.02em;">Supli Mart</p>
            </td>
          </tr>
          <tr>
            <td style="padding:28px 32px 8px;">
              <h1 style="margin:0;font-size:20px;line-height:1.3;font-weight:650;color:#111827;">${escapeHtml(title)}</h1>
            </td>
          </tr>
          <tr>
            <td style="padding:8px 32px 16px;font-size:15px;line-height:1.6;color:#374151;">
              ${bodyHtml}
            </td>
          </tr>
          ${ctaBlock}
          <tr>
            <td style="padding:20px 32px;border-top:1px solid #e5e7eb;background:#fafafa;color:#9ca3af;font-size:12px;line-height:1.5;">
              This message was sent by Supli Mart. If you did not expect this email, you can safely ignore it.
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export const emailService = {
  async sendPasswordReset(email: string, token: string) {
    const link = appUrl(`/reset-password?token=${token}`);
    await emailProvider.send({
      to: email,
      subject: "Reset your Supli Mart password",
      html: renderEmail({
        title: "Reset your password",
        preview: "Reset your Supli Mart password — link expires in 1 hour",
        bodyHtml:
          "<p style=\"margin:0 0 12px;\">We received a request to reset your password. This link expires in <strong>1 hour</strong>.</p>",
        cta: { label: "Reset password", href: link },
      }),
    });
  },

  async sendVerification(email: string, token: string) {
    const link = appUrl(`/api/auth/verify-email?token=${token}`);
    await emailProvider.send({
      to: email,
      subject: "Verify your Supli Mart email",
      html: renderEmail({
        title: "Verify your email",
        preview: "Confirm your email address for Supli Mart",
        bodyHtml:
          "<p style=\"margin:0 0 12px;\">Please verify your email address to finish setting up your account.</p>",
        cta: { label: "Verify email", href: link },
      }),
    });
  },

  async sendInvitation(email: string, token: string, username: string) {
    const link = appUrl(`/accept-invite?token=${token}`);
    await emailProvider.send({
      to: email,
      subject: "You are invited to Supli Mart",
      html: renderEmail({
        title: "You're invited",
        preview: `Join Supli Mart as ${username}`,
        bodyHtml: `<p style="margin:0 0 12px;">You have been invited to join Supli Mart as <strong>${escapeHtml(username)}</strong>. Set your password to get started.</p>`,
        cta: { label: "Accept invitation", href: link },
      }),
    });
  },

  async sendRegistrationReceived(email: string, username: string) {
    await emailProvider.send({
      to: email,
      subject: "Registration received — awaiting approval",
      html: renderEmail({
        title: "Registration received",
        preview: "Your Supli Mart account is awaiting admin approval",
        bodyHtml: `<p style="margin:0 0 12px;">Thanks for registering, <strong>${escapeHtml(username)}</strong>.</p><p style="margin:0;">Your account is pending admin approval. You will receive another email once a decision has been made. You cannot sign in until then.</p>`,
      }),
    });
  },

  async sendRegistrationApproved(email: string, username: string) {
    const link = appUrl("/login");
    await emailProvider.send({
      to: email,
      subject: "Your Supli Mart account was approved",
      html: renderEmail({
        title: "You're approved",
        preview: "You can now sign in to Supli Mart",
        bodyHtml: `<p style="margin:0 0 12px;">Good news, <strong>${escapeHtml(username)}</strong> — your account has been approved.</p><p style="margin:0;">You can sign in with your username and password.</p>`,
        cta: { label: "Sign in", href: link },
      }),
    });
  },

  async sendRegistrationRejected(email: string, username: string) {
    await emailProvider.send({
      to: email,
      subject: "Your Supli Mart registration was not approved",
      html: renderEmail({
        title: "Registration not approved",
        preview: "Your Supli Mart registration was not approved",
        bodyHtml: `<p style="margin:0 0 12px;">Hi <strong>${escapeHtml(username)}</strong>,</p><p style="margin:0;">Your registration request was not approved. If you believe this was a mistake, contact your site administrator.</p>`,
      }),
    });
  },

  async sendAdminNotification(email: string, subject: string, body: string) {
    await emailProvider.send({
      to: email,
      subject: `Supli Mart: ${subject}`,
      html: renderEmail({
        title: subject,
        bodyHtml: `<p style="margin:0;">${body}</p>`,
      }),
    });
  },

  async sendReorderAlert(email: string, itemName: string, quantity: number) {
    const link = appUrl("/admin/supplies");
    await emailProvider.send({
      to: email,
      subject: `Reorder alert: ${itemName}`,
      html: renderEmail({
        title: "Low stock alert",
        preview: `${itemName} has ${quantity} remaining`,
        bodyHtml: `<p style="margin:0;"><strong>${escapeHtml(itemName)}</strong> is low on stock (<strong>${quantity}</strong> remaining). Please review inventory.</p>`,
        cta: { label: "Review supplies", href: link },
      }),
    });
  },
};
