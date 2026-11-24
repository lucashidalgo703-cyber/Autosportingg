"use client";
import React from 'react';
import CrmPageHeader from '../../../components/crm/ui/CrmPageHeader';
import StockChecklistPanel from '../../../components/crm/stock/StockChecklistPanel';

export default function AdminEquipamientoPage() {
    return (
        <div className="w-full min-w-0 p-3 pb-20 sm:p-4 xl:p-5 2xl:p-6 crm-no-print">
            <div className="flex min-w-0 flex-col gap-6">
                <CrmPageHeader 
                    title="Equipamiento" 
                    subtitle="Control de unidades en stock físico y registro de equipamiento recibido: manual, duplicado de llaves, cricket, llave de rueda y service al día." 
                />
                <StockChecklistPanel />
            </div>
        </div>
    );
}
