import test from 'node:test';
import assert from 'node:assert/strict';
import { academyCourses, academySections } from '../src/lib/academy/catalog.js';

test('Academy expone ocho cursos únicos y seis destinos de navegación', () => {
    assert.equal(academyCourses.length, 8);
    assert.equal(new Set(academyCourses.map(c => c.id)).size, 8);
    assert.equal(academySections.length, 6);
    for (const course of academyCourses) assert.ok(course.title && course.description && course.level);
});
