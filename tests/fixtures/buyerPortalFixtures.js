export async function seedBuyerPortalFixtures(models, fixture) {
    const { Sale, Client, Car, Gestoria } = models;
    const [buyerOne, buyerTwo] = await Client.create([
        { fullName: 'Comprador ficticio con toma', email: 'comprador.con@example.test', phone: '2974000001' },
        { fullName: 'Comprador ficticio sin toma', email: 'comprador.sin@example.test', phone: '2974000002' }
    ]);
    const otherSold = await Car.create({ brand: 'Fiat', name: 'Cronos vendido portal prueba', year: 2022,
        km: 50000, fuel: 'Nafta', condition: 'Usado', price: 17000000, currency: 'ARS', purchasePrice: 14000000,
        purchaseCurrency: 'ARS', agencyOwned: true, status: 'Vendido', sold: true, plateOrVin: 'PT002AA', visibleEnWeb: false });
    await Car.updateOne({ _id: fixture.cars[4]._id }, { $set: { coverImage: '/hero-autosporting.jpg', images: ['/hero-autosporting.jpg'] } });
    const common = { salePrice: 25000000, saleCurrency: 'ARS', status: 'confirmada', salesperson: fixture.users[1].name,
        assignedTo: fixture.users[1]._id, createdBy: fixture.users[0].name,
        clientPortalUpdate: { latestUpdate: 'Recibimos tu operación de prueba.', nextStep: 'La agencia está preparando la entrega.', actionRequired: false, updatedAt: new Date() } };
    const withTradeIn = await Sale.create({ ...common, vehicleId: fixture.cars[4]._id, clientId: buyerOne._id,
        notes: 'NOTA INTERNA PRIVADA: no mostrar al comprador',
        tradeIns: [{ brand: 'Toyota', model: 'Etios en preingreso ficticio', year: 2015, plate: 'PT001AA',
            estimatedValue: 6000000, currency: 'ARS', shouldEnterStock: false }] });
    const withoutTradeIn = await Sale.create({ ...common, vehicleId: otherSold._id, clientId: buyerTwo._id });
    await Gestoria.create({ title: 'Trámite ficticio portal', type: 'Transferencia Egreso', saleId: withTradeIn._id,
        clientId: buyerOne._id, vehicleId: fixture.cars[4]._id, status: 'Presentado', notes: 'NOTA GESTOR INTERNA PRIVADA' });
    return { withTradeIn: String(withTradeIn._id), withoutTradeIn: String(withoutTradeIn._id),
        tradeInId: String(withTradeIn.tradeIns[0]._id), buyerOneEmail: buyerOne.email, buyerTwoEmail: buyerTwo.email };
}
