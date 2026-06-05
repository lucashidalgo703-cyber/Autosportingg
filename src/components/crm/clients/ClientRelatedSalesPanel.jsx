import React, { useEffect } from 'react';
import Link from 'next/link';
import { AlertCircle, ArrowRight, Calendar, Handshake } from 'lucide-react';
import { useAdminSales } from '../../../hooks/useAdminSales';
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
        // Filtrar localmente por clientId ya que el hook podria no soportar el query param directo.
        const clientSales = (data || []).filter(s => s.clientId?._id === client._id || s.clientId === client._id);
        setSales(clientSales);
    };

    if (!client) return null;

    return (
        <div className="flex h-full flex-col rounded-xl border border-crm-border bg-crm-surface p-5">
            <h3 className="m-0 mb-5 flex items-center gap-2 text-lg font-bold text-crm-fg">
                <Handshake size={19} className="text-blue-300" />
                Ventas del cliente
            </h3>

            {loading && sales.length === 0 ? (
                <div className="flex h-32 flex-1 items-center justify-center">
                    <div className="h-8 w-8 animate-spin rounded-full border-2 border-crm-border border-b-blue-400" />
                </div>
            ) : error ? (
                <div className="rounded-xl border border-crm-red/30 bg-crm-red/10 p-4 text-sm text-red-300">
                    {error}
                </div>
            ) : sales.length === 0 ? (
                <div className="flex flex-1 flex-col items-center justify-center rounded-xl border border-dashed border-crm-border bg-crm-bg p-6 text-center">
                    <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl border border-crm-border bg-crm-surface text-crm-fg-muted">
                        <AlertCircle size={24} />
                    </div>
                    <h4 className="m-0 mb-2 font-bold text-crm-fg">Sin ventas</h4>
                    <p className="m-0 text-sm text-crm-fg-muted">
                        Este cliente no tiene ventas oficiales vinculadas.
                    </p>
                </div>
            ) : (
                <div className="flex max-h-[300px] flex-col gap-3 overflow-y-auto pr-2 custom-scrollbar">
                    {sales.map(sale => (
                        <div key={sale._id} className="flex flex-col gap-3 rounded-xl border border-crm-border bg-crm-bg p-4 transition-colors hover:border-crm-border-strong">
                            <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0">
                                    <SaleStatusBadge status={sale.status} />
                                    <p className="m-0 mt-2 truncate text-sm font-semibold text-crm-fg">
                                        {sale.vehicleId ? `${sale.vehicleId.brand} ${sale.vehicleId.name}` : 'Vehiculo'}
                                    </p>
                                </div>
                                <span className="text-sm font-bold text-emerald-300">
                                    {sale.saleCurrency} {(sale.salePrice || 0).toLocaleString('es-AR')}
                                </span>
                            </div>

                            <div className="mt-1 flex items-center justify-between border-t border-crm-border pt-3">
                                <div className="flex items-center gap-1.5 text-xs text-crm-fg-muted">
                                    <Calendar size={12} />
                                    <span>{new Date(sale.saleDate || sale.createdAt).toLocaleDateString()}</span>
                                </div>
                                <Link
                                    href={`/admin/ventas/${sale._id}`}
                                    className="flex items-center gap-1 text-xs font-semibold text-blue-300 no-underline transition-colors hover:text-blue-200"
                                >
                                    Ver venta
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
