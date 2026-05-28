"use client";
import React, { useState, useEffect, useMemo } from 'react';
import { Star, ShieldAlert } from 'lucide-react';
import { useAdminSales } from '../../../hooks/useAdminSales';
import { useAdminCrmTasks } from '../../../hooks/useAdminCrmTasks';
import PostventaSummaryCards from '../../../components/crm/postventa/PostventaSummaryCards';
import PostventaFilters from '../../../components/crm/postventa/PostventaFilters';
import PostventaTable from '../../../components/crm/postventa/PostventaTable';
import PostventaMobileCards from '../../../components/crm/postventa/PostventaMobileCards';
import CrmTaskModal from '../../../components/crm/agenda/CrmTaskModal';

export default function PostventaPage() {
    const { fetchSales, updateSale, loading: loadingSales, error: errorSales } = useAdminSales();
    const { fetchTasks, createTask, tasks } = useAdminCrmTasks();
    const [allSales, setAllSales] = useState([]);
    const [allTasks, setAllTasks] = useState([]);
    
    // Modal State
    const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
    const [selectedSaleForTask, setSelectedSaleForTask] = useState(null);

    const [filters, setFilters] = useState({
        search: '',
        postSaleStatus: 'todos',
        resena: 'todas',
        obsequio: 'todos',
        satisfaccion: 'todas',
        tarea: 'todas'
    });

    const loadData = async () => {
        const salesData = await fetchSales();
        // Solo ventas entregadas o pendientes de seguimiento
        const validSales = (salesData || []).filter(s => 
            s.status === 'entregada' || s.postSaleStatus !== 'pendiente'
        );
        setAllSales(validSales);
        const tasksData = await fetchTasks();
        setAllTasks(tasksData || []);
    };

    useEffect(() => {
        loadData();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const getSaleTaskStatus = (saleId) => {
        return allTasks.filter(t => 
            String(t.saleId?._id || t.saleId) === String(saleId) && 
            t.status === 'pendiente' &&
            t.type === 'postventa'
        );
    };

    const filteredSales = useMemo(() => {
        return allSales.filter(sale => {
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

            if (filters.postSaleStatus !== 'todos') {
                const currentStatus = sale.postSaleStatus || 'pendiente';
                if (currentStatus !== filters.postSaleStatus) return false;
            }

            if (filters.resena !== 'todas') {
                const isSolicitada = sale.postSaleChecklist?.resenaSolicitada;
                const isRecibida = sale.postSaleChecklist?.resenaRecibida;
                if (filters.resena === 'recibida' && !isRecibida) return false;
                if (filters.resena === 'solicitada' && (!isSolicitada || isRecibida)) return false;
                if (filters.resena === 'no solicitada' && isSolicitada) return false;
            }

            if (filters.obsequio !== 'todos') {
                const obsequio = sale.postSaleChecklist?.obsequioEntregado;
                if (filters.obsequio === 'entregado' && !obsequio) return false;
                if (filters.obsequio === 'pendiente' && obsequio) return false;
            }

            if (filters.satisfaccion !== 'todas') {
                const rating = sale.satisfactionRating || 0;
                if (filters.satisfaccion === 'sin calificar' && rating > 0) return false;
                if (filters.satisfaccion === '1 a 3' && (rating === 0 || rating > 3)) return false;
                if (filters.satisfaccion === '4 a 5' && rating < 4) return false;
            }

            if (filters.tarea !== 'todas') {
                const pendingTasks = getSaleTaskStatus(sale._id);
                if (filters.tarea === 'con tarea pendiente' && pendingTasks.length === 0) return false;
                if (filters.tarea === 'sin tarea' && pendingTasks.length > 0) return false;
                // 'tarea vencida' simplificado
                if (filters.tarea === 'tarea vencida') {
                    const today = new Date();
                    today.setHours(0,0,0,0);
                    const hasOverdue = pendingTasks.some(t => {
                        const d = new Date(t.dueDate);
                        d.setHours(0,0,0,0);
                        return d < today;
                    });
                    if (!hasOverdue) return false;
                }
            }

            return true;
        });
    }, [allSales, filters, allTasks]);

    const handleCreateTask = (sale) => {
        setSelectedSaleForTask(sale);
        setIsTaskModalOpen(true);
    };

    const handleSaveTask = async (taskData) => {
        try {
            await createTask(taskData);
            alert('Tarea agendada exitosamente');
            setIsTaskModalOpen(false);
            const tasksData = await fetchTasks();
            setAllTasks(tasksData || []);
        } catch (err) {
            console.error(err);
            if (err.message?.includes('enum') || err.message?.includes('validation failed')) {
                alert('No se pudo crear la tarea. Revisá el tipo u origen.');
            } else {
                alert('Error al crear la tarea: ' + err.message);
            }
        }
    };

    const handleUpdateChecklist = async (sale, field, value) => {
        try {
            const currentChecklist = sale.postSaleChecklist || {};
            await updateSale(sale._id, {
                postSaleChecklist: {
                    ...currentChecklist,
                    [field]: value
                }
            });
            await loadData();
        } catch (err) {
            alert('Error al actualizar checklist: ' + err.message);
        }
    };

    const handleUpdateStatus = async (sale, status) => {
        try {
            await updateSale(sale._id, {
                postSaleStatus: status
            });
            await loadData();
        } catch (err) {
            alert('Error al actualizar estado: ' + err.message);
        }
    };

    return (
        <div className="max-w-7xl mx-auto flex flex-col h-full min-h-[85vh] pb-12">
            <div className="flex justify-between items-center mb-6">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-pink-500/10 flex items-center justify-center border border-pink-500/20">
                        <Star size={20} className="text-pink-500" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-white tracking-tight">Postventa y Fidelización</h1>
                        <p className="text-sm text-neutral-400 mt-0.5">Seguimiento de satisfacción, reseñas e incidencias</p>
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
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-pink-500"></div>
                </div>
            ) : (
                <>
                    <PostventaSummaryCards sales={allSales} getSaleTaskStatus={getSaleTaskStatus} />
                    <PostventaFilters filters={filters} setFilters={setFilters} />
                    
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="text-lg font-bold text-white">
                            Operaciones Entregadas <span className="text-neutral-500 font-normal">({filteredSales.length})</span>
                        </h2>
                    </div>

                    <PostventaTable 
                        sales={filteredSales} 
                        getSaleTaskStatus={getSaleTaskStatus}
                        onCreateTask={handleCreateTask}
                        onUpdateChecklist={handleUpdateChecklist}
                        onUpdateStatus={handleUpdateStatus}
                    />
                    
                    <PostventaMobileCards 
                        sales={filteredSales} 
                        getSaleTaskStatus={getSaleTaskStatus}
                        onCreateTask={handleCreateTask}
                        onUpdateChecklist={handleUpdateChecklist}
                        onUpdateStatus={handleUpdateStatus}
                    />
                </>
            )}

            {selectedSaleForTask && (
                <CrmTaskModal 
                    isOpen={isTaskModalOpen}
                    onClose={() => setIsTaskModalOpen(false)}
                    onSave={handleSaveTask}
                    defaultData={{
                        source: 'postventa',
                        type: 'postventa',
                        title: 'Seguimiento postventa',
                        saleId: selectedSaleForTask._id,
                        ...(selectedSaleForTask.clientId && { clientId: selectedSaleForTask.clientId._id || selectedSaleForTask.clientId }),
                        ...(selectedSaleForTask.vehicleId && { vehicleId: selectedSaleForTask.vehicleId._id || selectedSaleForTask.vehicleId })
                    }}
                />
            )}
        </div>
    );
}
