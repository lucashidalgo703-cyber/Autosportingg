#!/usr/bin/env node
/**
 * AUTOSPORTING INTELLIGENCE — SCRIPT DE RECUPERACIÓN DE EMERGENCIA FUERA DE BANDA
 * 
 * Uso:
 *   node scripts/emergency-recovery-owner.js
 * 
 * Requiere:
 *   - MONGODB_URI (acceso administrativo con IP autorizada en Atlas)
 *   - MASTER_RECOVERY_KEY (clave maestra fuera de banda resguardada físicamente)
 */

import readline from 'readline';
import dotenv from 'dotenv';
dotenv.config();

import connectDB from '../src/config/db.js';
import { executeOwnerEmergencyRecovery } from '../src/services/emergencyRecoveryService.js';

async function main() {
    console.log('===============================================================');
    console.log(' AUTOSPORTING INTELLIGENCE — RECUPERACIÓN DE DESASTRE DE MFA');
    console.log('===============================================================\n');

    await connectDB();

    const envEmail = process.env.CONFIRM_OWNER_EMAIL;
    const envKey = process.env.MASTER_RECOVERY_KEY || process.env.EMERGENCY_RECOVERY_KEY;

    let email = envEmail;
    let masterKey = envKey;

    if (!email || !masterKey) {
        const rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout
        });

        const ask = (query) => new Promise(resolve => rl.question(query, resolve));

        if (!email) {
            email = await ask('Ingrese el correo electrónico del Propietario: ');
        }
        if (!masterKey) {
            masterKey = await ask('Ingrese la clave maestra de contingencia fuera de banda: ');
        }
        rl.close();
    }

    try {
        console.log('\nEjecutando procedimiento administrativo atómico...');
        const result = await executeOwnerEmergencyRecovery({
            email,
            masterRecoveryKey: masterKey,
            reason: 'Recuperación de desastre fuera de banda ejecutada desde CLI'
        });

        console.log('\n✅ RECUPERACIÓN EXITOSA:');
        console.log(`- Propietario: ${result.email}`);
        console.log(`- Segundo factor (2FA): Desactivado`);
        console.log(`- Passkeys revocadas: ${result.revokedPasskeys}`);
        console.log(`- Dispositivos revocados: ${result.revokedDevices}`);
        console.log(`- Sesiones activas invalidadas: ${result.revokedSessions}`);
        console.log(`- Registro de auditoría emitido: ${result.auditLogId}`);
        console.log(`- Hash HMAC de auditoría: ${result.auditHash}`);
        console.log('\nEn el próximo inicio de sesión, el propietario deberá ingresar con su contraseña, reconfigurar su 2FA e inscribir sus nuevos dispositivos confiables.');
        process.exit(0);
    } catch (err) {
        console.error('\n❌ ERROR DURANTE LA RECUPERACIÓN:', err.message);
        process.exit(1);
    }
}

if (process.argv[1]?.endsWith('emergency-recovery-owner.js')) {
    main();
}
