import { createRequire } from 'node:module';
import { attributeReceivables, closeFinancialPilot, financingPosition, operationResult } from './financialPilotEngine.js';
import { dateAt, projectLiquidity } from './financialPilotLiquidity.js';

const loadFrozen = createRequire(import.meta.url);
const sample = loadFrozen('../fixtures/financialPilot/muestra-sintetica.json');
const settlement = loadFrozen('../fixtures/financialPilot/pago-socio-sintetico.json');
const cases = loadFrozen('../fixtures/financialPilot/casos-sinteticos.json');

const chart = {
    cash: ['bank', 'restrictedBank'], inventory: ['inventoryA', 'inventoryB'], revenue: ['sales'], cost: ['cogs'],
    direct: ['direct'], overhead: ['overhead'], receivables: ['receivableA'], operatingPayables: ['supplierB', 'payableOverhead', 'payableLate'],
    financingDebt: ['loanP'], partners: ['partnerS'], contributions: ['contributions'], withdrawals: ['withdrawals'],
    adjustments: ['equityAdjustments'], equity: ['equity']
};
const variants = [
    { id: 'original', label: 'Octubre · v1', version: 1 },
    { id: 'settlement', label: 'Pago al socio · posterior a v1', version: 1 },
    { id: 'revised', label: 'Octubre · v2 corregido', version: 2 }
];
const scenarios = [{ id: 'base', label: 'Base' }, { id: 'stress', label: 'Estrés' }];
const operationBySource = { 'COMPRA-A': 'A', 'PREP-A': 'A', 'VENTA-A': 'A', 'COMISION-A': 'A', 'COMPRA-B': 'B', 'FACT-T1': 'A' };
const badInput = message => Object.assign(new Error(message), { status: 400 });

export function financialPilotCatalog() {
    return { samples: [{ id: sample.id, label: 'Cierre sintético de octubre de 2026' }], variants, scenarios };
}

export function financialPilotReport({ sampleId, variant, scenario, purchase } = {}, { allowReceiptsOnly = false } = {}) {
    const selected = variants.find(item => item.id === variant);
    if (sampleId !== sample.id || !selected || !scenarios.some(item => item.id === scenario)) throw badInput('Selección de muestra, cierre o escenario inválida.');
    const isRevised = variant === 'revised', isSettlement = variant === 'settlement';
    const cutDay = sample.cutoff.slice(0, 10);
    const late = sample.corrections.filter(item => item.economicDate <= cutDay);
    const adjustments = isRevised ? late.map(item => ({
        id: item.id, origin: item.origin, date: item.economicDate, recorded: item.recordedAt,
        debit: { [item.debit]: item.amount }, credit: { [item.credit]: item.amount }
    })) : [];
    const entries = [...sample.entries, ...adjustments, ...(isSettlement ? [settlement.entry] : [])]
        .map(entry => ({ ...entry, operationId: operationBySource[entry.origin] }));
    const cashEvidence = isSettlement ? settlement.cashEvidence : sample.cashEvidence;
    const closing = closeFinancialPilot({ opening: { bank: sample.opening.bank, equity: -sample.opening.equity },
        entries, chart, cashEvidence, stock: sample.stock });
    const original = closeFinancialPilot({ opening: { bank: sample.opening.bank, equity: -sample.opening.equity },
        entries: sample.entries, chart, cashEvidence: sample.cashEvidence, stock: sample.stock });
    const start = isSettlement ? settlement.asOf.slice(0, 10) : cutDay;
    const elapsed = (Date.parse(start + 'T12:00:00Z') - Date.parse(cutDay + 'T12:00:00Z')) / 86400000;
    const flows = sample.forecast.filter(flow => flow.day > elapsed).map(flow => ({
        ...flow, day: flow.day - elapsed, ...(flow.adverseDay == null ? {} : { adverseDay: flow.adverseDay - elapsed })
    }));
    if (isRevised) for (const item of late) flows.push({ id: item.id, day: item.dueDay, amount: -item.amount, sources: [item.origin] });
    const projectionInput = { start, horizon: sample.horizon - elapsed, usable: closing.metrics.usable, floor: sample.floor,
        currency: sample.currency, flows, restrictions: Object.fromEntries(closing.accounts.filter(account => account.obligationId)
            .map(account => [account.obligationId, account.restricted])), scenario };
    const projection = projectLiquidity(projectionInput);
    const { capacity: stressedCapacity } = projectLiquidity({ ...projectionInput, scenario: 'stress' });
    const { capacity: baseCapacity } = projectLiquidity({ ...projectionInput, scenario: 'base' });
    const robustCapacity = baseCapacity === null || stressedCapacity === null ? null : Math.min(baseCapacity, stressedCapacity);
    let simulation = null;
    if (purchase != null) {
        if (!Array.isArray(purchase) || purchase.length < 1 || purchase.length > 12) throw badInput('Ingresá entre 1 y 12 pagos o cobros.');
        const incremental = purchase.map((flow, index) => {
            if (!flow || !Number.isSafeInteger(flow.amount) || flow.amount === 0 || Math.abs(flow.amount) > 1e12 ||
                !['ARS', 'USD'].includes(flow.currency) || !/^\d{4}-\d{2}-\d{2}$/.test(flow.date)) throw badInput('Cada flujo requiere importe entero, moneda y fecha.');
            const milliseconds = Date.parse(flow.date + 'T12:00:00Z') - Date.parse(start + 'T12:00:00Z');
            const day = milliseconds / 86400000;
            if (!Number.isInteger(day) || day < 0 || day > projectionInput.horizon || dateAt(start, day) !== flow.date) throw badInput('La fecha de cada flujo debe estar dentro de la proyección.');
            return { id: 'simulation-' + index, amount: flow.amount, day, currency: flow.currency, sources: ['simulación manual'] };
        });
        if (!allowReceiptsOnly && !incremental.some(flow => flow.amount < 0)) throw badInput('La compra debe incluir al menos un desembolso.');
        simulation = projectLiquidity({ ...projectionInput, flows: [...flows, ...incremental] });
    }
    const attribution = attributeReceivables(cases.portfolio);
    const alerts = [...projection.alerts, ...closing.reconciliations.map(item => ({ code: 'material_data_missing', id: item.id })),
        ...(attribution.unattributed ? [{ code: 'unknown_participation', amount: attribution.unattributed, sample: 'caso aislado de cartera' }] : [])];
    const metadata = { contractVersion: 'financial-pilot/1', synthetic: true, sampleId, variant, closeVersion: selected.version,
        periodStart: sample.periodStart, cutoff: isSettlement ? settlement.asOf : sample.cutoff,
        extractedAt: isSettlement ? settlement.asOf : isRevised ? late.at(-1)?.recordedAt ?? sample.extractedAt : sample.extractedAt,
        policyVersion: sample.manifest.policy, currency: sample.currency, scale: sample.scale,
        manifest: sample.manifest, quality: closing.reconciliations.length ? 'partial' : 'verified' };
    const trade = cases.trade;
    const tradeChain = [
        operationResult(trade.aCash + trade.bAssignedCost, trade.aCost, 0),
        operationResult(trade.bPrice, trade.bAssignedCost, trade.bDirect)
    ];
    return { ...metadata, scenario,
        isolatedCases: { financing: financingPosition(cases.financing), tradeChain, attribution },
        indicators: Object.fromEntries(Object.entries(closing.metrics).map(([key, amount]) => [key, {
            amount, currency: metadata.currency, scale: metadata.scale, quality: amount === null ? 'unknown' : metadata.quality,
            policyVersion: metadata.policyVersion, periodStart: metadata.periodStart, cutoff: metadata.cutoff,
            sources: Object.values(sample.manifest).filter(source => source.startsWith('SINT')).concat(
                isRevised ? late.map(item => item.origin) : isSettlement ? [settlement.entry.origin] : [])
        }])),
        closing, projection, robustCapacity, simulation, alerts, attribution,
        comparison: { original: original.metrics, selected: closing.metrics },
        evidence: { entries, cashEvidence, adjustments, base: isRevised || isSettlement ? { id: sample.id, version: 1 } : null } };
}
