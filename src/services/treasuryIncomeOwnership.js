/**
 * Calcula la porción propia y de terceros de un ingreso.
 * Se mantiene independiente de persistencia para poder reutilizarla en
 * proyecciones y cálculos puros sin cargar servicios ni modelos de MongoDB.
 */
export function computeIncomeOwnership(inc) {
    const totalAmount = Number(inc?.amount || 0);
    let tercerosAmount = 0;
    let propioAmount = totalAmount;
    let thirdPartyNote = null;
    let thirdPartyOwner = inc?.thirdPartyOwner || null;

    if (Number(inc?.thirdPartyAmount) > 0) {
        tercerosAmount = Math.min(totalAmount, Math.round(Number(inc.thirdPartyAmount) * 100) / 100);
        propioAmount = Math.max(0, Math.round((totalAmount - tercerosAmount) * 100) / 100);
        thirdPartyOwner = thirdPartyOwner || 'Tercero / Socio';
        thirdPartyNote = `Fondos de ${thirdPartyOwner}: ${inc.currency || 'ARS'} ${tercerosAmount.toLocaleString('es-AR')} (Propio: ${inc.currency || 'ARS'} ${propioAmount.toLocaleString('es-AR')}).`;
        return { totalAmount, tercerosAmount, propioAmount, thirdPartyNote, thirdPartyOwner };
    }

    const v = inc?.vehicleId && typeof inc.vehicleId === 'object' ? inc.vehicleId : null;
    const s = inc?.saleId && typeof inc.saleId === 'object' ? inc.saleId : null;

    if (v) {
        const partnerPct = Number(
            (v.investor && v.investor.percentage > 0 ? v.investor.percentage : 0) ||
            (v.jointOwnership && v.jointOwnership.hasPartner && v.jointOwnership.partnerPercentage > 0 ? v.jointOwnership.partnerPercentage : 0)
        );
        if (partnerPct > 0) {
            tercerosAmount = Math.round((totalAmount * partnerPct)) / 100;
            propioAmount = Math.max(0, Math.round((totalAmount - tercerosAmount) * 100) / 100);
            thirdPartyOwner = v.investor?.name || v.jointOwnership?.partnerName || 'Socio';
            thirdPartyNote = `Socio (${thirdPartyOwner}, ${partnerPct}%): ${inc.currency || 'ARS'} ${tercerosAmount.toLocaleString('es-AR')}.`;
        } else if (v.consignedBy || (v.agencyOwned === false && v.ownerName)) {
            const commission = Number(v.consignmentCommission || 0);
            tercerosAmount = commission > 0 ? Math.max(0, totalAmount - commission) : totalAmount;
            propioAmount = commission > 0 ? Math.min(totalAmount, commission) : 0;
            thirdPartyOwner = v.consignedBy || v.ownerName || 'Comitente';
            thirdPartyNote = `Consignación de ${thirdPartyOwner}. Retenido: ${inc.currency || 'ARS'} ${tercerosAmount.toLocaleString('es-AR')}.`;
        }
    } else if (s && (s.vehicleOwnerName || s.ownerName || s.consignationOwnerId)) {
        thirdPartyOwner = s.vehicleOwnerName || s.ownerName || 'Propietario Comitente';
        const commAmt = Number(s.commissionSettings?.extraAmount || 0);
        tercerosAmount = commAmt > 0 && commAmt < totalAmount ? Math.max(0, totalAmount - commAmt) : totalAmount;
        propioAmount = Math.max(0, totalAmount - tercerosAmount);
        thirdPartyNote = `Liquidación pendiente a ${thirdPartyOwner}: ${inc.currency || 'ARS'} ${tercerosAmount.toLocaleString('es-AR')}.`;
    }

    return { totalAmount, tercerosAmount, propioAmount, thirdPartyNote, thirdPartyOwner };
}
