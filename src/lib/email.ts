import { Resend } from "resend";

const apiKey = process.env.RESEND_API_KEY;
const from = process.env.EMAIL_FROM ?? "Estudio Mezher Pampin <onboarding@resend.dev>";

const resend = apiKey ? new Resend(apiKey) : null;

type SendArgs = {
  to: string | string[];
  subject: string;
  html: string;
  replyTo?: string;
};

/**
 * Envía un email vía Resend. Si no hay API key configurada,
 * loguea el contenido en consola (modo desarrollo) y no falla.
 */
export async function sendEmail({ to, subject, html, replyTo }: SendArgs) {
  if (!resend) {
    console.warn("[email] RESEND_API_KEY no configurada. Email no enviado:");
    console.warn(`  Para: ${Array.isArray(to) ? to.join(", ") : to}`);
    console.warn(`  Asunto: ${subject}`);
    return { skipped: true as const };
  }

  const { data, error } = await resend.emails.send({
    from,
    to,
    subject,
    html,
    replyTo,
  });

  if (error) {
    console.error("[email] Error al enviar:", error);
    throw new Error(error.message);
  }

  return { id: data?.id, skipped: false as const };
}

export function emailLayout(title: string, body: string) {
  return `
  <div style="font-family: -apple-system, Segoe UI, Roboto, Arial, sans-serif; background:#f1f5f9; padding:24px;">
    <div style="max-width:560px; margin:0 auto; background:#ffffff; border-radius:12px; overflow:hidden; border:1px solid #e2e8f0;">
      <div style="background:#1e3a5f; padding:20px 24px;">
        <h1 style="margin:0; color:#fff; font-size:18px;">Estudio Mezher Pampin</h1>
      </div>
      <div style="padding:24px;">
        <h2 style="margin:0 0 12px; color:#1e293b; font-size:16px;">${title}</h2>
        <div style="color:#475569; font-size:14px; line-height:1.6;">${body}</div>
      </div>
      <div style="padding:16px 24px; background:#f8fafc; color:#94a3b8; font-size:12px; border-top:1px solid #e2e8f0;">
        Este es un mensaje automático del sistema de gestión del estudio.
      </div>
    </div>
  </div>`;
}
