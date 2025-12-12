import nodemailer from "nodemailer";

export type SendInviteEmailInput = {
  to: string;
  inviteeName?: string;
  loginUrl: string;
  allowedDomainsHint?: string;
};

export async function sendInviteEmail(input: SendInviteEmailInput): Promise<
  | { sent: true }
  | { sent: false; reason: string }
> {
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT ?? "587");
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const from = process.env.SMTP_FROM || user;

  if (!host || !user || !pass || !from) {
    return {
      sent: false,
      reason:
        "SMTP não configurado (defina SMTP_HOST/SMTP_PORT/SMTP_USER/SMTP_PASS/SMTP_FROM no .env)",
    };
  }

  const secure = (process.env.SMTP_SECURE ?? "false") === "true";

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure,
    auth: { user, pass },
  });

  const appName = process.env.APP_NAME || "Aura Core";
  const subject = `Convite de acesso - ${appName}`;

  const greeting = input.inviteeName ? `Olá, ${input.inviteeName}` : "Olá";
  const domainsLine = input.allowedDomainsHint
    ? `Domínios permitidos: ${input.allowedDomainsHint}`
    : "";

  const text = [
    `${greeting}!`,
    "",
    `Você foi convidado(a) para acessar o ${appName}.`,
    "",
    "Para acessar, use o login com Google Workspace (email corporativo) no link abaixo:",
    input.loginUrl,
    domainsLine ? "" : undefined,
    domainsLine || undefined,
    "",
    "Se você não esperava este convite, ignore este email.",
  ]
    .filter(Boolean)
    .join("\n");

  const html = `
    <div style="font-family: Arial, sans-serif; line-height: 1.5;">
      <p>${greeting}!</p>
      <p>Você foi convidado(a) para acessar o <strong>${appName}</strong>.</p>
      <p>
        Para acessar, use o login com <strong>Google Workspace</strong> (email corporativo) no link abaixo:
      </p>
      <p><a href="${input.loginUrl}">${input.loginUrl}</a></p>
      ${domainsLine ? `<p style="color:#666; font-size:12px;">${domainsLine}</p>` : ""}
      <hr />
      <p style="color:#666; font-size:12px;">Se você não esperava este convite, ignore este email.</p>
    </div>
  `;

  await transporter.sendMail({
    from,
    to: input.to,
    subject,
    text,
    html,
  });

  return { sent: true };
}

