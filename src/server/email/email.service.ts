import { emailProvider } from "@/server/email/resend.provider";
import { env } from "@/lib/env";

function appUrl(path: string) {
  return `${env.NEXTAUTH_URL}${path}`;
}

export const emailService = {
  async sendPasswordReset(email: string, token: string) {
    const link = appUrl(`/reset-password?token=${token}`);
    await emailProvider.send({
      to: email,
      subject: "Reset your Supli Mart password",
      html: `<p>Click the link below to reset your password. This link expires in 1 hour.</p><p><a href="${link}">Reset password</a></p>`,
    });
  },

  async sendVerification(email: string, token: string) {
    const link = appUrl(`/api/auth/verify-email?token=${token}`);
    await emailProvider.send({
      to: email,
      subject: "Verify your Supli Mart email",
      html: `<p>Click the link below to verify your email address.</p><p><a href="${link}">Verify email</a></p>`,
    });
  },

  async sendInvitation(email: string, token: string, username: string) {
    const link = appUrl(`/accept-invite?token=${token}`);
    await emailProvider.send({
      to: email,
      subject: "You are invited to Supli Mart",
      html: `<p>You have been invited to join Supli Mart as <strong>${username}</strong>.</p><p><a href="${link}">Accept invitation</a></p>`,
    });
  },

  async sendAdminNotification(email: string, subject: string, body: string) {
    await emailProvider.send({
      to: email,
      subject: `Supli Mart: ${subject}`,
      html: `<p>${body}</p>`,
    });
  },

  async sendReorderAlert(email: string, itemName: string, quantity: number) {
    await emailProvider.send({
      to: email,
      subject: `Reorder alert: ${itemName}`,
      html: `<p><strong>${itemName}</strong> is low on stock (${quantity} remaining). Please review inventory.</p>`,
    });
  },
};
