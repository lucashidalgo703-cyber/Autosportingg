import React from 'react';
import Link from 'next/link';
import { ArrowRight, CarFront, Search, ShoppingCart, User, Trash2 } from 'lucide-react';
import SaleStatusBadge from './SaleStatusBadge';
import CrmButton from '../ui/CrmButton';
import CrmTable from '../ui/CrmTable';
import { useAuth } from '../../../context/AuthContext';
import { hasPermission, PERMISSIONS } from '../../../utils/adminPermissions';

export default function SalesTable({ sales, onViewDetail, onDeleteSale }) {
    const { user } = useAuth();
    const canCancelSales = hasPermission(user, PERMISSIONS.VENTAS_CANCEL);

    const columns = [
        {
            label: 'Fecha',
            key: 'date',
            render: (sale) => (
                <>
                    <span className="block text-sm text-crm-fg">{new Date(sale.saleDate || sale.createdAt).toLocaleDateString()}</span>
                    <span className="text-[10px] uppercase text-crm-fg-muted">{sale.paymentMethod || 'contado'}</span>
                </>
            )
        },
        {
            label: 'Cliente / Cotizacion',
            key: 'client',
            render: (sale) => {
                const name = sale.clientId?.fullName || sale.clientId?.firstName || sale.leadId?.name || 'Sin Nombre';
                const phone = sale.clientId?.phone || sale.leadId?.phone || '';
                const hasClientLink = sale.clientId?._id || sale.leadId?._id;
                const clientHref = sale.clientId?._id ? `/admin/clientes/${sale.clientId._id}` : (sale.leadId?._id ? `/admin/leads/${sale.leadId._id}` : '#');

                return (
                    <div className="flex flex-col">
                        {hasClientLink ? (
                            <Link href={clientHref} className="flex max-w-[190px] items-center gap-2 truncate text-sm font-bold text-crm-fg no-underline transition-colors hover:text-crm-red">
                                <User size={13} className="shrink-0 text-crm-fg-muted" />
                                {name}
                            </Link>
                        ) : (
                            <span className="flex max-w-[190px] items-center gap-2 truncate text-sm font-bold text-crm-fg">
                                <User size={13} className="shrink-0 text-crm-fg-muted" />
                                {name}
                            </span>
                        )}
                        {phone && <span className="mt-0.5 text-xs text-crm-fg-muted">{phone}</span>}
                    </div>
                );
            }
        },
        {
            label: 'Vehiculo',
            key: 'vehicle',
            render: (sale) => {
                const vehicleName = sale.vehicleId ? `${sale.vehicleId.brand} ${sale.vehicleId.name}` : 'Vehiculo no asignado';
                const vehicleVin = sale.vehicleId?.plateOrVin || '';
                const vehicleHref = sale.vehicleId?._id ? `/admin/stock/${sale.vehicleId._id}` : '#';

                return (
                    <div className="flex flex-col">
                        {sale.vehicleId ? (
                            <Link href={vehicleHref} className="flex max-w-[190px] items-center gap-2 truncate text-sm font-bold text-crm-fg no-underline transition-colors hover:text-crm-red">
                                <CarFront size={14} className="shrink-0 text-crm-red" />
                                {vehicleName}
                            </Link>
                        ) : (
                            <span className="text-sm font-bold text-crm-fg-muted">N/A</span>
                        )}
                        {vehicleVin && (
                            <span className="mt-1 w-max rounded border border-crm-border bg-crm-bg px-1.5 py-0.5 font-mono text-[10px] uppercase text-crm-fg-muted">
                                {vehicleVin}
                            </span>
                        )}
                    </div>
                );
            }
        },
        {
            label: 'Estado',
            key: 'status',
            render: (sale) => <SaleStatusBadge status={sale.status} />
        },
        {
            label: 'Cobranza',
            key: 'collection',
            align: 'right',
            render: (sale) => (
                <div className="flex flex-col items-end gap-1">
                    <span className={`text-sm font-bold ${sale.status === 'cancelada' ? 'text-crm-fg-muted line-through' : 'text-emerald-300'}`}>
                        {sale.saleCurrency} {(sale.salePrice || 0).toLocaleString('es-AR')}
                    </span>
                    {sale.finance && (
                        <div className="flex flex-col items-end">
                            {sale.finance.collectionStatus === 'sin_cobro' && <span className="text-[10px] font-bold uppercase text-red-300">Sin Cobro</span>}
                            {sale.finance.collectionStatus === 'parcial' && <span className="text-[10px] font-bold uppercase text-amber-300">Saldo: {sale.saleCurrency} {sale.finance.pendingBalance.toLocaleString('es-AR')}</span>}
                            {sale.finance.collectionStatus === 'cobrada' && <span className="text-[10px] font-bold uppercase text-emerald-300">Cobrada</span>}
                            {sale.finance.collectionStatus === 'sobrecobrada' && <span className="text-[10px] font-bold uppercase text-purple-300">Sobrecobrada</span>}
                        </div>
                    )}
                </div>
            )
        },
        {
            label: 'Doc.',
            key: 'documentation',
            render: (sale) => (
                <div className="flex flex-col gap-1">
                    <span className={`w-max rounded border px-2 py-0.5 text-[10px] font-bold uppercase ${
                        sale.documentationStatus === 'completo' ? 'border-blue-500/20 bg-blue-500/10 text-blue-300' :
                        sale.documentationStatus === 'parcial' ? 'border-amber-500/20 bg-amber-500/10 text-amber-300' :
                        'border-crm-border bg-crm-bg text-crm-fg-muted'
                    }`}>
                        Doc: {sale.documentationStatus || 'pendiente'}
                    </span>
                    <span className={`w-max rounded border px-2 py-0.5 text-[10px] font-bold uppercase ${
                        sale.deliveryStatus === 'entregado' ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-300' :
                        sale.deliveryStatus === 'listo_para_entregar' ? 'border-blue-500/20 bg-blue-500/10 text-blue-300' :
                        sale.deliveryStatus === 'preparando' ? 'border-amber-500/20 bg-amber-500/10 text-amber-300' :
                        'border-crm-border bg-crm-bg text-crm-fg-muted'
                    }`}>
                        Ent: {(sale.deliveryStatus || 'pendiente').replace(/_/g, ' ')}
                    </span>
                </div>
            )
        },
        {
            label: 'Logistica',
            key: 'logistics',
            render: (sale) => {
                const estimatedDate = sale.estimatedDeliveryDate ? new Date(sale.estimatedDeliveryDate) : null;
                const isDelayed = estimatedDate && estimatedDate < new Date(new Date().setHours(0, 0, 0, 0));
                return (
                    <div className="flex flex-col">
                        {sale.deliveryStatus === 'entregado' ? (
                            <>
                                <span className="text-[10px] font-bold uppercase text-emerald-300">Entregado</span>
                                <span className="text-xs text-crm-fg">{sale.actualDeliveryDate ? new Date(sale.actualDeliveryDate).toLocaleDateString() : 'N/A'}</span>
                            </>
                        ) : estimatedDate ? (
                            <>
                                <span className="text-[10px] font-bold uppercase text-crm-fg-muted">Estimada</span>
                                <span className={`text-xs font-bold ${isDelayed ? 'text-red-300' : 'text-crm-fg'}`}>
                                    {estimatedDate.toLocaleDateString()}
                                </span>
                                {isDelayed && <span className="mt-0.5 text-[10px] font-bold uppercase text-red-300">Demorada</span>}
                            </>
                        ) : (
                            <span className="text-xs text-crm-fg-muted">Sin programar</span>
                        )}
                    </div>
                );
            }
        },
        {
            label: 'Acciones',
            key: 'actions',
            align: 'center',
            render: (sale) => (
                <div className="flex items-center justify-center gap-2">
                    <CrmButton
                        variant="secondary"
                        size="sm"
                        onClick={() => onViewDetail(sale)}
                        className="h-8 gap-1 px-3 text-xs"
                        title="Ver detalle de venta"
                    >
                        <Search size={14} />
                        Detalle
                        <ArrowRight size={12} />
                    </CrmButton>
                    {sale.status === 'cancelada' && onDeleteSale && canCancelSales && (
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                onDeleteSale(sale);
                            }}
                            className="flex h-8 w-8 items-center justify-center rounded-lg border border-crm-red/20 bg-crm-red/10 text-crm-red transition-colors hover:bg-crm-red/20"
                            title="Eliminar venta cancelada"
                        >
                            <Trash2 size={14} />
                        </button>
                    )}
                </div>
            )
        }
    ];

    return (
        <CrmTable 
            columns={columns} 
            data={sales} 
            emptyIcon={ShoppingCart}
            emptyTitle="Sin resultados"
            emptyMessage="Todavía no hay ventas cargadas. Podés crear una desde el botón de arriba."
            minWidth="min-w-[1120px]"
        />
    );
}
