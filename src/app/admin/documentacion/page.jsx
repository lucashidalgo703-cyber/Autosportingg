"use client";
import React, { useState, useEffect, useMemo } from 'react';
import { FileText, ShieldAlert } from 'lucide-react';
import { useAdminSales } from '../../../hooks/useAdminSales';
import { useAdminCrmTasks } from '../../../hooks/useAdminCrmTasks';
import DocSummaryCards from '../../../components/crm/documentacion/DocSummaryCards';
import DocFilters from '../../../components/crm/documentacion/DocFilters';
import DocTable from '../../../components/crm/documentacion/DocTable';
import DocMobileCards from '../../../components/crm/documentacion/DocMobileCards';
import CrmTaskModal from '../../../components/crm/agenda/CrmTaskModal';

export default function DocumentacionPage() {
    const { fetchSales, loading: loadingSales, error: errorSales } = useAdminSales();
    const { fetchTasks, createTask, tasks } = useAdminCrmTasks();
    const [allSales, setAllSales] = useState([]);
    const [allTasks, setAllTasks] = useState([]);
    
    // Modal State
    const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
    const [selectedSaleForTask, setSelectedSaleForTask] = useState(null);
    const [taskType, setTaskType] = useState('documentacion'); // 'documentacion' o 'entrega'

    const [filters, setFilters] = useState({
        search: '',
        documentationStatus: 'todas',
        deliveryStatus: 'todas',
        saleStatus: 'todas'
    });

    const loadData = async () => {
        const salesData = await fetchSales();
        setAllSales(salesData || []);
        const tasksData = await fetchTasks();
        setAllTasks(tasksData || []);
    };

    useEffect(() => {
        loadData();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Helper: calcular si tiene tarea pendiente
    const getSaleTaskStatus = (saleId) => {
        const saleTasks = allTasks.filter(t => 
            String(t.saleId?._id || t.saleId) === String(saleId) && 
            t.status === 'pendiente' &&
            (t.type === 'documentacion' || t.type === 'entrega')
        );
        return saleTasks;
    };

    const filteredSales = useMemo(() => {
        return allSales.filter(sale => {
            // 1. Search filter
            if (filters.search) {
                const searchLower = filters.search.toLowerCase();
                const clientName = (sale.clientId?.fullName || sale.clientId?.firstName || '').toLowerCase();
                const vehicleBrand = (sale.vehicleId?.brand || '').toLowerCase();
                const vehicleName = (sale.vehicleId?.name || '').toLowerCase();
                const vehicleVin = (sale.vehicleId?.plateOrVin || '').toLowerCase();

                const matchSearch = 
                    clientName.includes(searchLower) || 
                    vehicleBrand.includes(searchLower) || 
                    vehicleName.includes(searchLower) || 
                    vehicleVin.includes(searchLower) ||
                    sale._id.toLowerCase().includes(searchLower);

                if (!matchSearch) return false;
            }

            // 2. Doc Status
            if (filters.documentationStatus !== 'todas') {
                const currentStatus = sale.documentationStatus || 'pendiente';
                if (currentStatus !== filters.documentationStatus) return false;
            }

            // 3. Delivery Status
            if (filters.deliveryStatus !== 'todas') {
                const currentStatus = sale.deliveryStatus || 'pendiente';
                if (currentStatus !== filters.deliveryStatus) return false;
            }

            // 4. Sale Status
            if (filters.saleStatus !== 'todas') {
                if (sale.status !== filters.saleStatus) return false;
            }

            return true;
        });
    }, [allSales, filters]);

    const handleCreateTask = (sale, type) => {
        setSelectedSaleForTask(sale);
        setTaskType(type);
        setIsTaskModalOpen(true);
    };

    const handleSaveTask = async (taskData) => {
        try {
            await createTask(taskData);
            alert('Tarea agendada exitosamente');
            setIsTaskModalOpen(false);
            // Reload tasks
            const tasksData = await fetchTasks();
            setAllTasks(tasksData || []);
        } catch (err) {
            alert('Error al crear la tarea: ' + err.message);
        }
    };

    return (
        <div className="max-w-7xl mx-auto flex flex-col h-full min-h-[85vh] pb-12">
            <div className="flex justify-between items-center mb-6">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-orange-500/10 flex items-center justify-center border border-orange-500/20">
                        <FileText size={20} className="text-orange-500" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-white tracking-tight">Documentación y Entregas</h1>
                        <p className="text-sm text-neutral-400 mt-0.5">Control operativo de expedientes y vehículos a entregar</p>
                    </div>
                </div>
            </div>

            {errorSales && (
                <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-xl mb-6 flex items-center gap-3">
                    <ShieldAlert size={20} />
                    {errorSales}
                </div>
            )}

            {loadingSales && allSales.length === 0 ? (
                <div className="flex-1 flex justify-center items-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
                </div>
            ) : (
                <>
                    <DocSummaryCards sales={allSales} getSaleTaskStatus={getSaleTaskStatus} />
                    <DocFilters filters={filters} setFilters={setFilters} />
                    
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="text-lg font-bold text-white">
                            Operaciones <span className="text-neutral-500 font-normal">({filteredSales.length})</span>
                        </h2>
                    </div>

                    <DocTable 
                        sales={filteredSales} 
                        getSaleTaskStatus={getSaleTaskStatus}
                        onCreateTask={handleCreateTask}
                    />
                    
                    <DocMobileCards 
                        sales={filteredSales} 
                        getSaleTaskStatus={getSaleTaskStatus}
                        onCreateTask={handleCreateTask}
                    />
                </>
            )}

            {selectedSaleForTask && (
                <CrmTaskModal 
                    isOpen={isTaskModalOpen}
                    onClose={() => setIsTaskModalOpen(false)}
                    onSave={handleSaveTask}
                    defaultData={{
                        source: 'documentacion',
                        type: taskType,
                        title: taskType === 'documentacion' ? 'Completar documentación' : 'Coordinar entrega',
                        saleId: selectedSaleForTask._id,
                        ...(selectedSaleForTask.clientId && { clientId: selectedSaleForTask.clientId._id || selectedSaleForTask.clientId }),
                        ...(selectedSaleForTask.vehicleId && { vehicleId: selectedSaleForTask.vehicleId._id || selectedSaleForTask.vehicleId })
                    }}
                />
            )}
        </div>
    );
}
