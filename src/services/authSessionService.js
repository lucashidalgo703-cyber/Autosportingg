import crypto from 'node:crypto';
import jwt from 'jsonwebtoken';
import connectDB from '../config/db.js';
import AdminUser from '../models/AdminUser.js';
import LoginSession from '../models/LoginSession.js';
import { credentialFingerprint } from './emailLoginService.js';
const sessionHash = value => crypto.createHash('sha256').update(value).digest('hex');
const userClaims = user => ({
    id: String(user._id), userId: String(user._id), email: user.email,
    username: user.name, role: user.role, permissions: user.permissions || []
});
// Called only after the login challenge has been consumed on the server.
export async function createLoginSession(user) {
    const sid = crypto.randomBytes(32).toString('base64url');
    await LoginSession.create({
        _id: sessionHash(sid), userId: user._id,
        credentialFingerprint: credentialFingerprint(user),
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000)
    });
    const token = jwt.sign({
        ...userClaims(user), type: 'session', emailVerified: true, sid
    }, process.env.JWT_SECRET.trim(), { expiresIn: '24h', algorithm: 'HS256' });
    return { token, name: user.name, role: user.role };
}
// Shared by Express and Next: old tokens and all pending challenges fail closed.
export async function validateLoginSession(token) {
    let decoded;
    try { decoded = jwt.verify(token, process.env.JWT_SECRET?.trim(), { algorithms: ['HS256'] }); }
    catch { return null; }
    if (decoded.type !== 'session' || decoded.emailVerified !== true
        || typeof decoded.sid !== 'string' || decoded.sid.length !== 43
        || !decoded.exp || typeof decoded.id !== 'string' || !/^[a-f\d]{24}$/i.test(decoded.id)) return null;
    await connectDB();
    const session = await LoginSession.findOne({
        _id: sessionHash(decoded.sid), userId: decoded.id,
        revokedAt: null, expiresAt: { $gt: new Date() }
    }).lean();
    if (!session) return null;
    const user = await AdminUser.findById(session.userId).lean();
    if (!user?.active || session.credentialFingerprint !== credentialFingerprint(user)) return null;
    return { ...userClaims(user), sid: decoded.sid, type: 'session', emailVerified: true };
}
export async function revokeLoginSession(sid) {
    await LoginSession.updateOne({ _id: sessionHash(sid), revokedAt: null }, {
        $set: { revokedAt: new Date() }
    });
}
