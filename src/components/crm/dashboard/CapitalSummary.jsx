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
            
            <p className="text-xs text-[#A1A1AA] flex items-center gap-1.5 bg-[#1A1A1F] px-3 py-2 rounded-lg border border-white/5 w-max">
                <AlertCircle size={14} className="text-yellow-500" />
                Excluye autos vendidos. Totales separados por moneda. Sin conversión ARS/USD.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
                {/* Capital Publicado */}
                <CrmCard className="p-5 flex flex-col justify-between">
                    <div className="flex items-center justify-between mb-4">
                        <span className="text-[#A1A1AA] text-sm font-medium">Capital Publicado</span>
                        <div className="w-8 h-8 rounded-full bg-[#22C55E]/10 flex items-center justify-center text-[#22C55E]">
                            <DollarSign size={16} />
                        </div>
                    </div>
                    <div className="space-y-1">
                        <p className="text-2xl font-bold text-white tracking-tight">USD {formatCurrency(metrics.capitalPublicado.USD)}</p>
                        <p className="text-sm font-semibold text-[#A1A1AA]">ARS {formatCurrency(metrics.capitalPublicado.ARS)}</p>
                    </div>
                </CrmCard>

                {/* Capital Costo */}
                <CrmCard className="p-5 flex flex-col justify-between">
                    <div className="flex items-center justify-between mb-4">
                        <span className="text-[#A1A1AA] text-sm font-medium">Costo de Compra</span>
                        <div className="w-8 h-8 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-500">
                            <Wallet size={16} />
                        </div>
                    </div>
                    <div className="space-y-1">
                        <p className="text-2xl font-bold text-white tracking-tight">USD {formatCurrency(metrics.capitalCosto.USD)}</p>
                        <p className="text-sm font-semibold text-[#A1A1AA]">ARS {formatCurrency(metrics.capitalCosto.ARS)}</p>
                    </div>
                </CrmCard>

                {/* Gastos */}
                <CrmCard className="p-5 flex flex-col justify-between">
                    <div className="flex items-center justify-between mb-4">
                        <span className="text-[#A1A1AA] text-sm font-medium">Gastos (Stock Activo)</span>
                        <div className="w-8 h-8 rounded-full bg-red-500/10 flex items-center justify-center text-red-500">
                            <AlertCircle size={16} />
                        </div>
                    </div>
                    <div className="space-y-1">
                        <p className="text-2xl font-bold text-white tracking-tight">USD {formatCurrency(metrics.gastosTotales.USD)}</p>
                        <p className="text-sm font-semibold text-[#A1A1AA]">ARS {formatCurrency(metrics.gastosTotales.ARS)}</p>
                    </div>
                </CrmCard>

                {/* Margen Estimado */}
                <CrmCard className="p-5 flex flex-col justify-between">
                    <div className="flex items-center justify-between mb-4">
                        <span className="text-[#A1A1AA] text-sm font-medium">Margen Bruto Estimado</span>
                        <div className="w-8 h-8 rounded-full bg-[#8B5CF6]/10 flex items-center justify-center text-[#8B5CF6]">
                            <TrendingUp size={16} />
                        </div>
                    </div>
                    <div className="space-y-1">
                        <p className="text-2xl font-bold text-[#8B5CF6] tracking-tight">USD {formatCurrency(metrics.margenEstimado.USD)}</p>
                        <p className="text-sm font-semibold text-[#A1A1AA]">ARS {formatCurrency(metrics.margenEstimado.ARS)}</p>
                    </div>
                </CrmCard>
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
