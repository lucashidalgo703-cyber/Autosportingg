import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { financialPilotReport } from '../src/services/financialPilotSource.js';
import { attributeReceivables, financingPosition, operationResult, reconcileAccounts, shareOf, stockPosition } from '../src/services/financialPilotEngine.js';
import { projectLiquidity } from '../src/services/financialPilotLiquidity.js';
import { canAccessCrmPath, canReadFinancialPilot } from '../src/utils/adminPermissions.js';

const json = path => JSON.parse(readFileSync(new URL(path, import.meta.url), 'utf8').replace(/^\uFEFF/, ''));
const expected = json('./fixtures/financialPilotExpected.json');
const cases = json('../src/fixtures/financialPilot/casos-sinteticos.json');
const report = (variant = 'original', scenario = 'base', purchase) => financialPilotReport({ sampleId:'AS-SINT-01', variant, scenario, purchase });
const pick = (input, keys) => Object.fromEntries(keys.map(key => [key, input[key]]));

test('original, settlement and revision agree with the frozen expectations', () => {
    const keys = ['registered','restricted','usable','assets','liabilities','equity','result'];
    const original = report();
    assert.deepEqual(pick(original.closing.metrics, keys), { ...pick(expected.closing, keys.filter(key => key !== 'restricted')), restricted: expected.closing.restrictedBank });
    const paid = report('settlement').closing;
    assert.deepEqual(pick(paid.metrics, keys), pick(expected.settlement, keys));
    assert.equal(paid.operatingResult.direct, original.closing.operatingResult.direct);
    assert.equal(paid.cashBridge.financing - original.closing.cashBridge.financing, expected.settlement.financingCashChange);
    const revised = report('revised');
    assert.equal(revised.closing.metrics.registered, expected.corrections.v2Cash);
    assert.equal(revised.closing.metrics.result, expected.corrections.v2Result);
    assert.equal(revised.closing.metrics.liabilities, expected.corrections.v2Liabilities);
    assert.equal(revised.closing.metrics.equity, expected.corrections.v2Equity);
    assert.deepEqual(revised.evidence.base, { id:original.sampleId, version:1 });
    assert.deepEqual(revised.evidence.adjustments.map(entry => entry.origin), ['FACT-T1']);
    assert.deepEqual(original, report());
    assert.deepEqual(original.closing.inventoryPosition.purchases[0], { id:'B',cost:100,paid:60,pending:40,committed:100 });
});

test('projection uses an obligation once and preserves the restricted payment', () => {
    const base = report().projection;
    const stress = report('original','stress').projection;
    const revised = report('revised','stress').projection;
    assert.equal(base.capacity, expected.forecast.base.capacity);
    assert.equal(stress.capacity, expected.forecast.adverse.capacity);
    assert.equal(revised.capacity, expected.corrections.v2RobustCapacity);
    assert.deepEqual([base.minimum.date,stress.minimum.date,revised.minimum.date], ['2026-11-07','2026-11-20','2026-11-25']);
    assert.equal(base.series[3].free, expected.forecast.freeAfterDay3);
    assert.equal(base.scheduled.filter(flow => flow.id === 'PROV-B').length, 1);
    assert.equal(base.scheduled.find(flow => flow.id === 'PROV-B').sources.length, expected.cases.dedup.sources);
    assert.equal(revised.scheduled.filter(flow => flow.sources.includes('FACT-T1')).length, 1);
});

test('simulation handles day zero, dated flows, changes in floor and missing FX', () => {
    const result = report('original','stress',[{date:'2026-10-31',currency:'ARS',amount:-30},
        {date:'2026-11-10',currency:'ARS',amount:-5}]).simulation;
    assert.equal(result.minimum.free, 338);
    assert.equal(result.gap, 12);
    assert.ok(result.alerts.some(alert => alert.code === 'cash_below_floor'));
    assert.equal(report('original','base',[{date:'2026-10-31',currency:'USD',amount:-10}]).simulation.capacity, null);
    assert.ok(report('original','base',[{date:'2026-10-31',currency:'USD',amount:-10}]).simulation.alerts.some(alert => alert.code === 'missing_fx'));
    assert.throws(() => report('original','base',[{date:'2026-11-31',currency:'ARS',amount:-10}]), /fecha/);
    const input = { start:'2026-10-31',horizon:20,usable:475,floor:350,currency:'ARS',restrictions:{},scenario:'base' };
    const flows = [{id:'charge',amount:-100,day:11},{id:'income',amount:25,day:9}];
    const original = projectLiquidity({ ...input, flows });
    const moved = projectLiquidity({ ...input, flows:[{ ...flows[0], day:8 },flows[1]] });
    assert.notEqual(moved.capacity, original.capacity);
    assert.equal(projectLiquidity({ ...input, flows:[...flows,flows[0]] }).alerts[0].code, 'duplicate_obligation');
    assert.equal(projectLiquidity({ ...input, flows, usable:null }).quality, 'not_calculable');
});

test('stock rights, nominal receivables, discrete rounding, trade-ins and financing', () => {
    const p = expected.cases.portfolio;
    assert.deepEqual(attributeReceivables(cases.portfolio), { nominal:p.nominal,own:p.agencyKnown,external:p.partnerKnown,unattributed:p.unattributed });
    assert.equal(shareOf(1,5000), 1);
    assert.equal(shareOf(-1,5000), -1);
    assert.equal(shareOf(1,4999), 0);
    const stock = stockPosition(cases.stock.map(row => ({ status:row.status,rightsRetained:row.rights,remainingCost:row.cost })));
    assert.equal(stock.inventory, expected.cases.stock.economicValue);
    assert.equal(stock.commercialUnits, expected.cases.stock.commercialCount);
    const trade = cases.trade;
    const a = operationResult(trade.aCash + trade.bAssignedCost,trade.aCost,0);
    const b = operationResult(trade.bPrice,trade.bAssignedCost,trade.bDirect);
    assert.equal(b.margin, expected.cases.tradeChain.secondGross);
    assert.equal(b.contribution, expected.cases.tradeChain.secondContribution);
    assert.equal(a.contribution + b.contribution, expected.cases.tradeChain.chainContribution);
    const financing = financingPosition(cases.financing);
    assert.equal(financing.principal, expected.cases.financing.principalOutstanding);
    assert.equal(financing.recognizedInterest, expected.cases.financing.recognizedInterest);
    assert.equal(financing.contractualInterest, expected.cases.financing.contractualInterest);
    assert.equal(financing.cash, expected.cases.financing.cash);
    assert.equal(financing.recognizedReceivable, expected.cases.financing.recognizedReceivable);
    assert.equal(financing.stressedPrincipalRecovery, expected.cases.financing.stressedPrincipalRecovery);
    const [missing, stale] = reconcileAccounts(new Map([['A',50],['B',20]]),[{account:'A',statement:null},{account:'B',statement:20,reconciling:0,stale:true}]);
    assert.equal(missing.registered, 50);
    assert.equal(missing.usable, null);
    assert.equal(stale.quality, 'stale');
});

test('an explicit grant never grants sellers access', () => {
    const admin = { role:'admin',permissions:['financialPilot.read'] };
    const seller = { ...admin,role:'ventas' };
    assert.equal(canReadFinancialPilot(admin), true);
    assert.equal(canReadFinancialPilot({ role:'admin' }), false);
    assert.equal(canReadFinancialPilot(null), false);
    assert.equal(canReadFinancialPilot(seller), false);
    assert.equal(canAccessCrmPath(seller,'/admin/autosporting-ai?as=owner'), false);
});
