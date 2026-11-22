import test from 'node:test';
import assert from 'node:assert/strict';
import { academyCourses, academySections } from '../src/lib/academy/catalog.js';
import { courses, checkNumericAnswer } from '../src/lib/academy/curriculum.js';

test('Academy expone ocho cursos únicos y seis destinos de navegación', () => {
    assert.equal(academyCourses.length, 8);
    assert.equal(new Set(academyCourses.map(c => c.id)).size, 8);
    assert.equal(academySections.length, 6);
    for (const course of academyCourses) assert.ok(course.title && course.description && course.level);
});

test('Los ocho cursos contienen tres lecciones, glosario y ejercicios corregibles', () => {
    assert.equal(courses.length, 8);
    const ids = new Set();
    for (const course of courses) {
        assert.ok(Object.keys(course.glossary).length >= 3);
        assert.equal(course.lessons.length, 3);
        for (const lesson of course.lessons) {
            assert.ok(!ids.has(lesson.id)); ids.add(lesson.id);
            assert.ok(lesson.body.length > 150 && lesson.example.length > 30);
            assert.ok(checkNumericAnswer(String(lesson.exercise.answer), lesson.exercise.answer));
            assert.ok(!checkNumericAnswer('', lesson.exercise.answer));
        }
    }
    assert.equal(ids.size, 24);
    assert.equal(checkNumericAnswer('2,5', 2.5), true);
    assert.equal(checkNumericAnswer('Infinity', 10), false);
    assert.equal(checkNumericAnswer('1.000.000', 1000000), false);
});
