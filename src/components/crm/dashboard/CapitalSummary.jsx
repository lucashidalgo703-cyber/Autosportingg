import CrmCard from '../ui/CrmCard';
import { DollarSign, Wallet, TrendingUp, AlertCircle } from 'lucide-react';

export default function CapitalSummary({ metrics }) {
    const formatCurrency = (val) => new Intl.NumberFormat('es-AR').format(val || 0);

    return (
        <div className="space-y-4">
            <div className="flex items-center gap-2 mb-2">
                <h3 className="text-white font-semibold text-lg">Capital Activo Estimado</h3>
                <span className="px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 text-[10px] font-bold uppercase tracking-wider border border-blue-500/20">
                    Datos Reales
                </span>
            </div>
            
            <p className="text-xs text-crm-fg-muted flex items-center gap-1.5 bg-crm-bg px-3 py-2 rounded-lg border border-crm-border w-max">
                <AlertCircle size={14} className="text-yellow-500" />
                Excluye autos vendidos. Totales separados por moneda. Sin conversión ARS/USD.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
                {/* Capital Publicado */}
                <div className="bg-crm-bg border border-crm-border rounded-xl p-4 flex flex-col justify-between">
                    <div className="flex items-center justify-between mb-4">
                        <span className="text-crm-fg-muted text-sm font-medium">Capital Publicado</span>
                        <div className="w-8 h-8 rounded-full bg-green-500/10 flex items-center justify-center text-green-500">
                            <DollarSign size={16} />
                        </div>
                    </div>
                    <div className="space-y-1">
                        <p className="text-2xl font-bold text-white tracking-tight">USD {formatCurrency(metrics.capitalPublicado.USD)}</p>
                        <p className="text-sm font-semibold text-crm-fg-muted">ARS {formatCurrency(metrics.capitalPublicado.ARS)}</p>
                    </div>
                </div>

                {/* Capital Costo */}
                <div className="bg-crm-bg border border-crm-border rounded-xl p-4 flex flex-col justify-between">
                    <div className="flex items-center justify-between mb-4">
                        <span className="text-crm-fg-muted text-sm font-medium">Costo de Compra</span>
                        <div className="w-8 h-8 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-500">
                            <Wallet size={16} />
                        </div>
                    </div>
                    <div className="space-y-1">
                        <p className="text-2xl font-bold text-white tracking-tight">USD {formatCurrency(metrics.capitalCosto.USD)}</p>
                        <p className="text-sm font-semibold text-crm-fg-muted">ARS {formatCurrency(metrics.capitalCosto.ARS)}</p>
                    </div>
                </div>

                {/* Gastos */}
                <div className="bg-crm-bg border border-crm-border rounded-xl p-4 flex flex-col justify-between">
                    <div className="flex items-center justify-between mb-4">
                        <span className="text-crm-fg-muted text-sm font-medium">Gastos (Stock Activo)</span>
                        <div className="w-8 h-8 rounded-full bg-crm-red/10 flex items-center justify-center text-crm-red">
                            <AlertCircle size={16} />
                        </div>
                    </div>
                    <div className="space-y-1">
                        <p className="text-2xl font-bold text-white tracking-tight">USD {formatCurrency(metrics.gastosTotales.USD)}</p>
                        <p className="text-sm font-semibold text-crm-fg-muted">ARS {formatCurrency(metrics.gastosTotales.ARS)}</p>
                    </div>
                </div>

                {/* Margen Estimado */}
                <div className="bg-crm-bg border border-crm-border rounded-xl p-4 flex flex-col justify-between">
                    <div className="flex items-center justify-between mb-4">
                        <span className="text-crm-fg-muted text-sm font-medium">Margen Bruto Estimado</span>
                        <div className="w-8 h-8 rounded-full bg-purple-500/10 flex items-center justify-center text-purple-400">
                            <TrendingUp size={16} />
                        </div>
                    </div>
                    <div className="space-y-1">
                        <p className="text-2xl font-bold text-purple-400 tracking-tight">USD {formatCurrency(metrics.margenEstimado.USD)}</p>
                        <p className="text-sm font-semibold text-crm-fg-muted">ARS {formatCurrency(metrics.margenEstimado.ARS)}</p>
                    </div>
                </div>
            </div>

            {metrics.unidadesSinMoneda > 0 && (
                <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-3 text-sm text-yellow-500 flex items-center gap-2">
                    <AlertCircle size={16} />
                    <span>Existen <strong>{metrics.unidadesSinMoneda} unidades activas</strong> con precio pero sin moneda definida. No fueron incluidas en estos totales monetarios.</span>
                </div>
            )}
        </div>
    );
}
