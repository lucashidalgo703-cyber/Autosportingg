// Fictional seller and case-management profiles; never use employee accounts.
import { seedSellerAccess } from './sellerAccessFixtures.js';
import { createLoginSession } from '../../src/services/authSessionService.js';

export async function seedManagedRoles(models) {
    const fixture = await seedSellerAccess(models);
    const previousSessions = [...fixture.sessions];
    const profiles = [
        { name: 'Lucas ficticio QA', role: 'ventas', permissions: [] },
        { name: 'Maia ficticia QA', role: 'gestoria_contabilidad', permissions: [] }
    ];
    for (const [offset, fields] of profiles.entries()) {
        const user = fixture.users[offset + 2];
        await models.AdminUser.updateOne({ _id: user._id }, { $set: fields });
        fixture.users[offset + 2] = await models.AdminUser.findById(user._id);
        fixture.sessions[offset + 2] = await createLoginSession(fixture.users[offset + 2]);
        // The existing operations belong to the stable account ID, not its name.
        await models.Sale.updateMany({ assignedTo: user._id }, { $set: { salesperson: fields.name } });
    }
    const gestorias = [], leads = [], tasks = [];
    for (const [offset, user] of fixture.users.slice(2).entries()) {
        gestorias.push(await models.Gestoria.create({ title: 'Documentación ficticia QA ' + offset,
            type: 'Transferencia Egreso', status: 'Documentación', vehicleId: fixture.cars[offset]._id,
            vehiclePlate: fixture.cars[offset].plateOrVin, clientId: fixture.clients[offset]._id,
            saleId: fixture.sales[offset]._id, createdBy: user._id }));
        leads.push(await models.Lead.create({ name: 'Consulta asignada QA ' + offset,
            phone: '99000001' + offset, assignedTo: user._id, clientId: fixture.clients[offset]._id }));
        tasks.push(await models.CrmTask.create({ title: 'Pendiente de perfil QA ' + offset,
            description: '[MI_ESPACIO_PENDIENTE]', assignedTo: user._id, user: user.name,
            dueDate: new Date(), type: 'general', status: 'pendiente' }));
    }
    const opportunity = await models.Opportunity.create({ type: 'ofrece', brand: 'OportunidadQA',
        model: 'Unidad ficticia', year: 2024, price: 18000000, currency: 'ARS', createdBy: fixture.users[2]._id });
    return { ...fixture, previousSessions, gestorias, leads, tasks, opportunity };
}
