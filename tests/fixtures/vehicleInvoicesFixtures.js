// Synthetic invoices and registrations only; never load employee accounts.
import { seedManagedRoles } from './managedRolesFixtures.js';

export async function seedVehicleInvoices(models) {
    const fixture = await seedManagedRoles(models);
    await models.Sale.updateOne({ _id: fixture.sales[1]._id }, { $set: { saleCurrency: 'USD', salePrice: 21000 } });
    await models.Car.updateOne({ _id: fixture.cars[1]._id }, { $set: { currency: 'USD', price: 21000, purchaseCurrency: 'USD', purchasePrice: 14000 } });
    await models.Car.updateOne({ _id: fixture.cars[5]._id }, { $set: { name: 'Compra facturación QA', plateOrVin: ' ',
        currency: 'USD', price: 20000, purchaseCurrency: 'USD', purchasePrice: 14000,
        ownerName: 'Proveedor ficticio QA', ownerEmail: 'proveedor@example.test' } });
    const account = await models.Account.create({ name: 'Cuenta intacta QA', type: 'Efectivo', currency: 'ARS', balance: 9876543 });
    return { ...fixture, account, emptyPlateId: String(fixture.cars[5]._id), saleId: String(fixture.sales[0]._id),
        soldCarId: String(fixture.cars[0]._id), secondSaleId: String(fixture.sales[1]._id), secondSoldCarId: String(fixture.cars[1]._id) };
}

const pdfStream = 'BT /F1 12 Tf 20 110 Td (FACTURA FICTICIA QA) Tj ET';
const pdfObjects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 260 180] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>',
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
    `<< /Length ${Buffer.byteLength(pdfStream)} >>\nstream\n${pdfStream}\nendstream`
];
let pdfSource = '%PDF-1.4\n', pdfOffsets = [0];
for (const [index, object] of pdfObjects.entries()) { pdfOffsets.push(Buffer.byteLength(pdfSource)); pdfSource += `${index + 1} 0 obj\n${object}\nendobj\n`; }
const pdfXref = Buffer.byteLength(pdfSource);
pdfSource += `xref\n0 ${pdfOffsets.length}\n0000000000 65535 f \n${pdfOffsets.slice(1).map(offset => String(offset).padStart(10, '0') + ' 00000 n ').join('\n')}\ntrailer\n<< /Size ${pdfOffsets.length} /Root 1 0 R >>\nstartxref\n${pdfXref}\n%%EOF`;
export const invoicePdf = Buffer.from(pdfSource);
export const invoicePng = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/a9sAAAAASUVORK5CYII=', 'base64');
// Real, generated 8×8 white images, kept inline so no image library is needed at runtime.
export const invoiceJpeg = Buffer.from('/9j/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAAIAAgDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAj/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFAEBAAAAAAAAAAAAAAAAAAAAAP/EABQRAQAAAAAAAAAAAAAAAAAAAAD/2gAMAwEAAhEDEQA/AKpAB//Z', 'base64');
export const invoiceWebp = Buffer.from('UklGRiQAAABXRUJQVlA4IBgAAAAwAQCdASoIAAgAAUAmJaQAA3AA/vz0AAA=', 'base64');
