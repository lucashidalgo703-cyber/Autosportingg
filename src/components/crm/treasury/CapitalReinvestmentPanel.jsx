import {
    AlertTriangle,
    ArrowDownToLine,
    ArrowUpRight,
    BadgeCheck,
    Banknote,
    CarFront,
    CircleHelp,
    Landmark,
    ShieldAlert
} from 'lucide-react';

function money(value, currency) {
    if (value === null || value === undefined || !Number.isFinite(Number(value))) return 'Pendiente de conciliación';
    return new Intl.NumberFormat('es-AR', {
        style: 'currency',
        currency,
        maximumFractionDigits: 2
    }).format(Number(value));
}

function MetricCard({ label, value, currency, icon: Icon, tone = 'cyan', detail }) {
    const tones = {
        cyan: 'border-cyan-400/20 bg-cyan-400/[0.06] text-cyan-200',
        emerald: 'border-emerald-400/20 bg-emerald-400/[0.06] text-emerald-200',
        amber: 'border-amber-400/20 bg-amber-400/[0.06] text-amber-200',
        violet: 'border-violet-400/20 bg-violet-400/[0.06] text-violet-200',
        slate: 'border-white/10 bg-white/[0.035] text-slate-200'
    };

    return (
        <article className={`rounded-2xl border p-4 ${tones[tone]}`}>
            <div className="flex items-center justify-between gap-3">
                <span className="text-xs font-semibold uppercase tracking-[0.14em] text-crm-fg-muted">{label}</span>
                <Icon size={17} aria-hidden="true" />
            </div>
            <p className="mt-3 break-words text-xl font-bold text-crm-fg sm:text-2xl">{money(value, currency)}</p>
            {detail && <p className="mt-2 text-xs leading-relaxed text-crm-fg-muted">{detail}</p>}
        </article>
    );
}

function CurrencySection({ currency, totals, liquidity }) {
    return (
        <section className="rounded-3xl border border-white/10 bg-[#101820] p-4 sm:p-6" aria-labelledby={`capital-${currency}`}>
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <h3 id={`capital-${currency}`} className="text-lg font-bold text-crm-fg">{currency}</h3>
                <span className={`rounded-full px-3 py-1 text-xs font-semibold ${liquidity.status === 'conciliado' ? 'bg-emerald-400/10 text-emerald-300' : 'bg-amber-400/10 text-amber-200'}`}>
                    {liquidity.status === 'conciliado' ? 'Saldos conciliados' : 'Pendiente de conciliación'}
                </span>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                <MetricCard label="Capital invertido" value={totals.ownCapitalDisbursed} currency={currency} icon={ArrowDownToLine} tone="slate" detail="Desembolsos propios verificados con egresos vinculados." />
                <MetricCard label="Capital recuperado" value={totals.capitalRecovered} currency={currency} icon={ArrowUpRight} tone="emerald" detail="Estimado desde cobros confirmados de operaciones conciliadas." />
                <MetricCard label="Capital pendiente" value={totals.capitalPending} currency={currency} icon={CircleHelp} tone="amber" detail="Objetivo de recuperación menos recuperaciones registradas." />
                <MetricCard label="Capital reinvertido" value={totals.reinvested} currency={currency} icon={CarFront} tone="violet" detail="Pagos activos vinculados a vehículos y debitados de Stock." />
                <MetricCard label="Capital disponible para comprar" value={liquidity.availableForPurchase} currency={currency} icon={Banknote} tone="cyan" detail="Stock libre más fondos propios no asignados; excluye terceros y cajas protegidas." />
                <MetricCard label="Capital recuperado pendiente de asignación" value={totals.recoveredPendingAssignment} currency={currency} icon={Landmark} tone="slate" detail="Diferencia entre recuperación estimada y asignación auditada a Stock." />
            </div>
            <div className="mt-4 grid gap-3 rounded-2xl border border-white/8 bg-black/15 p-4 text-sm sm:grid-cols-2">
                <div>
                    <p className="text-xs uppercase tracking-wide text-crm-fg-muted">Efectivo conciliado en cuentas</p>
                    <p className="mt-1 font-semibold text-crm-fg">{money(liquidity.accountCash, currency)}</p>
                </div>
                <div>
                    <p className="text-xs uppercase tracking-wide text-crm-fg-muted">Fondos propios sin asignar</p>
                    <p className="mt-1 font-semibold text-crm-fg">{money(liquidity.ownUnassigned, currency)}</p>
                </div>
                <div>
                    <p className="text-xs uppercase tracking-wide text-crm-fg-muted">Fondos protegidos</p>
                    <p className="mt-1 font-semibold text-crm-fg">{money(liquidity.protectedFunds, currency)}</p>
                </div>
                <div>
                    <p className="text-xs uppercase tracking-wide text-crm-fg-muted">Compromisos registrados</p>
                    <p className="mt-1 font-semibold text-crm-fg">{money(liquidity.commitments, currency)}</p>
                </div>
            </div>
        </section>
    );
}

function OperationCard({ operation, demo }) {
    const reconciled = operation.status === 'conciliado';
    return (
        <article className="rounded-2xl border border-white/10 bg-[#101820] p-4 sm:p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                    <h4 className="font-bold text-crm-fg">{operation.vehicleLabel}</h4>
                    <p className="mt-1 text-xs text-crm-fg-muted">{demo ? 'Operación ficticia' : 'Operación CRM · solo lectura'} · {operation.currency}</p>
                </div>
                <span className={`rounded-full px-3 py-1 text-xs font-semibold ${reconciled ? 'bg-emerald-400/10 text-emerald-300' : 'bg-amber-400/10 text-amber-200'}`}>
                    {reconciled ? 'Conciliado' : 'Pendiente de conciliación'}
                </span>
            </div>
            <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 text-sm md:grid-cols-4">
                <div><dt className="text-xs text-crm-fg-muted">Costo de adquisición</dt><dd className="mt-1 font-semibold text-crm-fg">{money(operation.acquisitionCost, operation.currency)}</dd></div>
                <div><dt className="text-xs text-crm-fg-muted">Desembolsado</dt><dd className="mt-1 font-semibold text-crm-fg">{money(operation.ownCapitalDisbursed, operation.currency)}</dd></div>
                <div><dt className="text-xs text-crm-fg-muted">Deuda pendiente</dt><dd className="mt-1 font-semibold text-crm-fg">{money(operation.acquisitionDebt, operation.currency)}</dd></div>
                <div><dt className="text-xs text-crm-fg-muted">Margen devengado / cobrado</dt><dd className="mt-1 font-semibold text-crm-fg">{money(operation.estimatedMargin, operation.currency)} <span className="text-crm-fg-muted">/</span> {money(operation.realizedMargin, operation.currency)}</dd></div>
                <div><dt className="text-xs text-crm-fg-muted">Recuperado</dt><dd className="mt-1 font-semibold text-emerald-200">{money(operation.capitalRecovered, operation.currency)}</dd></div>
                <div><dt className="text-xs text-crm-fg-muted">Asignado a Stock</dt><dd className="mt-1 font-semibold text-cyan-200">{money(operation.capitalAllocatedToStock, operation.currency)}</dd></div>
                <div><dt className="text-xs text-crm-fg-muted">Pendiente de recuperar</dt><dd className="mt-1 font-semibold text-amber-200">{money(operation.capitalPending, operation.currency)}</dd></div>
                <div><dt className="text-xs text-crm-fg-muted">Extra configurado / asignado</dt><dd className="mt-1 font-semibold text-crm-fg">{money(operation.reinvestmentTarget, operation.currency)} / {money(operation.reinvestmentAllocated, operation.currency)}</dd></div>
            </dl>
            {operation.distributionRecommendation && (
                <details className="mt-4 rounded-xl border border-cyan-300/15 bg-cyan-300/[0.04] p-3">
                    <summary className="cursor-pointer text-sm font-semibold text-cyan-100">Vista previa con el esquema vigente · sin movimientos</summary>
                    <p className="mt-3 text-xs leading-relaxed text-crm-fg-muted">{operation.distributionRecommendation.explanation || operation.distributionRecommendation.pendingReason || 'Propuesta calculada por el waterfall de Tesorería existente.'}</p>
                    <div className="mt-3 grid gap-2 text-xs sm:grid-cols-2">
                        <p>Recuperación a Stock: <strong className="text-crm-fg">{money(operation.distributionRecommendation.capitalRecoveredToStock, operation.currency)}</strong></p>
                        <p>Obligaciones separadas: <strong className="text-crm-fg">{money(operation.distributionRecommendation.obligationsSeparated, operation.currency)}</strong></p>
                        <p>Extra de reinversión: <strong className="text-crm-fg">{money(operation.distributionRecommendation.extraReinvestmentToStock, operation.currency)}</strong></p>
                        <p>Sin asignar: <strong className="text-crm-fg">{money(operation.distributionRecommendation.pendingDistributionAmount, operation.currency)}</strong></p>
                    </div>
                </details>
            )}
            {operation.waterfallReconciliation && (
                <details className="mt-4 rounded-xl border border-white/10 bg-white/[0.02] p-3">
                    <summary className="cursor-pointer text-sm font-semibold text-crm-fg">Conciliación contra distribuciones de Tesorería · {operation.waterfallReconciliation.status === 'conciliado' ? 'conciliada' : 'pendiente'}</summary>
                    <p className="mt-2 text-xs text-crm-fg-muted">Venta: {operation.waterfallReconciliation.saleDate ? new Date(operation.waterfallReconciliation.saleDate).toLocaleDateString('es-AR') : 'sin fecha disponible'}. Valores de origen comparados con el cálculo proyectado; moneda {operation.currency}.</p>
                    <div className="mt-3 grid gap-2 text-xs sm:grid-cols-2">
                        {Object.entries(operation.waterfallReconciliation.differences).map(([key, difference]) => (
                            <p key={key} className="text-crm-fg-muted">Diferencia {key}: <strong className="font-mono text-crm-fg">{difference === null ? 'No comparable' : money(difference, operation.currency)}</strong></p>
                        ))}
                    </div>
                    {operation.waterfallReconciliation.reason && <p className="mt-2 text-xs text-amber-200">{operation.waterfallReconciliation.reason}</p>}
                </details>
            )}
            {operation.warnings.length > 0 && (
                <ul className="mt-4 space-y-2 border-t border-white/8 pt-3">
                    {operation.warnings.map((warning) => (
                        <li key={warning.code} className="flex gap-2 text-xs leading-relaxed text-amber-200">
                            <AlertTriangle size={15} className="mt-0.5 shrink-0" aria-hidden="true" />
                            {warning.message}
                        </li>
                    ))}
                </ul>
            )}
        </article>
    );
}

export default function CapitalReinvestmentPanel({ projection }) {
    const needsReconciliation = projection.reconciliationStatus !== 'conciliado';

    return (
        <div className="space-y-6 text-crm-fg">
            {projection.demo && (
                <div className="flex items-start gap-3 rounded-2xl border border-sky-300/20 bg-sky-300/[0.07] p-4 text-sm text-sky-100">
                    <BadgeCheck size={18} className="mt-0.5 shrink-0" aria-hidden="true" />
                    <p><strong>Demostración con datos ficticios.</strong> Esta vista no consulta ni modifica ventas, cobros, cuentas, cajas ni operaciones del CRM.</p>
                </div>
            )}

            <section className={`rounded-3xl border p-5 sm:p-6 ${needsReconciliation ? 'border-amber-400/25 bg-amber-400/[0.06]' : 'border-emerald-400/20 bg-emerald-400/[0.05]'}`}>
                <div className="flex items-start gap-3">
                    {needsReconciliation ? <ShieldAlert className="mt-1 shrink-0 text-amber-200" /> : <BadgeCheck className="mt-1 shrink-0 text-emerald-200" />}
                    <div>
                        <p className="text-xs font-bold uppercase tracking-[0.16em] text-crm-fg-muted">Recomendación financiera</p>
                        <h2 className="mt-2 text-xl font-bold text-crm-fg">{projection.recommendation.title}</h2>
                        <p className="mt-2 max-w-3xl text-sm leading-relaxed text-crm-fg-muted">{projection.recommendation.detail}</p>
                    </div>
                </div>
            </section>

            <div className="grid gap-4 2xl:grid-cols-2">
                {['ARS', 'USD'].map((currency) => (
                    <CurrencySection
                        key={currency}
                        currency={currency}
                        totals={projection.currencies[currency]}
                        liquidity={projection.liquidity[currency]}
                    />
                ))}
            </div>

            <section className="space-y-3" aria-labelledby="capital-vehicles-title">
                <div className="flex flex-wrap items-end justify-between gap-2">
                    <div>
                        <p className="text-xs font-bold uppercase tracking-[0.16em] text-cyan-200">Detalle de operaciones</p>
                        <h3 id="capital-vehicles-title" className="mt-1 text-xl font-bold">Capital por vehículo</h3>
                    </div>
                    <p className="text-xs text-crm-fg-muted">ARS y USD se muestran por separado; no se convierten ni se suman entre sí.</p>
                </div>
                <div className="grid gap-3 xl:grid-cols-2">
                    {projection.operations.map((operation) => <OperationCard key={operation.id} operation={operation} demo={projection.demo} />)}
                </div>
            </section>

            {projection.warnings.length > 0 && (
                <section className="rounded-2xl border border-amber-400/20 bg-amber-400/[0.05] p-4" aria-labelledby="capital-warnings-title">
                    <h3 id="capital-warnings-title" className="flex items-center gap-2 font-bold text-amber-100"><AlertTriangle size={17} /> Conciliaciones pendientes</h3>
                    <ul className="mt-3 grid gap-2 text-sm text-amber-100/90 md:grid-cols-2">
                        {projection.warnings.map((warning) => <li key={warning.code}>{warning.message}</li>)}
                    </ul>
                </section>
            )}

            <p className="text-xs leading-relaxed text-crm-fg-muted">
                Capital recuperado indica cobros aplicados por el cálculo de Tesorería; capital asignado refleja distribuciones auditadas a Stock; capital reinvertido solo incluye egresos vinculados a vehículos con débito confirmado de Stock. “Margen cobrado” es la salida del waterfall actual y no sustituye un criterio contable de reconocimiento.
            </p>
        </div>
    );
}
