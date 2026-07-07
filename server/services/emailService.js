const nodemailer = require('nodemailer');

let transporter = null;

function getTransporter() {
  if (transporter) return transporter;

  const host = process.env.SMTP_HOST;
  const port = parseInt(process.env.SMTP_PORT || '465', 10);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!host || !user || !pass) {
    console.warn('SMTP not configured. Set SMTP_HOST, SMTP_USER, SMTP_PASS in .env');
    return null;
  }

  transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  });

  return transporter;
}

async function sendMail({ to, subject, html, text }) {
  const t = getTransporter();
  if (!t) {
    console.log(`[Email Mock] Would send to ${to}: ${subject}`);
    return { mock: true };
  }

  const from = process.env.SMTP_FROM || `"Todoist Clone" <${process.env.SMTP_USER}>`;

  const info = await t.sendMail({
    from,
    to,
    subject,
    html,
    text: text || subject,
  });

  return info;
}

async function sendWelcomeEmail(to, name) {
  return sendMail({
    to,
    subject: '欢迎注册 Todoist Clone',
    html: `
      <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
        <h2 style="color: #DC4C3E;">欢迎，${name}！</h2>
        <p>您的账号已创建成功。</p>
        <p>现在您可以开始管理您的任务了。</p>
        <a href="${process.env.APP_URL || 'http://localhost:5173'}" 
           style="display: inline-block; background: #DC4C3E; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; margin-top: 16px;">
          开始使用
        </a>
      </div>
    `,
  });
}

async function sendPasswordResetEmail(to, resetLink) {
  return sendMail({
    to,
    subject: '密码重置 - Todoist Clone',
    html: `
      <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
        <h2 style="color: #DC4C3E;">密码重置</h2>
        <p>您请求了密码重置。请点击下方链接重置密码：</p>
        <a href="${resetLink}" 
           style="display: inline-block; background: #DC4C3E; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; margin: 16px 0;">
          重置密码
        </a>
        <p style="color: #999; font-size: 12px;">此链接 30 分钟后过期。如果您没有请求重置密码，请忽略此邮件。</p>
      </div>
    `,
  });
}

async function sendTaskReminderEmail(to, taskTitle, dueDate) {
  return sendMail({
    to,
    subject: `任务提醒：${taskTitle}`,
    html: `
      <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
        <h2 style="color: #DC4C3E;">任务提醒</h2>
        <p>您的任务 <strong>${taskTitle}</strong> 将于 ${dueDate} 到期。</p>
        <a href="${process.env.APP_URL || 'http://localhost:5173'}" 
           style="display: inline-block; background: #DC4C3E; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; margin-top: 16px;">
          查看任务
        </a>
      </div>
    `,
  });
}

module.exports = {
  sendMail,
  sendWelcomeEmail,
  sendPasswordResetEmail,
  sendTaskReminderEmail,
};
