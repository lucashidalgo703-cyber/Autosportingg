import assert from 'node:assert/strict';
import test from 'node:test';
import mongoose from 'mongoose';
import NpsResponse from '../src/models/NpsResponse.js';

const response = score => new NpsResponse({ survey: new mongoose.Types.ObjectId(), score, classification: 'invalid-input-is-recalculated' });

test('NPS validation classifies the complete 0–10 scale without callback middleware', async () => {
    for (const [score, classification] of [[0, 'detractor'], [6, 'detractor'], [7, 'passive'], [8, 'passive'], [9, 'promoter'], [10, 'promoter']]) {
        const entry = response(score);
        await entry.validate();
        assert.equal(entry.score, score);
        assert.equal(entry.classification, classification);
    }
});

test('NPS validation rejects missing, uncastable and out-of-range scores', async () => {
    for (const score of [undefined, null, NaN, -1, 11, 'not-a-score']) {
        await assert.rejects(response(score).validate(), error => error.name === 'ValidationError' && Boolean(error.errors.score));
    }
});
