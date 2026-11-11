"use client";

export const FINANCE_GROUPS = [
    {
        id: 'resumen', label: 'Resumen', tabs: [
            { id: 'resumen', icon: '📊', label: 'Resumen' },
            { id: 'cobrar-pagar', icon: '🔁', label: 'Por cobrar y pagar' }
        ]
    },
    {
        id: 'caja', label: 'Caja y bancos', tabs: [
            { id: 'cuentas', icon: '🏦', label: 'Cuentas' },
            { id: 'movimientos', icon: '🧾', label: 'Movimientos' },
            { id: 'cheques', icon: '📄', label: 'Cheques' }
        ]
    },
    {
        id: 'cobros', label: 'Cobros', tabs: [
            { id: 'vehiculos-cobrar', icon: '🚘', label: 'Vehículos por cobrar' },
            { id: 'cuotas', icon: '📆', label: 'Cuotas' },
            { id: 'senas', icon: '🤝', label: 'Señas' }
        ]
    },
    {
        id: 'pagos', label: 'Pagos', tabs: [
            { id: 'pagos', icon: '💸', label: 'Pagos disponibles' },
            { id: 'cuotas-pagar', icon: '📆', label: 'Cuotas a pagar' },
            { id: 'comisiones', icon: '🪙', label: 'Comisiones' },
            { id: 'devoluciones-registro', icon: '↩️', label: 'Devoluciones registro' },
            { id: 'retiros', icon: '🏧', label: 'Retiros' },
            { id: 'tarjeta', icon: '💳', label: 'Tarjeta' },
            { id: 'prestamos', icon: '🤲', label: 'Préstamos' },
            { id: 'pago-empresas', icon: '🏢', label: 'Pago Empresas' },
            { id: 'sueldos', icon: '🧑‍💼', label: 'Sueldos' },
            { id: 'taller', icon: '🔧', label: 'Taller / Mecánico' },
            { id: 'gastos-personales', icon: '👤', label: 'Gastos Personales' },
        ]
    },
    {
        id: 'control', label: 'Control y cierres', tabs: [
            { id: 'conciliacion', icon: '✅', label: 'Conciliación' },
            { id: 'arqueos', icon: '🔍', label: 'Arqueos' },
            { id: 'cierre', icon: '🧮', label: 'Cierre de caja' },
            { id: 'periodos', icon: '🗂️', label: 'Períodos' },
            { id: 'afip', icon: '🏛️', label: 'AFIP/IVA' }
        ]
    },
    {
        id: 'analisis', label: 'Análisis y planificación', tabs: [
            { id: 'rentabilidad', icon: '📈', label: 'Rentabilidad' },
            { id: 'resumen-gastos', icon: '📉', label: 'Resumen Gastos' },
            { id: 'presupuesto', icon: '📋', label: 'Presupuesto' },
            { id: 'recurrencias', icon: '🔄', label: 'Recurrencias' }
        ]
    }
];

// Se conservan los identificadores de los enlaces ?tab= existentes.
export const FINANCE_TABS = FINANCE_GROUPS.flatMap((group) => group.tabs);

export default function FinanceNavigation({ activeTab, onTabChange }) {
    const activeGroup = FINANCE_GROUPS.find((group) => group.tabs.some((tab) => tab.id === activeTab)) || FINANCE_GROUPS[0];
    const buttonClass = (active) => `inline-flex min-h-10 shrink-0 items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-crm-red focus-visible:ring-offset-2 focus-visible:ring-offset-crm-bg ${
        active
            ? 'bg-crm-red text-white shadow-sm'
            : 'bg-transparent text-crm-fg-muted hover:bg-crm-surface-raised hover:text-crm-fg'
    }`;

    return (
        <div className="mb-6 space-y-2 border-b border-crm-border pb-2">
            <div className="overflow-x-auto custom-scrollbar">
                <nav aria-label="Grupos de Finanzas" className="flex w-max min-w-full gap-1">
                    {FINANCE_GROUPS.map((group) => (
                        <button
                            key={group.id}
                            type="button"
                            aria-pressed={activeGroup.id === group.id}
                            aria-controls="finanzas-contenido"
                            onClick={() => {
                                if (activeGroup.id !== group.id) onTabChange(group.tabs[0].id);
                            }}
                            className={buttonClass(activeGroup.id === group.id)}
                        >
                            {group.label}
                        </button>
                    ))}
                </nav>
            </div>
            <div className="overflow-x-auto custom-scrollbar">
                <nav aria-label="Pestañas de Finanzas" className="flex w-max min-w-full gap-1">
                    {activeGroup.tabs.map((tab) => (
                        <button
                            key={tab.id}
                            type="button"
                            aria-pressed={activeTab === tab.id}
                            aria-controls="finanzas-contenido"
                            onClick={() => onTabChange(tab.id)}
                            className={buttonClass(activeTab === tab.id)}
                        >
                            <span aria-hidden="true">{tab.icon}</span>
                            {tab.label}
                        </button>
                    ))}
                </nav>
            </div>
        </div>
    );
}
