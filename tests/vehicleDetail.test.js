import test from 'node:test';
import assert from 'node:assert/strict';
import { canReserveVehicle, getVehicleOperationalStatus, getVehicleReservationInitialData, getVehicleDetailSection, getVehicleStatusLabel } from '../src/utils/vehicleDetail.js';

test('mapped vehicles use their actual operative status when raw status is absent', () => {
    assert.equal(getVehicleOperationalStatus({ estado: 'reservado' }), 'reservado');
    assert.equal(canReserveVehicle({ estado: 'reservado' }), false);
    assert.equal(canReserveVehicle({ estado: 'vendido' }), false);
    assert.equal(canReserveVehicle({ estado: 'pausado' }), false);
});

test('the persisted stock state and an active reservation take precedence over available-looking display data', () => {
    assert.equal(canReserveVehicle({ estado: 'disponible', _original: { status: 'Vendido' } }), false);
    assert.equal(canReserveVehicle({ estado: 'disponible', _original: { sold: true } }), false);
    assert.equal(canReserveVehicle({ estado: 'disponible' }, { _id: 'active-reservation' }), false);
    assert.equal(canReserveVehicle({ estado: 'disponible' }), true);
    assert.equal(canReserveVehicle({}), false);
});

test('a reservation uses the advertised price and currency, never the acquisition cost currency', () => {
    assert.deepEqual(getVehicleReservationInitialData({ id: 'car-1', marca: 'Demo', modelo: 'Sedan', año: 2024, precioPublicado: 18000000, moneda: 'ARS', precioCompra: 10000, monedaCompra: 'USD' }), {
        vehicleId: 'car-1', vehicleName: 'Demo Sedan 2024', agreedPrice: 18000000, agreedCurrency: 'ARS'
    });
});

test('empty optional vehicle identity fields do not become literal undefined in a reservation', () => {
    const initial = getVehicleReservationInitialData({ _id: 'car-2', marca: 'Demo', precioPublicado: 0, moneda: 'USD' });
    assert.equal(initial.vehicleName, 'Demo');
    assert.equal(initial.agreedPrice, 0);
    assert.equal(initial.vehicleId, 'car-2');
});

test('legacy section links retain their content within the commercial detail sections', () => {
    assert.equal(getVehicleDetailSection('costos'), 'gastos');
    assert.equal(getVehicleDetailSection('permutas'), 'gastos');
    assert.equal(getVehicleDetailSection('fotos'), 'resumen');
    assert.equal(getVehicleDetailSection('documentos'), 'documentacion');
    assert.equal(getVehicleDetailSection('publicacion'), 'publicaciones');
    assert.equal(getVehicleDetailSection('historial'), 'precios');
    assert.equal(getVehicleDetailSection('actividad'), 'actividad');
    assert.equal(getVehicleDetailSection('unknown'), 'resumen');
    assert.equal(getVehicleDetailSection(null), 'resumen');
});

test('withdrawn availability is distinct from an unconfirmed sale and cannot be reserved', () => {
    assert.equal(getVehicleStatusLabel('Retirado'), 'Fuera de venta');
    assert.equal(getVehicleStatusLabel('Pausado'), 'Vendido sin confirmar');
    assert.equal(canReserveVehicle({ estado: 'retirado' }), false);
    assert.equal(canReserveVehicle({ estado: 'pausado' }), false);
});
