type Email = { to: string; subject: string; text: string; html?: string };

// dev (no key) → log to console; prod → Resend. Sender per project config.
export async function sendEmail(email: Email): Promise<{ dev: boolean; id?: string }> {
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    // dev-only convenience; never log recipient PII on prod paths.
    console.info(`[email:dev] to=${email.to} subject="${email.subject}"\n${email.text}`);
    return { dev: true };
  }
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: `${process.env.RESEND_FROM_NAME ?? 'KING STUDIO'} <${process.env.RESEND_FROM_EMAIL ?? 'join@kingstudio.co.kr'}>`,
      to: email.to,
      subject: email.subject,
      text: email.text,
      html: email.html,
    }),
  });
  const data = (await res.json()) as { id?: string };
  return { dev: false, id: data.id };
}
