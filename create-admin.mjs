import mongoose from 'mongoose';
import crypto from 'crypto';

const URI = "mongodb+srv://Admin:AutoSporting2026@autosporting.s3i5tty.mongodb.net/autosportingg-rnix?retryWrites=true&w=majority&authSource=admin&appName=AutoSporting";

const adminUserSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    passwordHash: { type: String, required: true },
    role: { type: String, default: 'solo_lectura' },
    active: { type: Boolean, default: true },
    permissions: { type: [String], default: [] }
}, { timestamps: true });

const AdminUser = mongoose.models.AdminUser || mongoose.model('AdminUser', adminUserSchema);

const hashPassword = (password) => {
    const salt = crypto.randomBytes(16).toString('hex');
    const hash = crypto.scryptSync(password, salt, 64).toString('hex');
    return `${salt}:${hash}`;
};

async function run() {
    try {
        await mongoose.connect(URI);
        console.log('Conectado a la base de datos autosportingg-rnix');
        
        await AdminUser.deleteMany({ email: 'tomasbrazao@icloud.com' });

        const user = new AdminUser({
            email: 'tomasbrazao@icloud.com',
            passwordHash: hashPassword('polo2018'),
            role: 'owner',
            name: 'Tomas',
            active: true,
            permissions: ['*']
        });
        
        await user.save();
        console.log('USUARIO CREADO CON EXITO');
    } catch (e) {
        console.error('ERROR:', e);
    } finally {
        await mongoose.disconnect();
        process.exit(0);
    }
}

run();
