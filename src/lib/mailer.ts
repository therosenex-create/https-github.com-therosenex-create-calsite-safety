export type InvitationMessage = {
  to: string;
  companyName: string;
  inviteeName: string;
};

export type MailResult = {
  delivered: boolean;
  provider: string;
  reason: string;
};

export interface Mailer {
  sendInvitation(message: InvitationMessage): Promise<MailResult>;
}

class UnconfiguredMailer implements Mailer {
  async sendInvitation(): Promise<MailResult> {
    const provider = process.env.EMAIL_PROVIDER?.trim() || "unset";
    return {
      delivered: false,
      provider,
      reason: provider === "unset"
        ? "EMAIL_PROVIDER is not set. No message was sent."
        : `EMAIL_PROVIDER=${provider} has no sender in this build. No message was sent.`,
    };
  }
}

export function getMailer(): Mailer {
  return new UnconfiguredMailer();
}
