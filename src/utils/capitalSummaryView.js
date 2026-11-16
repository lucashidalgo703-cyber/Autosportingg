// Select a denomination without converting or adding currencies. Legacy scalars always mean ARS.
export function capitalSummaryCurrencyView(summary, currency = 'ARS') {
    const code = currency === 'USD' ? 'USD' : 'ARS';
    const legacy = code === 'ARS';
    const components = Object.fromEntries(Object.entries(summary?.componentes || {}).map(([key, component]) => [key, {
        ...component,
        monto: component.byCurrency?.[code] ?? (legacy ? component.monto || 0 : 0),
        ...(component.nominalByCurrency ? { montoTotalNominal: component.nominalByCurrency[code] || 0 } : {}),
        ...(component.inversionistasByCurrency ? { montoInversionistas: component.inversionistasByCurrency[code] || 0, subtotalInversionistas: component.inversionistasByCurrency[code] || 0 } : {})
    }]));
    return { componentes: components, totales: summary?.totalsByCurrency?.[code] || (legacy ? summary?.totales || {} : {}), currency: code };
}

export const formatCapitalAmount = (amount, currency = 'ARS') => `${currency} ${Number(amount || 0).toLocaleString('es-AR', { maximumFractionDigits: 2 })}`;
