import CrmCard from '../ui/CrmCard';
import { TrendingUp, Clock, ExternalLink } from 'lucide-react';
import Link from 'next/link';

export default function TopStockPanels({ metrics }) {
    const { topInmovilizado, topAntiguos } = metrics;
    const formatCurrency = (val) => new Intl.NumberFormat('es-AR').format(val || 0);

    const CarList = ({ items, valueFormatter, valueColor }) => {
        if (!items || items.length === 0) return <p className="text-sm text-gray-500">No hay datos suficientes.</p>;

        return (
            <div className="space-y-3">
                {items.map((car, index) => (
                    <div key={car.id} className="flex items-center justify-between p-3 rounded-lg border border-white/5 bg-[#161619] hover:bg-[#1A1A1F] transition-colors group">
                        <div className="flex items-center gap-3 overflow-hidden">
                            <span className="text-xs font-bold text-gray-500 w-4">{index + 1}.</span>
                            {car.coverImage ? (
                                <div className="w-8 h-8 rounded bg-[#222] overflow-hidden shrink-0">
                                    <img src={car.coverImage} alt={car.brand} className="w-full h-full object-cover" />
                                </div>
                            ) : (
                                <div className="w-8 h-8 rounded bg-[#2a2a2e] border border-white/5 shrink-0" />
                            )}
                            <div className="overflow-hidden">
                                <p className="text-sm font-semibold text-white truncate">{car.brand} {car.name}</p>
                                <p className="text-[10px] text-[#A1A1AA] uppercase">{car.status}</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-4 shrink-0 pl-2">
                            <p className={`text-sm font-bold ${valueColor}`}>{valueFormatter(car)}</p>
                            <Link href={`/admin/stock/${car.id}`} className="text-gray-400 hover:text-white transition-colors opacity-0 group-hover:opacity-100">
                                <ExternalLink size={14} />
                            </Link>
                        </div>
                    </div>
                ))}
            </div>
        );
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <CrmCard>
                <div className="flex items-center justify-between mb-6">
                    <h3 className="text-white font-semibold text-lg flex items-center gap-2">
                        Top 5 Mayor Capital Costo
                    </h3>
                    <TrendingUp size={18} className="text-blue-500" />
                </div>
                <CarList 
                    items={topInmovilizado} 
                    valueFormatter={(c) => `${c.purchaseCurrency} ${formatCurrency(c.purchasePrice)}`}
                    valueColor="text-blue-400"
                />
            </CrmCard>

            <CrmCard>
                <div className="flex items-center justify-between mb-6">
                    <h3 className="text-white font-semibold text-lg flex items-center gap-2">
                        Top 5 Más Días en Stock
                    </h3>
                    <Clock size={18} className="text-orange-500" />
                </div>
                <CarList 
                    items={topAntiguos} 
                    valueFormatter={(c) => `${c.daysInStock} días`}
                    valueColor="text-orange-400"
                />
            </CrmCard>
        </div>
    );
}
