"use client";
import React, { useState, useEffect } from 'react';
import { AlertTriangle, Clock, CalendarIcon } from 'lucide-react';
import toast from 'react-hot-toast';

const Alertas = () => {
    const [overdueTasks, setOverdueTasks] = useState([]);
    const [loading, setLoading] = useState(true);

    const fetchTasks = async () => {
        try {
            const API_URL = process.env.NEXT_PUBLIC_API_URL;
            const baseUrl = process.env.NODE_ENV === 'production' ? '' : (API_URL || 'http://localhost:3001');
            const res = await fetch(`${baseUrl}/api/tasks`, {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
            });
            if (res.ok) {
                const data = await res.json();
                
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                
                const overdue = data.filter(t => {
                    if (t.status === 'Completada') return false;
                    const taskDate = new Date(t.dueDate);
                    taskDate.setHours(0, 0, 0, 0);
                    return taskDate < today;
                });
                
                setOverdueTasks(overdue);
            }
        } catch (error) {
            console.error('Error fetching tasks:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchTasks();
    }, []);

    const toggleTask = async (task) => {
        try {
            const API_URL = process.env.NEXT_PUBLIC_API_URL;
            const baseUrl = process.env.NODE_ENV === 'production' ? '' : (API_URL || 'http://localhost:3001');
            const res = await fetch(`${baseUrl}/api/tasks/${task._id}`, {
                method: 'PUT',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}` 
                },
                body: JSON.stringify({ status: 'Completada' })
            });
            if (res.ok) {
                toast.success('Tarea marcada como completada');
                fetchTasks(); // Reloads, removing from Alertas since it's now completed
            }
        } catch (error) {
            toast.error('Error actualizando tarea');
        }
    };

    if (loading) return <div className="text-center py-20 text-zinc-500 font-medium">Revisando sistema de alertas...</div>;

    return (
        <div className="max-w-3xl mx-auto space-y-8 animate-in fade-in duration-300">
            <div>
                <h2 className="text-3xl font-bold tracking-tight text-white mb-2 flex items-center gap-3">
                    Alertas <span className="text-red-600 font-extrabold">del Sistema</span>
                </h2>
                <p className="text-zinc-500 text-sm font-medium tracking-wide">Tareas atrasadas y notificaciones importantes.</p>
            </div>

            <div className="space-y-4">
                {overdueTasks.length === 0 ? (
                    <div className="text-center py-12 bg-green-500/5 rounded-2xl border border-dashed border-green-500/20">
                        <AlertTriangle size={32} className="mx-auto text-green-500/50 mb-3" />
                        <p className="text-green-500/80 font-medium">No hay alertas. Todo el trabajo está al día.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 gap-3">
                        <div className="bg-red-500/10 border border-red-500/30 p-4 rounded-xl flex gap-3 mb-2">
                            <AlertTriangle className="text-red-500 shrink-0" />
                            <p className="text-sm text-red-200">Tienes {overdueTasks.length} tarea(s) atrasada(s). Complétalas para limpiar el panel de alertas.</p>
                        </div>
                        
                        {overdueTasks.map(task => (
                            <div key={task._id} className="flex items-center justify-between gap-4 p-5 rounded-xl border bg-zinc-950 border-red-900/50 hover:border-red-500/50 transition-all">
                                <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className="w-2 h-2 rounded-full bg-red-600 shadow-[0_0_8px_rgba(220,38,38,0.8)] animate-pulse"></span>
                                        <p className="text-white font-bold text-base">{task.title}</p>
                                    </div>
                                    <p className="text-xs font-bold tracking-widest uppercase text-red-500 flex items-center gap-1">
                                        <Clock size={12} /> Vencida el {new Date(task.dueDate).toLocaleDateString('es-AR')}
                                    </p>
                                </div>
                                
                                <button 
                                    onClick={() => toggleTask(task)} 
                                    className="bg-zinc-900 hover:bg-green-900/30 text-zinc-400 hover:text-green-500 border border-zinc-800 hover:border-green-900/50 px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-colors"
                                >
                                    Marcar Lista
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default Alertas;
