#!/usr/bin/env node
/**
 * AUTOSPORTING INTELLIGENCE — GUÍA INTERACTIVA Y VERIFICADOR PARA PRUEBA REAL CON WINDOWS HELLO
 * 
 * Este script prepara el entorno local y guía al Propietario paso a paso para realizar
 * la prueba real de enrolamiento y autenticación WebAuthn con Windows Hello en su navegador.
 * 
 * NOTA CRÍTICA DE SEGURIDAD:
 * La autenticación biométrica de Windows Hello (reconocimiento facial, huella digital o PIN de Hello)
 * se ejecuta dentro del hardware de seguridad (TPM 2.0 / procesador de seguridad) de Windows.
 * POR DEFINICIÓN TÉCNICA, ESTA PRUEBA NO PUEDE SER SIMULADA POR UN AGENTE AUTOMATIZADO NI EN UN ENTORNO
 * HEADLESS: REQUIERE INTERVENCIÓN FÍSICA Y CONFIRMACIÓN HUMANA DIRECTA DEL PROPIETARIO ANTE EL SENSOR.
 */

import dotenv from 'dotenv';
dotenv.config();

import mongoose from 'mongoose';
import AdminUser from '../src/models/AdminUser.js';
import PasskeyCredential from '../src/models/PasskeyCredential.js';
import connectDB from '../src/config/db.js';

async function main() {
    console.log('========================================================================');
    console.log(' AUTOSPORTING INTELLIGENCE — PROCEDIMIENTO DE PRUEBA REAL CON WINDOWS HELLO');
    console.log('========================================================================\n');

    console.log('📌 REQUISITO FUNDAMENTAL:');
    console.log('Esta prueba valida la interacción real con el sensor biométrico / TPM de Windows.');
    console.log('Debe ser ejecutada directamente por el Propietario en su PC con Windows 10 u 11.\n');

    let dbConnected = false;
    try {
        await connectDB();
        dbConnected = true;
        console.log('✔ Conexión a base de datos local verificada.');
    } catch (err) {
        console.log('⚠ Base de datos no conectada en este terminal:', err.message);
        console.log('  (Asegúrese de tener MongoDB en ejecución antes de levantar el servidor web)\n');
    }

    if (dbConnected) {
        const owner = await AdminUser.findOne({ role: 'owner', active: true });
        if (owner) {
            console.log(`✔ Cuenta de Propietario detectada: ${owner.email} (${owner.name})`);
            const passkeys = await PasskeyCredential.find({ userId: owner._id, status: 'active' });
            console.log(`ℹ Passkeys activas actualmente registradas: ${passkeys.length}`);
            passkeys.forEach((pk, i) => {
                console.log(`   [${i + 1}] ${pk.name} (ID: ${pk.credentialId.substring(0, 16)}...)`);
            });
        } else {
            console.log('⚠ No se encontró una cuenta con rol "owner" en la base de datos local.');
        }
        await mongoose.connection.close();
    }

    console.log('\n------------------------------------------------------------------------');
    console.log(' PASO A PASO PARA EL PROPIETARIO EN EL NAVEGADOR (CHROME / EDGE):');
    console.log('------------------------------------------------------------------------');
    console.log('1. Iniciar el servidor local del CRM:');
    console.log('   > npm run dev');
    console.log('   (El CRM estará disponible en http://localhost:3000 o http://localhost:3001)\n');

    console.log('2. Abrir Microsoft Edge o Google Chrome e ingresar a la URL local:');
    console.log('   http://localhost:3000/dashboard/seguridad (o iniciar sesión con credenciales de Propietario)\n');

    console.log('3. ENROLAMIENTO DE WINDOWS HELLO (Registro de la primera passkey):');
    console.log('   a. Ir a la sección "Passkeys / WebAuthn" en el Centro de Seguridad.');
    console.log('   b. Hacer clic en "Registrar nueva Passkey (Windows Hello)".');
    console.log('   c. OBSERVACIÓN FÍSICA ESPERADA: El navegador mostrará la ventana nativa de Windows:');
    console.log('      "Hacer una clave de paso" o "Windows Security: Verificando su identidad".');
    console.log('   d. Apoyar el dedo en el lector de huellas, mirar a la cámara infrarroja o ingresar el PIN de Windows Hello.');
    console.log('   e. El navegador registrará la clave pública en MongoDB y confirmará: "Passkey registrada exitosamente".\n');

    console.log('4. PRUEBA DE INICIO DE SESIÓN CON SEGUNDO FACTOR WEBAUTHN:');
    console.log('   a. Cerrar sesión en el CRM.');
    console.log('   b. En la pantalla de login, ingresar correo y contraseña del Propietario.');
    console.log('   c. En el segundo factor, seleccionar "Ingresar con Passkey / Windows Hello".');
    console.log('   d. OBSERVACIÓN FÍSICA ESPERADA: La ventana de Windows Hello se abrirá solicitando autenticación biométrica.');
    console.log('   e. Tras validar la biometría, el ingreso al CRM se completa de inmediato sin necesidad de ingresar código de 6 dígitos.\n');

    console.log('5. PRUEBA DE REVOCACIÓN Y FALLBACK TOTP:');
    console.log('   a. Desde el Centro de Seguridad, hacer clic en "Revocar" junto a la Passkey de prueba.');
    console.log('   b. Cerrar sesión e intentar ingresar nuevamente: el sistema ofrecerá automáticamente Google Authenticator / TOTP.');
    console.log('   c. Ingresar con código TOTP de 6 dígitos para validar la convivencia ininterrumpida de ambos factores.\n');

    console.log('------------------------------------------------------------------------');
    console.log(' ESTADO DE LA PRUEBA: PREPARADA Y DOCUMENTADA (PENDIENTE EJECUCIÓN FÍSICA)');
    console.log(' Antigravity NO simula la confirmación biométrica por tratarse de un requisito de hardware real.');
    console.log('------------------------------------------------------------------------\n');
}

main().catch(console.error);
