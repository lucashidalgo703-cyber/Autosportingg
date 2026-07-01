import nodemailer from 'nodemailer';

export class EmailAdapter {
    static hasOAuthConfig() {
        return !!(
            process.env.SMTP_USER &&
            process.env.SMTP_OAUTH_CLIENT_ID &&
            process.env.SMTP_OAUTH_CLIENT_SECRET &&
            process.env.SMTP_OAUTH_REFRESH_TOKEN
        );
    }

    static hasSmtpConfig() {
        return !!(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);
    }

    static isConfigured() {
        return this.hasOAuthConfig() || this.hasSmtpConfig();
    }

    static getProvider() {
        if (this.hasOAuthConfig()) return 'gmail-oauth';
        if (this.hasSmtpConfig()) return 'smtp';
        return 'none';
    }

    static getStatus() {
        const provider = this.getProvider();
        const oauthMissing = ['SMTP_USER', 'SMTP_OAUTH_CLIENT_ID', 'SMTP_OAUTH_CLIENT_SECRET', 'SMTP_OAUTH_REFRESH_TOKEN']
            .filter((key) => !process.env[key]);
        const smtpMissing = ['SMTP_HOST', 'SMTP_USER', 'SMTP_PASS']
            .filter((key) => !process.env[key]);

        return {
            key: 'email',
            name: 'Correo SMTP / Gmail',
            provider,
            configured: provider !== 'none',
            status: provider !== 'none' ? 'ok' : 'warning',
            detail: provider === 'gmail-oauth'
                ? 'Gmail OAuth2 configurado por variables de entorno.'
                : provider === 'smtp'
                    ? 'SMTP clasico configurado por variables de entorno.'
                    : 'No hay credenciales SMTP ni Gmail OAuth2 configuradas.',
            missing: provider === 'none' ? Array.from(new Set([...oauthMissing, ...smtpMissing])) : []
        };
    }

    static getTransporter() {
        if (this.hasOAuthConfig()) {
            return nodemailer.createTransport({
                service: 'gmail',
                auth: {
                    type: 'OAuth2',
                    user: process.env.SMTP_USER,
                    clientId: process.env.SMTP_OAUTH_CLIENT_ID,
                    clientSecret: process.env.SMTP_OAUTH_CLIENT_SECRET,
                    refreshToken: process.env.SMTP_OAUTH_REFRESH_TOKEN
                }
            });
        }

        if (this.hasSmtpConfig()) {
            return nodemailer.createTransport({
                host: process.env.SMTP_HOST,
                port: Number(process.env.SMTP_PORT || 587),
                secure: process.env.SMTP_PORT === '465',
                auth: {
                    user: process.env.SMTP_USER,
                    pass: process.env.SMTP_PASS
                }
            });
        }

        throw new Error('Integracion de Correo no configurada.');
    }

    static async sendEmail(to, subject, html, attachments = []) {
        if (!this.isConfigured()) {
            throw new Error('Integracion de Correo no configurada.');
        }

        const transporter = this.getTransporter();

        const mailOptions = {
            from: process.env.SMTP_FROM || process.env.SMTP_USER,
            to,
            subject,
            html,
            attachments
        };

        const info = await transporter.sendMail(mailOptions);
        return info;
    }
}
