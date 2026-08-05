import { Resend } from "resend";
import { env } from "@/lib/env";
import type { EmailMessage, EmailProvider } from "./email.provider";

/**
 * Resend when configured; otherwise log and no-op.
 * Onsite / air-gapped installs work without an outbound email SaaS —
 * invites, resets, and alerts stay in-app / appear in server logs.
 */
class ResendEmailProvider implements EmailProvider {
  private client: Resend | null;

  constructor() {
    this.client = env.RESEND_API_KEY ? new Resend(env.RESEND_API_KEY) : null;
  }

  async send(message: EmailMessage): Promise<void> {
    if (!this.client || !env.EMAIL_FROM) {
      console.info(
        "[email:unconfigured]",
        message.to,
        message.subject,
        "(set RESEND_API_KEY + EMAIL_FROM to send)"
      );
      return;
    }

    const { error } = await this.client.emails.send({
      from: env.EMAIL_FROM,
      to: message.to,
      subject: message.subject,
      html: message.html,
    });

    if (error) {
      throw new Error(error.message);
    }
  }
}

export const emailProvider: EmailProvider = new ResendEmailProvider();
