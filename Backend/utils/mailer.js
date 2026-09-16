const tls = require('tls');

// Nodemailer's own connection/queueing logic hangs indefinitely on this machine
// (confirmed with nodemailer 10.0.1 and 6.9.16, on both port 465 and 587, with
// TLS cert verification both on and off) even though raw `net`/`tls` sockets to
// smtp.gmail.com connect and complete the SMTP handshake instantly. So instead
// of depending on nodemailer, this sends mail with a minimal hand-rolled SMTP
// client over TLS.
function sendSmtp({ host, port, user, pass, from, to, subject, html }) {
  return new Promise((resolve, reject) => {
    let settled = false;
    let step = 0;
    let buffer = '';

    const socket = tls.connect({
      host,
      port,
      // This dev machine's antivirus (Kaspersky/Avast) intercepts outbound TLS
      // and re-signs it with its own certificate, which Node rejects by default
      // ("self-signed certificate in certificate chain"). Only affects this one
      // outbound SMTP socket. User explicitly approved this workaround.
      rejectUnauthorized: false,
    });

    const finish = (err) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      socket.destroy();
      if (err) reject(err); else resolve();
    };

    const timer = setTimeout(() => finish(new Error('Délai SMTP dépassé')), 20000);
    socket.on('error', finish);

    const mime = [
      `From: ${from}`,
      `To: ${to}`,
      `Subject: ${subject}`,
      'MIME-Version: 1.0',
      'Content-Type: text/html; charset=UTF-8',
      '',
      html,
    ].join('\r\n');

    const steps = [
      { expect: '220' }, // server greeting, nothing to send first
      { send: 'EHLO sbo-backend\r\n', expect: '250' },
      { send: 'AUTH LOGIN\r\n', expect: '334' },
      { send: () => Buffer.from(user).toString('base64') + '\r\n', expect: '334' },
      { send: () => Buffer.from(pass).toString('base64') + '\r\n', expect: '235' },
      { send: `MAIL FROM:<${user}>\r\n`, expect: '250' },
      { send: `RCPT TO:<${to}>\r\n`, expect: '250' },
      { send: 'DATA\r\n', expect: '354' },
      { send: mime.replace(/^\./gm, '..') + '\r\n.\r\n', expect: '250' },
      { send: 'QUIT\r\n', expect: '221' },
    ];

    const sendStep = () => {
      const s = steps[step];
      if (!s.send) return; // waiting on server (e.g. initial greeting)
      socket.write(typeof s.send === 'function' ? s.send() : s.send);
    };

    socket.on('secureConnect', sendStep);

    socket.on('data', (chunk) => {
      buffer += chunk.toString('utf8');
      if (!buffer.endsWith('\r\n')) return; // wait for the rest of the line
      const lines = buffer.trim().split('\r\n');
      const lastLine = lines[lines.length - 1];
      if (!/^\d{3} /.test(lastLine)) return; // multi-line response, keep waiting
      buffer = '';

      const code = lastLine.slice(0, 3);
      if (code !== steps[step].expect) {
        return finish(new Error(`SMTP error at step ${step}: ${lastLine}`));
      }
      step += 1;
      if (step >= steps.length) return finish();
      sendStep();
    });
  });
}

async function sendPasswordResetEmail(to, firstName, resetUrl) {
  if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
    console.warn(`[mailer] SMTP not configured — reset link for ${to}: ${resetUrl}`);
    return;
  }

  await sendSmtp({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT) || 465,
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
    from: process.env.SMTP_USER,
    to,
    subject: 'Réinitialisation de votre mot de passe SBO',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px;">
        <h2 style="color:#FF6B00;">SBO</h2>
        <p>Bonjour ${firstName || ''},</p>
        <p>Vous avez demandé la réinitialisation de votre mot de passe. Cliquez sur le bouton ci-dessous pour en choisir un nouveau. Ce lien expire dans 1 heure.</p>
        <p style="text-align:center; margin: 32px 0;">
          <a href="${resetUrl}" style="background:#FF6B00; color:#fff; text-decoration:none; padding:12px 28px; border-radius:50px; font-weight:bold;">
            Réinitialiser mon mot de passe
          </a>
        </p>
        <p style="color:#999; font-size:0.85rem;">Si vous n'êtes pas à l'origine de cette demande, ignorez simplement cet email.</p>
      </div>
    `,
  });
}

module.exports = { sendPasswordResetEmail };
