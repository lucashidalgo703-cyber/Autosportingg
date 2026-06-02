import React, { useEffect } from 'react';
import { Handshake, AlertCircle, ArrowRight, Calendar, DollarSign } from 'lucide-react';
import { useAdminSales } from '../../../hooks/useAdminSales';
import Link from 'next/link';
import SaleStatusBadge from '../sales/SaleStatusBadge';

export default function ClientRelatedSalesPanel({ client }) {
    const { fetchSales, loading, error } = useAdminSales();
    const [sales, setSales] = React.useState([]);

    useEffect(() => {
        if (client?._id) {
            loadSales();
        }
    }, [client]);

    const loadSales = async () => {
        const data = await fetchSales();
        // Filtrar localmente por clientId ya que el hook podría no soportar el query param directo o mejor lo hacemos seguro
        const clientSales = (data || []).filter(s => s.clientId?._id === client._id || s.clientId === client._id);
        setSales(clientSales);
    };

    if (!client) return null;

    return (
        <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 h-full flex flex-col">
            <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
                <Handshake size={20} className="text-blue-500" />
                Ventas del cliente
            </h3>

            {loading && sales.length === 0 ? (
                <div className="flex-1 flex justify-center items-center h-32">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                </div>
            ) : error ? (
                <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-xl text-sm">
                    {error}
                </div>
            ) : sales.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center text-center p-6 border-2 border-dashed border-neutral-800 rounded-xl bg-neutral-900/50">
                    <div className="w-16 h-16 rounded-full bg-neutral-800 flex items-center justify-center mb-4">
                        <AlertCircle size={32} className="text-neutral-500" />
                    </div>
                    <h4 className="text-white font-bold mb-2">Sin Ventas</h4>
                    <p className="text-sm text-neutral-400">
                        Este cliente no tiene ventas oficiales vinculadas.
                    </p>
                </div>
            ) : (
                <div className="flex flex-col gap-3 overflow-y-auto pr-2 custom-scrollbar max-h-[300px]">
                    {sales.map(sale => (
                        <div key={sale._id} className="bg-black/30 border border-neutral-800 rounded-xl p-4 flex flex-col gap-3 transition-colors hover:border-neutral-700">
                            <div className="flex justify-between items-start">
                                <div>
                                    <SaleStatusBadge status={sale.status} />
                                    <p className="text-white font-medium text-sm line-clamp-1 mt-2">
                                        {sale.vehicleId ? `${sale.vehicleId.brand} ${sale.vehicleId.name}` : 'Vehículo'}
                                    </p>
                                </div>
                                <span className="text-sm font-bold text-green-400">
                                    {sale.saleCurrency} {(sale.salePrice || 0).toLocaleString('es-AR')}
                                </span>
                            </div>

                            <div className="flex justify-between items-center mt-2 pt-3 border-t border-neutral-800/50">
                                <div className="flex items-center gap-1.5 text-xs text-neutral-500">
                                    <Calendar size={12} />
                                    <span>{new Date(sale.saleDate || sale.createdAt).toLocaleDateString()}</span>
                                </div>
                                <Link 
                                    href={`/admin/ventas/${sale._id}`}
                                    className="text-xs text-blue-500 hover:text-blue-400 font-medium flex items-center gap-1 transition-colors"
                                >
                                    Ver Venta
                                    <ArrowRight size={12} />
                                </Link>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
