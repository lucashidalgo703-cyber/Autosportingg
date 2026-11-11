import React from 'react';
import Link from 'next/link';
import { Eye, FileText, ReceiptText, Trash2, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import SaleStatusBadge from './SaleStatusBadge';
import CrmTable from '../ui/CrmTable';
import { useAuth } from '../../../context/AuthContext';
import { hasPermission, PERMISSIONS } from '../../../utils/adminPermissions';
import { formatSaleDate } from '../../../utils/saleCalendarDate';
import { getSaleBuyer } from '../../../utils/salePresentation';
import { SALE_PAYMENT_LABELS } from '../../../utils/salesWorkbench';
export default function SalesTable({ sales, onViewDetail, onDeleteSale, onDocument, sort = 'date', direction = 'desc', onSort }) {
 const {user}=useAuth(); const canClient=hasPermission(user,PERMISSIONS.CLIENTES_READ); const canStock=hasPermission(user,PERMISSIONS.STOCK_READ); const canDelete=hasPermission(user,PERMISSIONS.VENTAS_CANCEL);
 const columns=[
  {key:'date',label:'Fecha',render:s=><span className="whitespace-nowrap text-xs">{formatSaleDate(s)}</span>},
  {key:'vehicle',label:'Vehículo',render:s=><div className="min-w-[145px]">{canStock&&s.vehicleId?._id?<Link className="text-sm font-medium text-crm-fg no-underline hover:text-crm-red" href={`/admin/stock/${s.vehicleId._id}`}>{s.vehicleId.brand} {s.vehicleId.name}</Link>:<span className="text-sm">{s.vehicleId?`${s.vehicleId.brand||''} ${s.vehicleId.name||''}`:'Sin asignar'}</span>}<span className="mt-1 block text-[11px] text-crm-fg-muted">{s.vehicleId?.plateOrVin||'Sin patente'}{s.tradeIns?.length?' · Con permuta':''}</span></div>},
  {key:'buyer',label:'Comprador',render:s=>{const buyer=getSaleBuyer(s);return <div className="min-w-[130px]">{canClient&&buyer.clientId?<Link className="text-sm text-crm-fg no-underline hover:text-crm-red" href={`/admin/clientes/${buyer.clientId}`}>{buyer.name||'Sin comprador'}</Link>:<span className="text-sm">{buyer.name||'Sin comprador'}</span>}<span className="mt-1 block text-[11px] text-crm-fg-muted">{buyer.phone||'Sin teléfono'}</span></div>;}},
  {key:'seller',label:'Vendedor',render:s=><span className="text-xs">{s.salesperson||'Sin asignar'}</span>},
  {key:'price',label:'Precio',align:'right',render:s=><div><span className="whitespace-nowrap text-sm font-semibold">{typeof s.salePrice === 'number' && Number.isFinite(s.salePrice) && s.salePrice >= 0 ? `${s.saleCurrency || 'Moneda sin informar'} ${s.salePrice.toLocaleString('es-AR')}` : 'Importe sin validar'}</span><span className="mt-1 block text-[10px] capitalize text-crm-fg-muted">{SALE_PAYMENT_LABELS[s.paymentMethod]||'Sin informar'}</span></div>},
  {key:'commission',label:'Comisión',render:s=><div className="min-w-[100px]"><span className="text-xs">{s.commissionSettings?.sellerPct??1}% vendedor</span><span className={`mt-1 block text-[10px] ${s.commissionSettlement?.settled?'text-emerald-300':'text-amber-300'}`}>{s.commissionSettlement?.settled?'Liquidada':'Sin liquidar'}</span></div>},
  {key:'status',label:'Status',render:s=><SaleStatusBadge status={s.cancellationKind==='caida'?'caida':s.status} historicalOnly={s.historicalOnly}/>},
  {key:'actions',label:'Acciones',render:s=><div className="flex gap-1">{[[Eye,'Ver detalle',()=>onViewDetail(s)],[FileText,'Boleto PDF',()=>onDocument?.(s,'boleto')],[ReceiptText,'Recibo PDF',()=>onDocument?.(s,'recibo')]].map(([Icon,label,action])=><button key={label} type="button" title={label} aria-label={label} onClick={e=>{e.stopPropagation();action();}} className="rounded-md border border-crm-border p-2 text-crm-fg-muted hover:bg-crm-surface-raised"><Icon size={14}/></button>)}{canDelete&&s.status==='cancelada'&&<button type="button" aria-label="Eliminar venta cancelada" title="Eliminar venta cancelada" onClick={e=>{e.stopPropagation();onDeleteSale?.(s);}} className="rounded-md border border-red-500/20 p-2 text-red-300"><Trash2 size={14}/></button>}</div>}
 ];
 const sortable = new Set(['date','vehicle','buyer','seller','price','status']);
 const headers = columns.map(column => sortable.has(column.key) && onSort ? { ...column, label: <button type="button" className="inline-flex items-center gap-1.5 bg-transparent text-inherit" onClick={() => onSort(column.key)} title={column.key === 'price' ? 'Ordenar por importe dentro de ARS y USD; no convierte monedas' : `Ordenar por ${column.label}`} aria-label={`Ordenar por ${column.label}`} aria-pressed={sort === column.key}>{column.label}{sort === column.key ? direction === 'asc' ? <ArrowUp size={12}/> : <ArrowDown size={12}/> : <ArrowUpDown size={12}/>}</button> } : column);
 return <CrmTable columns={headers} data={sales} emptyMessage="No hay ventas con estos filtros." onRowClick={onViewDetail}/>;
}
