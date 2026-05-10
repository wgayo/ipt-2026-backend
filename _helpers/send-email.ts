import nodemailer from 'nodemailer';
import fs from 'fs';
import path from 'path';
import https from 'https';

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
    const defaultTimeouts = {
        connectionTimeout: 10000,
        greetingTimeout: 10000,
        socketTimeout: 10000
    };

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
                : undefined,
            ...defaultTimeouts
        };
    }

    if (!fileConfig.smtpOptions) throw 'SMTP configuration is missing';
    return {
        ...defaultTimeouts,
        ...fileConfig.smtpOptions
    };
}

function httpJsonRequest(url: string, method: string, headers: Record<string, string>, body: any, timeoutMs = 15000) {
    return new Promise<any>((resolve, reject) => {
        const target = new URL(url);
        const data = JSON.stringify(body);

        const req = https.request({
            protocol: target.protocol,
            hostname: target.hostname,
            port: target.port || 443,
            path: target.pathname + target.search,
            method,
            headers: {
                ...headers,
                'Content-Length': Buffer.byteLength(data).toString()
            }
        }, (res) => {
            let raw = '';
            res.setEncoding('utf8');
            res.on('data', (chunk) => raw += chunk);
            res.on('end', () => {
                let parsed: any = raw;
                try { parsed = raw ? JSON.parse(raw) : {}; } catch { }

                const ok = (res.statusCode || 0) >= 200 && (res.statusCode || 0) < 300;
                if (!ok) {
                    const message = parsed?.message || parsed?.error || `Email API request failed (${res.statusCode})`;
                    return reject(message);
                }

                resolve(parsed);
            });
        });

        req.on('error', reject);
        req.setTimeout(timeoutMs, () => req.destroy(new Error('Connection timeout')));
        req.write(data);
        req.end();
    });
}

async function sendWithResend({ to, subject, html, from }: any) {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) throw 'RESEND_API_KEY is required to send emails via Resend';

    const payload = {
        from: from || getEmailFrom(),
        to: Array.isArray(to) ? to : [to],
        subject,
        html
    };

    await httpJsonRequest(
        'https://api.resend.com/emails',
        'POST',
        {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json'
        },
        payload
    );
}

async function sendEmail({ to, subject, html, from }: any) {
    const hasResend = !!process.env.RESEND_API_KEY;
    const hasSmtp = !!process.env.SMTP_HOST || !!fileConfig.smtpOptions;

    if (process.env.NODE_ENV === 'production' && !hasResend && !process.env.SMTP_HOST) {
        throw 'Email is not configured. Set RESEND_API_KEY (recommended) or SMTP_* environment variables.';
    }

    if (hasResend) {
        return await sendWithResend({ to, subject, html, from });
    }

    if (!hasSmtp) throw 'SMTP configuration is missing';

    const transporter = nodemailer.createTransport(getSmtpOptions());
    await transporter.sendMail({ from: from || getEmailFrom(), to, subject, html });
}
