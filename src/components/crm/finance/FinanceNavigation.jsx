import React from 'react';
import { BarChart3, CreditCard, HandCoins, LayoutDashboard, Wallet } from 'lucide-react';

const FINANCE_GROUPS = [
    { id: 'overview', label: 'Resumen', icon: LayoutDashboard, tabs: ['resumen'] },
    { id: 'cash', label: 'Caja y cuentas', icon: Wallet, tabs: ['movimientos', 'cuentas', 'tarjeta', 'cheques', 'retiros', 'arqueos', 'cierre'] },
    { id: 'collections', label: 'Cobranzas', icon: HandCoins, tabs: ['cuotas', 'senas', 'cobrar-pagar'] },
    { id: 'payments', label: 'Pagos y gastos', icon: CreditCard, tabs: ['resumen-gastos', 'pagos', 'pago-empresas', 'comisiones', 'sueldos', 'taller', 'gastos-personales', 'prestamos', 'recurrencias'] },
    { id: 'control', label: 'Análisis y control', icon: BarChart3, tabs: ['rentabilidad', 'presupuesto', 'conciliacion', 'afip'] }
];

const SECTION_DESCRIPTIONS = {
    resumen: 'Dinero disponible, actividad por moneda y cuotas que requieren atención.',
    movimientos: 'Consultá ingresos y egresos, filtrá registros y abrí el detalle de cada movimiento.',
    cuentas: 'Administrá las cuentas y consultá sus saldos y movimientos.',
    tarjeta: 'Registrá y consultá los gastos realizados con tarjeta.',
    cheques: 'Controlá cheques recibidos y emitidos, sus estados y vencimientos.',
    retiros: 'Consultá y registrá retiros de dinero de la agencia.',
    arqueos: 'Compará el dinero contado con el saldo registrado en cada cuenta.',
    cierre: 'Generá y consultá los cierres diarios de caja.',
    cuotas: 'Buscá cuotas, revisá vencimientos y accedé al cobro y a su operación.',
    senas: 'Consultá las señas recibidas, aplicadas y devueltas.',
    'cobrar-pagar': 'Revisá los saldos pendientes por cobrar y por pagar.',
    'resumen-gastos': 'Revisá los gastos de la agencia agrupados por categoría.',
    pagos: 'Consultá las ventas pendientes de liquidación y los pagos a propietarios.',
    'pago-empresas': 'Consultá y registrá pagos a empresas y proveedores.',
    comisiones: 'Revisá las comisiones pendientes y pagadas.',
    sueldos: 'Consultá y registrá los pagos de sueldos.',
    taller: 'Consultá los gastos y pagos de taller y mecánico.',
    'gastos-personales': 'Administrá los movimientos y activos de las finanzas personales.',
    prestamos: 'Registrá préstamos recibidos y controlá sus devoluciones.',
    recurrencias: 'Organizá los ingresos y egresos que se repiten cada mes.',
    rentabilidad: 'Analizá los resultados económicos de las operaciones.',
    presupuesto: 'Compará los gastos con los importes presupuestados.',
    conciliacion: 'Controlá la conciliación de los movimientos financieros.',
    afip: 'Consultá la información fiscal y de IVA.'
};

function handleNavigationKey(event) {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
    const buttons = Array.from(event.currentTarget.parentElement.querySelectorAll('button'));
    const currentIndex = buttons.indexOf(event.currentTarget);
    if (currentIndex < 0 || !buttons.length) return;
    event.preventDefault();
    const nextIndex = event.key === 'Home' ? 0
        : event.key === 'End' ? buttons.length - 1
            : (currentIndex + (event.key === 'ArrowRight' ? 1 : -1) + buttons.length) % buttons.length;
    buttons[nextIndex]?.focus();
}

export default function FinanceNavigation({ tabs = [], activeTab, onTabChange }) {
    const registeredIds = new Set(FINANCE_GROUPS.flatMap(group => group.tabs));
    const additionalTabs = tabs.filter(tab => !registeredIds.has(tab.id));
    const groups = FINANCE_GROUPS.map(group => ({
        ...group,
        tabs: [
            ...group.tabs.map(id => tabs.find(tab => tab.id === id)).filter(Boolean),
            ...(group.id === 'control' ? additionalTabs : [])
        ]
    })).filter(group => group.tabs.length);
    const selectedTab = tabs.find(tab => tab.id === activeTab) || tabs[0];
    const selectedGroup = groups.find(group => group.tabs.some(tab => tab.id === selectedTab?.id)) || groups[0];

    if (!selectedGroup || !selectedTab) return null;

    return (
        <section className="min-w-0 rounded-2xl border border-crm-border bg-crm-surface p-2 sm:p-3" aria-label="Navegación de Finanzas">
            <div className="grid min-w-0 gap-2 p-1 sm:hidden">
                <label className="min-w-0 text-[11px] font-medium text-crm-fg-muted">
                    <span className="mb-1 block">Área de Finanzas</span>
                    <select
                        value={selectedGroup.id}
                        onChange={event => {
                            const group = groups.find(item => item.id === event.target.value);
                            if (group) onTabChange(group.tabs[0].id);
                        }}
                        className="h-10 w-full min-w-0 rounded-lg border border-crm-border bg-crm-surface-raised px-3 text-sm font-semibold text-crm-fg focus:border-crm-red focus:outline-none"
                    >
                        {groups.map(group => <option key={group.id} value={group.id}>{group.label}</option>)}
                    </select>
                </label>
                {selectedGroup.tabs.length > 1 && (
                    <label className="min-w-0 text-[11px] font-medium text-crm-fg-muted">
                        <span className="mb-1 block">Apartado de Finanzas</span>
                        <select
                            value={selectedTab.id}
                            onChange={event => onTabChange(event.target.value)}
                            className="h-10 w-full min-w-0 rounded-lg border border-crm-border bg-crm-surface-raised px-3 text-sm font-semibold text-crm-fg focus:border-crm-red focus:outline-none"
                        >
                            {selectedGroup.tabs.map(tab => <option key={tab.id} value={tab.id}>{tab.label}</option>)}
                        </select>
                    </label>
                )}
            </div>
            <nav aria-label="Categorías de Finanzas" className="hidden grid-cols-2 gap-2 sm:grid lg:grid-cols-5">
                {groups.map(({ id, label, icon: Icon, tabs: groupTabs }, index) => {
                    const active = selectedGroup.id === id;
                    return (
                        <button
                            key={id}
                            type="button"
                            aria-pressed={active}
                            onClick={() => onTabChange(active ? selectedTab.id : groupTabs[0].id)}
                            onKeyDown={handleNavigationKey}
                            className={'flex min-w-0 items-center gap-2 rounded-xl border px-3 py-3 text-left text-xs font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-crm-red sm:text-sm ' + (groups.length % 2 === 1 && index === groups.length - 1 ? 'col-span-2 lg:col-span-1 ' : '') + (active ? 'border-crm-red bg-crm-surface-raised text-crm-fg' : 'border-transparent text-crm-fg-muted hover:bg-crm-surface-raised hover:text-crm-fg')}
                        >
                            <Icon size={18} aria-hidden="true" className={'shrink-0 ' + (active ? 'text-crm-red' : 'text-crm-fg-muted')} />
                            <span className="min-w-0 leading-5">{label}</span>
                        </button>
                    );
                })}
            </nav>

            {selectedGroup.tabs.length > 1 && (
                <nav aria-label={'Apartados de ' + selectedGroup.label} className="mt-3 hidden flex-wrap gap-2 border-t border-crm-border pt-3 sm:flex">
                    {selectedGroup.tabs.map(tab => {
                        const active = tab.id === selectedTab.id;
                        return (
                            <button
                                key={tab.id}
                                type="button"
                                aria-current={active ? 'page' : undefined}
                                onClick={() => onTabChange(tab.id)}
                                onKeyDown={handleNavigationKey}
                                className={'inline-flex min-h-9 min-w-0 items-center gap-1.5 rounded-lg border px-3 py-2 text-left text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-crm-red ' + (active ? 'border-crm-red bg-crm-surface-raised text-crm-fg' : 'border-crm-border text-crm-fg-muted hover:bg-crm-surface-raised hover:text-crm-fg')}
                            >
                                <span aria-hidden="true" className="shrink-0">{tab.icon}</span>
                                <span>{tab.label}</span>
                            </button>
                        );
                    })}
                </nav>
            )}

            <p className="mb-0 mt-3 px-1 text-xs leading-5 text-crm-fg-muted">
                <span className="mr-1.5 font-semibold text-crm-fg">{selectedTab.label}:</span>
                {SECTION_DESCRIPTIONS[selectedTab.id] || 'Consultá y administrá los registros de este apartado.'}
            </p>
        </section>
    );
}
