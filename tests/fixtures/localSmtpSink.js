// Loopback-only SMTP sink for the disposable Next.js preview. It never relays.
import net from 'node:net';

const decodeQuoted = value => Buffer.from(value.replace(/=\r?\n/g, '').replace(/=([a-f0-9]{2})/gi,
    (_match, hex) => String.fromCharCode(parseInt(hex, 16))), 'latin1').toString('utf8');
function parseMessage(raw) {
    const split = raw.indexOf('\r\n\r\n');
    const headers = raw.slice(0, split).replace(/\r\n[ \t]+/g, ' ');
    const subject = (headers.match(/^Subject:\s*(.*)$/mi)?.[1] || '').replace(/(\?=)[ \t]+(?==\?UTF-8\?[BQ]\?)/gi, '$1').replace(/=\?UTF-8\?([BQ])\?([^?]*)\?=/gi,
        (_match, encoding, value) => encoding.toUpperCase() === 'B' ? Buffer.from(value, 'base64').toString('utf8') : decodeQuoted(value.replace(/_/g, ' ')));
    const boundary = headers.match(/boundary="?([^";\r\n]+)"?/i)?.[1];
    const parts = boundary ? raw.slice(split + 4).split('--' + boundary) : [raw];
    let html = '';
    for (const part of parts) {
        const offset = part.indexOf('\r\n\r\n');
        const head = part.slice(0, offset);
        if (!/Content-Type:\s*text\/html\b/i.test(head)) continue;
        const body = part.slice(offset + 4).trim();
        html = /Content-Transfer-Encoding:\s*base64/i.test(head) ? Buffer.from(body, 'base64').toString('utf8')
            : /Content-Transfer-Encoding:\s*quoted-printable/i.test(head) ? decodeQuoted(body) : body;
    }
    return { subject, html, raw };
}
export async function startLocalSmtpSink(mailbox, allowedRecipients) {
    const allowed = new Set(allowedRecipients.map(value => value.toLowerCase()));
    const sockets = new Set();
    const server = net.createServer(socket => {
        sockets.add(socket); socket.on('close', () => sockets.delete(socket)); socket.on('error', () => {});
        socket.setTimeout(15000, () => socket.destroy());
        let buffer = '', recipients = [], data = null, authStep = 0;
        const reply = value => socket.write(value + '\r\n');
        reply('220 local-preview.test SMTP sink');
        socket.on('data', chunk => {
            buffer += chunk.toString();
            if (buffer.length > 2 * 1024 * 1024) return socket.destroy();
            let index;
            while ((index = buffer.indexOf('\r\n')) >= 0) {
                const line = buffer.slice(0, index); buffer = buffer.slice(index + 2);
                if (data) {
                    if (line === '.') {
                        mailbox.push({ to: recipients[0], ...parseMessage(data.join('\r\n')) });
                        data = null; recipients = []; reply('250 Captured locally');
                    } else { data.push(line.startsWith('..') ? line.slice(1) : line); }
                } else if (authStep) {
                    if (authStep === 1) { authStep = 2; reply('334 UGFzc3dvcmQ6'); }
                    else { authStep = 0; reply('235 Local fixture authenticated'); }
                } else if (/^(EHLO|HELO)\b/i.test(line)) reply('250-local-preview.test\r\n250-AUTH PLAIN LOGIN\r\n250 SIZE 2097152');
                else if (/^AUTH LOGIN/i.test(line)) { authStep = 1; reply('334 VXNlcm5hbWU6'); }
                else if (/^AUTH PLAIN/i.test(line)) reply('235 Local fixture authenticated');
                else if (/^MAIL FROM:/i.test(line)) { recipients = []; reply('250 OK'); }
                else if (/^RCPT TO:/i.test(line)) {
                    const to = line.match(/<([^>]+)>/)?.[1]?.toLowerCase();
                    if (!allowed.has(to) || recipients.length) reply('550 Non-fixture or extra recipient blocked');
                    else { recipients.push(to); reply('250 OK'); }
                } else if (/^DATA$/i.test(line)) {
                    if (!recipients.length) reply('554 No fixture recipient');
                    else { data = []; reply('354 Finish with a dot'); }
                } else if (/^QUIT$/i.test(line)) { reply('221 Goodbye'); socket.end(); }
                else if (/^RSET$/i.test(line)) { recipients = []; reply('250 OK'); }
                else reply('250 OK');
            }
        });
    });
    await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
    return { port: server.address().port, stop: async () => {
        for (const socket of sockets) socket.destroy();
        await new Promise(resolve => server.close(resolve));
    } };
}
