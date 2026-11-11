import test from 'node:test';
import assert from 'node:assert/strict';
import { expedienteAge, expedienteCalendar, expedienteLocation, expedienteQuery, readExpedienteLocation } from '../src/utils/expedienteNavigation.js';

test('sale drawer legacy links open their expediente without turning its ID into a person search', () => {
    const id = 'abcdef012345abcdef012345';
    const result = readExpedienteLocation('?search=' + id);
    assert.equal(result.selectedId, id);
    assert.equal(result.filters.search, '');
    assert.equal(result.section, 'summary');
});
test('commercial filters, page and open section survive a URL round trip', () => {
    const parsed = readExpedienteLocation('?view=finalizados&status=entregado&search=Peugeot%20%26%20comprador&responsible=unassigned&seller=abcdef012345abcdef012345&due=next7&priority=high&sort=buyer&direction=asc&page=3&expediente=012345abcdef012345abcdef&section=registry');
    const location = expedienteLocation(parsed.filters, parsed.page, parsed.selectedId, parsed.section);
    const restored = readExpedienteLocation(location.split('?')[1]);
    assert.deepEqual(restored.filters, parsed.filters);
    assert.equal(restored.page, 3);
    assert.equal(restored.selectedId, '012345abcdef012345abcdef');
    assert.equal(restored.section, 'registry');
    assert.equal(restored.responsibleSpecified, true);
});
test('unknown query values cannot become arbitrary detail paths or unbounded pages', () => {
    const parsed = readExpedienteLocation('?expediente=javascript:alert(1)&responsible=all&seller=other&status=other&view=other&section=other&page=Infinity&direction=random');
    assert.equal(parsed.selectedId, ''); assert.equal(parsed.section, 'summary'); assert.equal(parsed.page, 1);
    assert.equal(parsed.filters.responsible, ''); assert.equal(parsed.filters.seller, ''); assert.equal(parsed.filters.view, 'activos');
    const query = new URLSearchParams(expedienteQuery(parsed.filters, { page: 1, limit: 100000 }));
    assert.equal(query.get('limit'), '20');
});
test('calendar aging uses the Argentina business day and rejects impossible dates', () => {
    assert.equal(expedienteCalendar('2026-02-30'), '');
    assert.equal(expedienteCalendar('2028-02-29T00:00:00.000Z'), '2028-02-29');
    assert.equal(expedienteAge('2026-11-09', '2026-11-11T02:30:00Z'), 1);
    assert.equal(expedienteAge('2026-11-09', '2026-11-11T03:30:00Z'), 2);
    assert.equal(expedienteAge(null, '2026-11-11T03:30:00Z'), null);
});
