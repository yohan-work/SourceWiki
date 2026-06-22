import nodemailer from 'nodemailer';

import { env } from '../config/env.js';

export interface Mailer {
  sendVerification(input: {
    email: string;
    nickname: string;
    verificationUrl: string;
  }): Promise<void>;
}

const transport = nodemailer.createTransport({
  host: env.SMTP_HOST,
  port: env.SMTP_PORT,
  secure: false,
  connectionTimeout: 5_000,
  socketTimeout: 10_000,
});

export const smtpMailer: Mailer = {
  async sendVerification({ email, nickname, verificationUrl }) {
    await transport.sendMail({
      from: env.SMTP_FROM,
      to: email,
      subject: '[SourceLink Wiki] 이메일을 인증해 주세요',
      text: `${nickname}님, 아래 링크에서 이메일 인증을 완료해 주세요.\n\n${verificationUrl}\n\n이 링크는 30분 동안 유효합니다.`,
      html: `<p>SourceLink Wiki 가입을 완료하려면 이메일을 인증해 주세요.</p><p><a href="${verificationUrl}">이메일 인증하기</a></p><p>이 링크는 30분 동안 유효합니다.</p>`,
    });
  },
};
