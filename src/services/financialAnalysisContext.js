import { createHash } from 'node:crypto';
import { financialPilotReport } from './financialPilotSource.js';

export const demoQuestion = '¿Por qué una compra de ARS 30 compromete la liquidez si el efectivo utilizable actual es ARS 475?';
export const intents = ['close', 'compare', 'projection', 'simulation', 'liquidity_demo'];
const invalid = () => Object.assign(new Error('Contexto o parámetros de análisis inválidos.'), { status: 400 });

export function analysisContext(input, actor) {
    if (!input || !actor || typeof input !== 'object' || Array.isArray(input) ||
        Object.keys(input).some(key => !['sampleId','variant','scenario','intent','purchase'].includes(key)) ||
        !intents.includes(input.intent) || (input.intent !== 'simulation' && Object.hasOwn(input,'purchase'))) throw invalid();
    const demo = input.intent === 'liquidity_demo';
    if (demo && (input.variant !== 'revised' || input.scenario !== 'stress')) throw invalid();
    if (input.intent === 'simulation' && !Array.isArray(input.purchase)) throw invalid();
    const purchase = demo ? [{date:'2026-10-31',currency:'ARS',amount:-30}] : input.purchase;
    if (purchase?.some(flow => !flow || Object.keys(flow).some(key => !['date','amount','currency'].includes(key)))) throw invalid();
    const report = financialPilotReport({ sampleId:input.sampleId, variant:input.variant, scenario:input.scenario, purchase });
    const { sampleId, variant, closeVersion, cutoff, scenario, currency, policyVersion, contractVersion } = report;
    const context = { sampleId, variant, closeVersion, cutoff, scenario, currency, policyVersion, contractVersion,
        horizon:report.projection.horizon, synthetic:true, intent:input.intent };
    const id = createHash('sha256').update(JSON.stringify({actor,context,purchase})).digest('hex');
    const evidence = {};
    const add = (ref,label,value,sources,date,quality = 'verified',scope = scenario,unit = currency) => {
        evidence[ref] = { label,value,sources,date,quality,scenario:scope,currency:unit };
    };
    for (const [ref, label] of Object.entries({usable:'Caja utilizable al corte',result:'Resultado del período',equity:'Patrimonio',
        liabilities:'Pasivos',registered:'Efectivo registrado',partnerPayable:'Saldo con socios', inventory:'Inventario económico'})) {
        const indicator = report.indicators[ref];
        add(ref,label,indicator.amount,indicator.sources,cutoff.slice(0,10),indicator.quality);
    }
    const projection = report.projection;
    const addProjection = (prefix,p) => {
        add(prefix+'minimum','Mínimo de caja',p.minimum?.free ?? null,[report.manifest.forecast],p.minimum?.date,p.quality);
        add(prefix+'floor','Piso de liquidez',p.floor,[policyVersion],undefined,p.quality);
        add(prefix+'capacity','Capacidad de reinversión',p.capacity,[report.manifest.forecast,policyVersion],undefined,p.quality);
        add(prefix+'gap','Faltante frente al piso',p.gap,[report.manifest.forecast,policyVersion],p.minimum?.date,p.quality);
        p.scheduled.forEach((flow,index) => add(prefix+'flow_'+index,flow.id,flow.amount,flow.sources,flow.date,'verified',scenario,flow.currency));
    };
    addProjection('',projection);
    if (report.simulation) addProjection('sim_',report.simulation);
    if (input.intent === 'compare') for (const ref of ['result','equity','liabilities']) {
        add('original_'+ref,'Octubre v1 · '+evidence[ref].label,report.comparison.original[ref],
            [report.manifest.journal],undefined,'verified','original/v1');
    }
    const choices = {};
    const choice = (key,section,text,refs) => { choices[key] = { section,text,refs }; };
    const timeline = Object.keys(evidence).filter(ref => ref.startsWith('flow_'));
    const simFlows = Object.keys(evidence).filter(ref => ref.startsWith('sim_flow_') && evidence[ref].label.startsWith('simulation-'));
    const sim = report.simulation;
    if (sim) {
        choice('summary','conclusion',sim.minimum ? 'La compra se evalúa por la trayectoria de caja. Los pagos fechados reducen la caja futura y el piso reserva liquidez. El desembolso de la simulación se compara con la holgura antes de comprar.' :
            'La simulación conserva los flujos ingresados y queda pendiente de cálculo por datos faltantes.', ['usable','minimum','floor','capacity',...simFlows,'sim_minimum','sim_gap']);
        choice('risk','risks',sim.gap > 0 ? 'Prioridad alta. La compra lleva la caja proyectada por debajo del piso en la fecha del mínimo.' :
            sim.gap === null ? 'Prioridad alta antes de decidir. Falta validar la base de cálculo de la simulación.' :
                'El mínimo de esta simulación cubre el piso bajo los supuestos seleccionados.', ['sim_minimum','sim_floor','sim_gap']);
        choice('alternative','alternatives','Mantener la posición conserva la trayectoria de referencia. Evaluar un desembolso menor o un pago posterior requiere simular nuevamente sus fechas.', ['minimum','capacity',...simFlows]);
    } else if (input.intent === 'compare') {
        choice('summary','conclusion','La comparación muestra por separado el cierre original de octubre y el corte seleccionado.', ['original_result','result','original_equity','equity','original_liabilities','liabilities']);
        choice('alternative','alternatives','Usar la versión seleccionada para estudiar el efecto del cambio y conservar la versión original como referencia.', ['original_result','result']);
    } else {
        choice('summary','conclusion','El resultado del período, el patrimonio y la caja utilizable se interpretan junto con los compromisos y el mínimo de caja del escenario.', ['result','equity','usable','minimum','capacity']);
        choice('summary_cash','conclusion','La caja al corte indica disponibilidad inicial. Para decidir cuánto comprometer, el mínimo previsto y el piso muestran la holgura del escenario.', ['usable','minimum','floor','capacity']);
        choice('alternative','alternatives','Mantener la posición conserva la trayectoria de referencia. Una compra requiere simular sus propios flujos y fechas.', ['minimum','capacity']);
    }
    if (!sim) choice('risk','risks',projection.gap > 0 ? 'Prioridad alta. La caja proyectada cae por debajo del piso.' :
        'Revisar los vencimientos antes de comprometer caja. La holgura depende del escenario seleccionado.', ['minimum','floor','gap']);
    const outside = projection.scheduled.some(flow => flow.amount > 0 && flow.day > projection.horizon);
    choice('timeline','evidence',projection.minimum == null ? 'Los flujos conservan sus fechas y monedas. Faltan datos para obtener un mínimo.' :
        outside ? 'Los flujos fechados explican el mínimo. El cobro fuera del horizonte no aporta caja dentro del período proyectado.' :
            'Los flujos fechados y la caja al inicio determinan el mínimo de este escenario.', ['minimum',...timeline]);
    choice('limits','limitations',sim?.alerts.some(a => a.code === 'missing_fx') ?
        'Falta una cotización para expresar los flujos en la moneda del escenario. Se conserva cada moneda de origen.' :
        'Datos sintéticos y supuestos del escenario seleccionado. Los casos separados de cartera no se imputan a este cierre. Los acuerdos, políticas e impuestos reales requieren validación.', sim?.quality === 'not_calculable' ? simFlows : ['floor']);
    choice('next','nextStep','Confirmar fechas de pago y cobro, y recalcular la alternativa bajo estrés antes de decidir.', ['capacity','floor']);
    return { id,context,evidence,choices };
}
