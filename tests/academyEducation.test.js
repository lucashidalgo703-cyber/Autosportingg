import test from 'node:test';
import assert from 'node:assert/strict';
import { courses } from '../src/lib/academy/curriculum.js';
import { questions, gradeAssessment } from '../src/lib/academy/assessments.js';

test('Casos de práctica: 25 resultados contrastados con operaciones independientes', () => {
    const expected = {
        fundamentos: [18e6+1e6,25e6-19e6-1e6,30e6-10e6-1e6+15e6-1e6],
        liquidez: [8e6+6e6-10e6,5e6-4e6,8e6+6e6-10e6+10e6-9e6+12e6-8e6],
        rentabilidad: [12e6-10e6-0.6e6,1.4/12*100,3*1.4e6-1.2e6],
        capital: [150/30,365/(150/30)+20-15,150e6/365*50],
        financiacion: [4e6+4*2.2e6,12e6-4e6,4e6+[1,2,3,4].reduce((s,t)=>s+2.2e6/1.02**t,0)],
        riesgos: [8e6*.08*.5,8/20*100,4e6+3e6-6e6],
        inversiones: [-6e6+[1,2,3].reduce((s,t)=>s+3e6/1.12**t,0),6e6/3e6,1e6/1.12+1e6/1.12**2-2e6/1.12**3],
        direccion: [2*12e6+15e6,50e6-39e6-8e6,50e6-8e6-10e6,2*(18e6-15e6-.6e6)],
    };
    let count=0;
    for (const course of courses) {
        assert.equal(course.lessons.length,3);
        for (const lesson of course.lessons) {
            assert.ok(lesson.reading.paragraphs.length>=2);
            assert.ok(lesson.reading.paragraphs.every(p=>p.split(/\s+/).length>=50));
        }
        assert.ok(course.courseCase.steps.length>=4);
        assert.ok(course.courseCase.alternatives && course.courseCase.risk && course.courseCase.reflection);
        course.courseCase.exercises.forEach((e,i)=> { assert.ok(Math.abs(e.answer-expected[course.id][i])<=.01,course.id);count++; });
    }
    assert.equal(count,25);
    assert.ok(courses.find(c=>c.id==='direccion').lessons.every(l=>l.reading.paragraphs.length===3));
});

test('24 variantes de examen independientes de práctica y resueltas con oráculos propios', () => {
    const expected={fundamentos:[48e6-19e6,21e6-16e6-1e6,(30-22.5)/30*100],liquidez:[7e6+5e6-9e6+8e6-6e6,18e6*.35,6e6-3.7e6],rentabilidad:[23.5e6-18.4e6-.8e6-.7e6,2.24/16*100,Math.ceil(5.4/1.2)],capital:[96/((18+30)/2),65+28-19,240e6/360*45],financiacion:[1.8e6*(1+.04*3),((1+.30/12)**12-1)*100,2.4e6/8],riesgos:[7.5e6*.12*.4,9/45*100,2.8e6-.9e6-.45e6],inversiones:[(6.75-5)/5*100,1331000/1.1**3,7.2e6/.9e6],direccion:[80e6-16e6-12e6,(1.56/1.3-1)*100,.4*15+.6*25]};
    const practice=new Set(courses.flatMap(c=>[...c.lessons.map(l=>l.exercise.question),...c.courseCase.exercises.map(e=>e.question)]));
    for(const c of courses) questions.filter(q=>q.courseId===c.id&&q.type==='numeric').forEach((q,i)=>{
        assert.ok(Math.abs(q.correct-expected[c.id][i])<=.01,q.id);
        for(const prompt of practice) assert.ok(!q.prompt.startsWith(prompt));
        assert.equal(gradeAssessment([q],{[q.id]:String(expected[c.id][i])}).score,100);
        assert.throws(()=>gradeAssessment([q],{[q.id]:'0x19'}));
    });
});
