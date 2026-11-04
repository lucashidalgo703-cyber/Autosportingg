/**
 * Determina si una venta o reserva pertenece al usuario autenticado.
 *
 * Reglas de pertenencia:
 * 1. Comparación de identificadores (IDs) solo cuando ambos existan.
 * 2. Si el registro cuenta con un ID explícito de vendedor (assignedTo o salespersonId),
 *    la pertenencia se decide estrictamente por dicho ID.
 * 3. Para registros históricos sin ID, se evalúa únicamente coincidencia exacta y normalizada
 *    entre los identificadores de texto del usuario (username, name, email) y los del registro
 *    (salesperson, user, assignedTo.name, assignedTo.email).
 * 4. Operaciones sin vendedor identificable quedan estrictamente excluidas (false).
 */
export function isMySaleOrReservation(record, user) {
    if (!record || !user) return false;

    // 1. Extraer ID del usuario autenticado (JWT habitual contiene 'id' o 'userId', a veces '_id')
    const currentUserId = user.id ? String(user.id).trim() : user.userId ? String(user.userId).trim() : user._id ? String(user._id).trim() : null;

    // 2. Extraer ID del vendedor en el registro
    let recordSellerId = null;
    if (record.assignedTo) {
        if (typeof record.assignedTo === 'object' && record.assignedTo._id) {
            recordSellerId = String(record.assignedTo._id).trim();
        } else if (typeof record.assignedTo === 'string' && record.assignedTo.trim()) {
            recordSellerId = record.assignedTo.trim();
        }
    }
    if (!recordSellerId && record.salespersonId && String(record.salespersonId).trim()) {
        recordSellerId = String(record.salespersonId).trim();
    }

    // Si ambos identificadores existen, la pertenencia se decide estrictamente por ID
    if (recordSellerId && currentUserId) {
        return recordSellerId === currentUserId;
    }

    // Si el registro tiene un ID explícito de vendedor pero difiere o no hay usuario válido, no pertenece
    if (recordSellerId) {
        return false;
    }

    // 3. Registros históricos sin ID: coincidencia exacta y normalizada respaldada por campos existentes
    const userCandidates = new Set();
    if (user.email && typeof user.email === 'string') userCandidates.add(user.email.trim().toLowerCase());
    if (user.name && typeof user.name === 'string') userCandidates.add(user.name.trim().toLowerCase());
    if (user.displayName && typeof user.displayName === 'string') userCandidates.add(user.displayName.trim().toLowerCase());
    if (user.username && typeof user.username === 'string') userCandidates.add(user.username.trim().toLowerCase());

    if (userCandidates.size === 0) return false;

    const recordCandidates = [];
    if (record.salesperson && typeof record.salesperson === 'string') {
        const s = record.salesperson.trim().toLowerCase();
        if (s) recordCandidates.push(s);
    }
    if (record.user && typeof record.user === 'string') {
        const u = record.user.trim().toLowerCase();
        if (u) recordCandidates.push(u);
    }
    if (record.assignedTo && typeof record.assignedTo === 'object') {
        if (record.assignedTo.email && typeof record.assignedTo.email === 'string') {
            const e = record.assignedTo.email.trim().toLowerCase();
            if (e) recordCandidates.push(e);
        }
        if (record.assignedTo.name && typeof record.assignedTo.name === 'string') {
            const n = record.assignedTo.name.trim().toLowerCase();
            if (n) recordCandidates.push(n);
        }
    }

    // Si el registro no tiene ningún vendedor identificable, queda fuera
    if (recordCandidates.length === 0) return false;

    // Coincidencia exacta
    return recordCandidates.some((candidate) => userCandidates.has(candidate));
}
