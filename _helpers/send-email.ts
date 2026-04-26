import nodemailer from 'nodemailer';
import fs from 'fs';
import path from 'path';

export default sendEmail;

type FileConfig = {
    emailFrom?: string;
    smtpOptions?: any;
};

function loadFileConfig(): FileConfig {
    try {
        const configPath = path.resolve(__dirname, '..', 'config.json');
        const raw = fs.readFileSync(configPath, 'utf8');
        return JSON.parse(raw);
    } catch {
        return {};
    }
}

const fileConfig: FileConfig = process.env.NODE_ENV === 'production' ? {} : loadFileConfig();

function getEmailFrom() {
    const emailFrom = process.env.EMAIL_FROM || fileConfig.emailFrom;
    if (!emailFrom) throw 'EMAIL_FROM is required to send emails';
    return emailFrom;
}

function getSmtpOptions() {
    if (process.env.NODE_ENV === 'production' && !process.env.SMTP_HOST) {
        throw 'SMTP_HOST environment variable is required in production to send emails';
    }

    if (process.env.SMTP_HOST) {
        return {
            host: process.env.SMTP_HOST,
            port: process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT, 10) : 587,
            secure: process.env.SMTP_SECURE === 'true',
            auth: process.env.SMTP_USER
                ? {
                    user: process.env.SMTP_USER,
                    pass: process.env.SMTP_PASS
                }
                : undefined
        };
    }

    if (!fileConfig.smtpOptions) throw 'SMTP configuration is missing';
    return fileConfig.smtpOptions;
}

async function sendEmail({ to, subject, html, from }: any) {
    const transporter = nodemailer.createTransport(getSmtpOptions());
    await transporter.sendMail({ from: from || getEmailFrom(), to, subject, html });
}
