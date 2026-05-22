"use client";
import React, { useState, useEffect } from 'react';
import { Calendar as CalendarIcon, CheckCircle2, Circle, Clock, Plus, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';

const Calendario = () => {
    const [tasks, setTasks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [newTaskTitle, setNewTaskTitle] = useState('');
    const [newTaskDate, setNewTaskDate] = useState('');

    const fetchTasks = async () => {
        try {
            const API_URL = process.env.NEXT_PUBLIC_API_URL;
            const baseUrl = process.env.NODE_ENV === 'production' ? '' : (API_URL || 'http://localhost:3001');
            const res = await fetch(`${baseUrl}/api/tasks`, {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
            });
            if (res.ok) {
                const data = await res.json();
                setTasks(data);
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

    const addTask = async (e) => {
        e.preventDefault();
        if (!newTaskTitle || !newTaskDate) return;

        try {
            const API_URL = process.env.NEXT_PUBLIC_API_URL;
            const baseUrl = process.env.NODE_ENV === 'production' ? '' : (API_URL || 'http://localhost:3001');
            const res = await fetch(`${baseUrl}/api/tasks`, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}` 
                },
                body: JSON.stringify({ title: newTaskTitle, dueDate: newTaskDate })
            });

            if (res.ok) {
                toast.success('Tarea agregada');
                setNewTaskTitle('');
                setNewTaskDate('');
                fetchTasks();
            }
        } catch (error) {
            toast.error('Error agregando tarea');
        }
    };

    const toggleTask = async (task) => {
        const newStatus = task.status === 'Pendiente' ? 'Completada' : 'Pendiente';
        try {
            const API_URL = process.env.NEXT_PUBLIC_API_URL;
            const baseUrl = process.env.NODE_ENV === 'production' ? '' : (API_URL || 'http://localhost:3001');
            const res = await fetch(`${baseUrl}/api/tasks/${task._id}`, {
                method: 'PUT',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}` 
                },
                body: JSON.stringify({ status: newStatus })
            });
            if (res.ok) fetchTasks();
        } catch (error) {
            toast.error('Error actualizando tarea');
        }
    };

    const deleteTask = async (id) => {
        try {
            const API_URL = process.env.NEXT_PUBLIC_API_URL;
            const baseUrl = process.env.NODE_ENV === 'production' ? '' : (API_URL || 'http://localhost:3001');
            const res = await fetch(`${baseUrl}/api/tasks/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
            });
            if (res.ok) {
                toast.success('Tarea eliminada');
                fetchTasks();
            }
        } catch (error) {
            toast.error('Error eliminando tarea');
        }
    };

    const isOverdue = (dateString) => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const taskDate = new Date(dateString);
        taskDate.setHours(0, 0, 0, 0);
        return taskDate < today;
    };

    const isToday = (dateString) => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const taskDate = new Date(dateString);
        taskDate.setHours(0, 0, 0, 0);
        return taskDate.getTime() === today.getTime();
    };

    if (loading) return <div className="text-center py-20 text-zinc-500 font-medium">Cargando agenda...</div>;

    const pendingTasks = tasks.filter(t => t.status === 'Pendiente');
    const completedTasks = tasks.filter(t => t.status === 'Completada');

    return (
        <div className="max-w-3xl mx-auto space-y-8 animate-in fade-in duration-300">
            <div>
                <h2 className="text-3xl font-bold tracking-tight text-white mb-2 flex items-center gap-3">
                    Agenda <span className="text-red-600 font-extrabold">Ejecutiva</span>
                </h2>
                <p className="text-zinc-500 text-sm font-medium tracking-wide">Gestión de tareas y recordatorios pendientes.</p>
            </div>

            {/* Nuevo Recordatorio */}
            <form onSubmit={addTask} className="bg-zinc-950 p-6 rounded-2xl border border-zinc-800/80 shadow-xl flex flex-col md:flex-row gap-4">
                <input 
                    type="text" 
                    placeholder="Ej: Llamar a Juan por el saldo de la F-150..." 
                    value={newTaskTitle}
                    onChange={(e) => setNewTaskTitle(e.target.value)}
                    className="flex-1 bg-zinc-900 border border-zinc-800 text-white px-4 py-3 rounded-xl focus:outline-none focus:border-red-500 transition-all placeholder:text-zinc-600"
                    required
                />
                <input 
                    type="date" 
                    value={newTaskDate}
                    onChange={(e) => setNewTaskDate(e.target.value)}
                    className="bg-zinc-900 border border-zinc-800 text-zinc-300 px-4 py-3 rounded-xl focus:outline-none focus:border-red-500 transition-all font-mono text-sm"
                    required
                />
                <button type="submit" className="bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-xl font-bold transition-all flex items-center justify-center gap-2 shadow-lg">
                    <Plus size={18} /> Agendar
                </button>
            </form>

            {/* Lista de Tareas Pendientes */}
            <div className="space-y-4">
                <h3 className="text-sm font-bold text-zinc-500 uppercase tracking-widest flex items-center gap-2">
                    <Clock size={16} /> Pendientes ({pendingTasks.length})
                </h3>
                
                {pendingTasks.length === 0 ? (
                    <div className="text-center py-12 bg-zinc-950 rounded-2xl border border-dashed border-zinc-800/80">
                        <CalendarIcon size={32} className="mx-auto text-zinc-700 mb-3" />
                        <p className="text-zinc-500 font-medium">No hay tareas pendientes. ¡Todo al día!</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 gap-3">
                        {pendingTasks.map(task => {
                            const overdue = isOverdue(task.dueDate);
                            const today = isToday(task.dueDate);
                            
                            return (
                                <div key={task._id} className={`flex items-center gap-4 p-4 rounded-xl border transition-all ${overdue ? 'bg-red-950/20 border-red-900/50 hover:border-red-500/50' : 'bg-zinc-950 border-zinc-800/80 hover:border-zinc-700'}`}>
                                    <button onClick={() => toggleTask(task)} className="text-zinc-500 hover:text-green-500 transition-colors">
                                        <Circle size={24} />
                                    </button>
                                    
                                    <div className="flex-1">
                                        <p className="text-white font-medium text-sm lg:text-base">{task.title}</p>
                                        <p className={`text-xs mt-1 font-bold tracking-widest uppercase ${overdue ? 'text-red-500' : today ? 'text-yellow-500' : 'text-zinc-500'}`}>
                                            {overdue ? 'Vencida el ' : today ? 'Hoy ' : 'Para el '} 
                                            {new Date(task.dueDate).toLocaleDateString('es-AR')}
                                        </p>
                                    </div>
                                    
                                    <button onClick={() => deleteTask(task._id)} className="text-zinc-600 hover:text-red-500 p-2 transition-colors">
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Lista de Tareas Completadas */}
            {completedTasks.length > 0 && (
                <div className="space-y-4 pt-8 border-t border-zinc-900">
                    <h3 className="text-sm font-bold text-zinc-500 uppercase tracking-widest flex items-center gap-2">
                        <CheckCircle2 size={16} /> Completadas ({completedTasks.length})
                    </h3>
                    
                    <div className="grid grid-cols-1 gap-3 opacity-60">
                        {completedTasks.map(task => (
                            <div key={task._id} className="flex items-center gap-4 p-4 rounded-xl bg-zinc-950 border border-zinc-800/50">
                                <button onClick={() => toggleTask(task)} className="text-green-500 transition-colors">
                                    <CheckCircle2 size={24} />
                                </button>
                                
                                <div className="flex-1 line-through text-zinc-500">
                                    <p className="font-medium text-sm lg:text-base">{task.title}</p>
                                    <p className="text-xs mt-1 font-bold tracking-widest uppercase">
                                        Completado
                                    </p>
                                </div>
                                
                                <button onClick={() => deleteTask(task._id)} className="text-zinc-600 hover:text-red-500 p-2 transition-colors">
                                    <Trash2 size={16} />
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

export default Calendario;
