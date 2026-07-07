import { Resend } from "resend";
import { env } from "@/lib/env";
import type { EmailMessage, EmailProvider } from "./email.provider";

class ResendEmailProvider implements EmailProvider {
  private client: Resend | null;

  constructor() {
    this.client = env.RESEND_API_KEY ? new Resend(env.RESEND_API_KEY) : null;
  }

  async send(message: EmailMessage): Promise<void> {
    if (!this.client || !env.EMAIL_FROM) {
      if (process.env.NODE_ENV === "development") {
        console.info("[email:dev]", message.to, message.subject);
        return;
      }
      throw new Error("Email is not configured");
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
