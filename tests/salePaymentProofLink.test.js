import assert from 'node:assert/strict';
import { salePaymentProofTarget } from '../src/utils/salePaymentProofLink.js';

const sale = 'a1234567890abcdef1234567', proof = 'b1234567890abcdef1234567';
const target = `/admin/ventas/${sale}?section=collections&comprobante=${proof}`;
assert.equal(salePaymentProofTarget(target), target);
assert.equal(salePaymentProofTarget(`/admin/ventas/${sale.toUpperCase()}?comprobante=${proof.toUpperCase()}&section=collections`), target);

// The complete destination survives URL encoding and OTP login without adding
// an external redirect or dropping the selected review tab/proof.
const login = new URL('/login?next=' + encodeURIComponent(target), 'https://autosportingg.com');
assert.equal(salePaymentProofTarget(login.searchParams.get('next')), target);
assert.equal(new URL(salePaymentProofTarget(login.searchParams.get('next')), login.origin).origin, login.origin);

const invalid = [
    null, undefined, {}, '', 'https://autosportingg.com' + target, 'https://evil.example' + target, '//evil.example' + target,
    '/admin/ventas/' + sale, `/admin/ventas/${sale}?section=collections`, `/admin/ventas/${sale}?comprobante=${proof}`,
    `/admin/ventas/${sale}?section=documents&comprobante=${proof}`, `/admin/ventas/${sale}?section=collections&comprobante=${proof}&next=https://evil.example`,
    target + '&section=collections', target + '&comprobante=' + proof, target + '#other', target + '#https://evil.example',
    target.replace(sale, sale.slice(0, -1)), target.replace(proof, 'z'.repeat(24)), target.replace('/admin/ventas/', '/admin/clientes/'),
    target.replace('/admin/ventas/', '/admin/ventas//'), target.replace('section=collections', 'section=collections\n'),
    target.replace('section=collections', 'section=collections%0d%0a'), target.replace('/admin/ventas/', '/admin/ventas/\\'),
    target.replace(proof, proof + '%23hash'), target.replace(sale, '..%2f' + sale)
];
for (const value of invalid) assert.equal(salePaymentProofTarget(value), null, String(value));
console.log(`PASS: protected payment-proof review link and OTP return flow; ${invalid.length} invalid destinations rejected.`);
