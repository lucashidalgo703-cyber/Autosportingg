import assert from 'node:assert/strict';
import { issueReportTarget } from '../src/utils/issueReportLink.js';

const id = 'abcdef0123456789abcdef01';
const target = '/admin/reportar-problema?reportId=' + id;
assert.equal(issueReportTarget(target), target);
assert.equal(issueReportTarget(target.replace(id, id.toUpperCase())), target);
const login = new URL('/login?next=' + encodeURIComponent(target), 'https://autosportingg.com');
assert.equal(issueReportTarget(login.searchParams.get('next')), target);

for (const invalid of [null, undefined, {}, '', '/admin/reportar-problema',
    'https://autosportingg.com' + target, 'https://evil.example' + target, '//evil.example' + target,
    target + '&reportId=' + id, target + '&next=https://evil.example', target + '#outside',
    target.replace(id, 'x'.repeat(24)), target.replace(id, id.slice(1)), target + '%0a',
    target.replace('/admin/', '/admin/../admin/'), target.replace('?', '/?'),
    target.replace('reportId=', 'reportId=\\'), target + '\n']) {
    assert.equal(issueReportTarget(invalid), null, String(invalid));
}
console.log('PASS: report review destination survives sign-in and rejects unsafe redirects.');
