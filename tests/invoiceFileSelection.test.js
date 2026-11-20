import assert from 'node:assert/strict';
import { invoiceDownloadFileName, validateInvoiceFileSelection } from '../src/components/crm/invoices/invoiceClient.js';

for (const [name, type] of [['factura.pdf', 'application/pdf'], ['foto.jpg', 'image/jpeg'], ['foto.png', 'image/png'], ['foto.webp', 'image/webp'],
    ['FACTURA.PDF', ''], ['foto.JPEG', 'application/octet-stream']]) {
    const file = { name, type, size: 1024 };
    assert.equal(validateInvoiceFileSelection(file), file);
}
for (const [name, type, size] of [['factura.docx', '', 1024], ['factura.pdf', 'application/zip', 1024], ['foto.heic', 'image/heic', 1024],
    ['factura.pdf', 'application/pdf', 0], ['factura.pdf', 'application/pdf', 3 * 1024 * 1024 + 1]]) {
    assert.throws(() => validateInvoiceFileSelection({ name, type, size }));
}
assert.equal(validateInvoiceFileSelection(null), null);
assert.equal(invoiceDownloadFileName({ fileName: 'factura.doc', mimeType: 'application/pdf' }), 'factura.pdf');
assert.equal(invoiceDownloadFileName({ fileName: 'factura', mimeType: 'image/jpeg' }), 'factura.jpg');
assert.equal(invoiceDownloadFileName({ fileName: '../factura.png', mimeType: 'image/webp' }), '.._factura.webp');
assert.equal(invoiceDownloadFileName({ fileName: '', mimeType: 'application/pdf' }, 'Factura-123'), 'Factura-123.pdf');
console.log('PASS: selección de factura, MIME omitido por móviles, formatos/tamaños rechazados y extensión real de descarga.');
