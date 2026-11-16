export const BUYER_PROCEDURE_STAGES = [
    { key: 'pendiente', label: 'Pendiente' },
    { key: 'documentacion', label: 'Documentación' },
    { key: 'presentado', label: 'Presentado' },
    { key: 'transferido', label: 'Transferido' },
    { key: 'finalizado', label: 'Finalizado' }
];
const genericStages = BUYER_PROCEDURE_STAGES.filter(stage => stage.key !== 'transferido');
const normalize = value => String(value || '').trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, ' ');

export function buyerProcedureTimeline(status, type) {
    const normalized = normalize(status);
    const normalizedType = normalize(type);
    // A finished report, form or patent procedure does not imply a vehicle
    // transfer. Keep that stage only for transfer workflows or an actual
    // Transferido status recorded by Gestoría.
    const transfer = ['transferencia ingreso', 'transferencia egreso'].includes(normalizedType) || normalized === 'transferido';
    const stages = transfer ? BUYER_PROCEDURE_STAGES : genericStages;
    const currentIndex = stages.findIndex(stage => stage.key === normalized);
    const observed = normalized === 'observado';
    const cancelled = normalized === 'cancelado';
    const label = currentIndex >= 0 ? stages[currentIndex].label
        : observed ? 'Con observaciones'
        : cancelled ? 'Trámite cancelado'
        : ({ en_proceso: 'En proceso', listo: 'Listo', entregado: 'Entregado' }[normalized] || 'Etapa por confirmar');
    return {
        stages, currentIndex, observed, cancelled, label,
        complete: currentIndex === stages.length - 1,
        progress: currentIndex < 0 ? 0 : currentIndex / (stages.length - 1) * 100,
        // Observations and cancellation do not say which earlier stages were
        // completed. Never infer that history from a terminal/special label.
        inProgress: currentIndex >= 0 && currentIndex < stages.length - 1
    };
}
