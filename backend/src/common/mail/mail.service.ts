import { Injectable } from '@nestjs/common';
import * as nodemailer from 'nodemailer';

@Injectable()
export class MailService {
  private transporter: nodemailer.Transporter | null = null;
  private from: string;

  constructor() {
    const host = process.env.SMTP_HOST;
    const port = parseInt(process.env.SMTP_PORT || '465');
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;
    this.from = process.env.MAIL_FROM || `思政学习系统 <${user}>`;

    if (host && user && pass) {
      this.transporter = nodemailer.createTransport({
        host,
        port,
        secure: true, // QQ SMTP 用 SSL
        auth: { user, pass },
      });
      console.log(`✅ 邮件服务已配置（SMTP: ${host}）`);
    } else {
      console.warn('⚠️ 未配置 SMTP，邮件将打印到控制台');
    }
  }

  async send(to: string, subject: string, html: string) {
    if (!this.transporter) {
      console.log(`\n📧 [DEV MAIL] To: ${to} | Subject: ${subject}\n`);
      return { success: true, devMode: true };
    }

    try {
      const result = await this.transporter.sendMail({
        from: this.from,
        to,
        subject,
        html,
      });
      console.log(`📧 邮件已发送: ${to} (${result.messageId})`);
      return { success: true, id: result.messageId };
    } catch (e: any) {
      console.error('邮件发送失败:', e.message);
      return { success: false, error: e.message };
    }
  }

  sendVerificationEmail(to: string, username: string, token: string) {
    const url = `${process.env.APP_URL || 'http://localhost:3001'}/verify-email?token=${token}`;
    return this.send(
      to,
      '验证你的邮箱 - 思政学习系统',
      `
      <div style="max-width:480px;margin:0 auto;font-family:sans-serif">
        <h2>思政学习系统</h2>
        <p>你好，${username}：</p>
        <p>请点击下方按钮验证你的邮箱地址：</p>
        <a href="${url}" style="display:inline-block;padding:12px 24px;background:#2563eb;color:#fff;text-decoration:none;border-radius:6px">验证邮箱</a>
        <p style="margin-top:20px;color:#888;font-size:12px">链接 15 分钟内有效。如果这不是你操作的，请忽略此邮件。</p>
      </div>
    `,
    );
  }

  sendPasswordResetEmail(to: string, token: string) {
    const url = `${process.env.APP_URL || 'http://localhost:3001'}/reset-password?token=${token}`;
    return this.send(
      to,
      '重置密码 - 思政学习系统',
      `
      <div style="max-width:480px;margin:0 auto;font-family:sans-serif">
        <h2>思政学习系统</h2>
        <p>请点击下方按钮重置你的密码：</p>
        <a href="${url}" style="display:inline-block;padding:12px 24px;background:#2563eb;color:#fff;text-decoration:none;border-radius:6px">重置密码</a>
        <p style="margin-top:20px;color:#888;font-size:12px">链接 15 分钟内有效。如果这不是你操作的，请忽略此邮件。</p>
      </div>
    `,
    );
  }
}
