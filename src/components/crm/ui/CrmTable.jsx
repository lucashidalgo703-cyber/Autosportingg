import React from 'react';

export default function CrmTable({
    columns,
    data,
    loading = false,
    emptyIcon: EmptyIcon,
    emptyTitle = 'Sin resultados',
    emptyMessage = 'No se encontraron datos para mostrar.',
    onRowClick = null,
    minWidth = 'min-w-[1120px]'
}) {
    if (loading && (!data || data.length === 0)) {
        return (
            <div className="flex h-64 items-center justify-center rounded-xl border border-crm-border bg-crm-surface">
                <div className="flex flex-col items-center gap-3">
                    <div className="h-8 w-8 animate-spin rounded-full border-2 border-crm-border border-b-crm-red" />
                    <span className="text-sm text-crm-fg-muted">Cargando...</span>
                </div>
            </div>
        );
    }

    if (!data || data.length === 0) {
        return (
            <div className="hidden min-h-[210px] flex-col items-center justify-center rounded-xl border border-dashed border-crm-border bg-crm-surface p-12 text-center md:flex">
                {EmptyIcon && <EmptyIcon size={42} className="mb-4 text-crm-fg-subtle" />}
                <h3 className="m-0 text-base font-bold text-crm-fg">{emptyTitle}</h3>
                <p className="m-0 mt-2 max-w-md text-sm leading-6 text-crm-fg-muted">
                    {emptyMessage}
                </p>
            </div>
        );
    }

    return (
        <div className="hidden overflow-hidden rounded-xl border border-crm-border bg-crm-surface md:block">
            <div className="overflow-x-auto">
                <table className={`w-full ${minWidth} border-collapse text-left`}>
                    <thead className="bg-crm-bg text-[10px] uppercase tracking-[0.08em] text-crm-fg-muted">
                        <tr>
                            {columns.map((col, index) => (
                                <th 
                                    key={col.key || index} 
                                    className={`px-4 py-3 font-bold ${col.headerClassName || ''}`}
                                    style={{ textAlign: col.align || 'left', width: col.width }}
                                >
                                    {col.label}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-crm-border">
                        {data.map((row, rowIndex) => (
                            <tr 
                                key={row.id || row._id || rowIndex} 
                                className={`h-[78px] text-sm text-crm-fg transition-colors hover:bg-crm-surface-raised/70 ${onRowClick ? 'cursor-pointer' : ''}`}
                                onClick={() => onRowClick && onRowClick(row)}
                            >
                                {columns.map((col, colIndex) => (
                                    <td 
                                        key={`${rowIndex}-${col.key || colIndex}`} 
                                        className={`px-4 py-3 align-middle ${col.cellClassName || ''}`}
                                        style={{ textAlign: col.align || 'left' }}
                                    >
                                        {col.render ? col.render(row, rowIndex) : row[col.key]}
                                    </td>
                                ))}

                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
