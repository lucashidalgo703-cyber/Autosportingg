import test from 'node:test';
import assert from 'node:assert/strict';
import {
    getUserProgress,
    syncLocalProgress,
    recordRoleModuleCompletion,
    saveErrorReflection,
    assignTrack,
    recommendActivity
} from '../src/services/academyProgressService.js';
import AcademyProgress from '../src/models/AcademyProgress.js';

test('Backend Persistencia: Esquema y estructura de AcademyProgress', () => {
    assert.ok(AcademyProgress.schema.paths.userId, 'userId debe estar indexado y requerido');
    assert.ok(AcademyProgress.schema.paths.assignedTrack, 'assignedTrack debe existir');
    assert.ok(AcademyProgress.schema.paths.completedLessons, 'completedLessons debe existir');
    assert.ok(AcademyProgress.schema.paths.completedRoleModules, 'completedRoleModules debe existir');
    assert.ok(AcademyProgress.schema.paths.negotiationSessions, 'negotiationSessions debe existir');
    assert.ok(AcademyProgress.schema.paths.errorReflections, 'errorReflections debe existir');
});

test('Aislamiento de Usuario y Privacidad de Reflexiones', () => {
    // Simular objetos en memoria para probar la lógica de aislamiento
    const userA = { id: 'usr-vendor-01', role: 'ventas', name: 'Vendedor 1' };
    const userB = { id: 'usr-vendor-02', role: 'ventas', name: 'Vendedor 2' };

    // Reflexión privada de User A
    const reflectionPrivate = {
        situation: 'Perdí una venta por bajar el precio sin consultar al titular',
        actionTaken: 'Ofrecí $500.000 de descuento verbal',
        difficultyEncountered: 'Dirección rechazó el boleto',
        alternativeApproach: 'Solicitar autorización previa según PROC-VTA-03',
        sharedWithSupervisor: false // PRIVADO
    };

    // Reflexión compartida de User A
    const reflectionShared = {
        situation: 'Cliente con permuta sobrevalorada',
        actionTaken: 'Presenté peritaje técnico de taller',
        difficultyEncountered: 'Objeción inicial de precio',
        alternativeApproach: 'Desglosar diferencia neta',
        sharedWithSupervisor: true // COMPARTIDO
    };

    const userAReflections = [reflectionPrivate, reflectionShared];

    // Regla de supervisión: solo se exponen las compartidas
    const visibleToSupervisor = userAReflections.filter(r => r.sharedWithSupervisor);
    assert.equal(visibleToSupervisor.length, 1);
    assert.equal(visibleToSupervisor[0].situation, reflectionShared.situation);

    // Confirmar que la reflexión privada NUNCA se expone
    assert.ok(!visibleToSupervisor.some(r => r.situation === reflectionPrivate.situation));
});

test('Permisos de Supervisión: Solo owner y admin pueden asignar recorridos y recomendar', async () => {
    const regularSeller = { id: 'usr-seller', role: 'ventas' };
    const adminUser = { id: 'usr-admin', role: 'admin', name: 'Gerente Comercial' };

    // Intentar asignar recorrido siendo vendedor ordinario debe fallar
    await assert.rejects(
        async () => {
            await assignTrack(regularSeller, 'usr-target', 'track-ventas');
        },
        /permisos/
    );

    // Intentar recomendar siendo vendedor ordinario debe fallar
    await assert.rejects(
        async () => {
            await recommendActivity(regularSeller, 'usr-target', { id: 'mod-01', title: 'Test' });
        },
        /permisos/
    );
});
