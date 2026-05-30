"use client";
import React, { useState, useEffect } from 'react';
import { useAuth } from '../../../context/AuthContext';
import { useRouter } from 'next/navigation';
import { Flag, Plus, AlertTriangle, TrendingUp, CheckCircle, Clock } from 'lucide-react';
import TeamGoalModal from '../../../components/crm/team/TeamGoalModal';

export default function GoalsDashboardPage() {
    const { user } = useAuth();
    const router = useRouter();

    const [loading, setLoading] = useState(true);
    const [progressData, setProgressData] = useState([]);
    const [error, setError] = useState(null);
    const [modalConfig, setModalConfig] = useState({ isOpen: false, goal: null });

    const fetchGoalsProgress = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`/api/admin/team-goals/progress`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (!res.ok) {
                if (res.status === 403) throw new Error("Sin permisos para ver las metas.");
                throw new Error("Error cargando el progreso de metas.");
            }

            const data = await res.json();
            setProgressData(data);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (user) {
            fetchGoalsProgress();
        }
    }, [user]);

    if (!user) return null;

    if (error) {
        return (
            <div className="p-6">
                <div className="bg-red-900/20 text-red-400 p-4 rounded-lg border border-red-900/50 flex items-center gap-2">
                    <AlertTriangle size={20} /> {error}
                </div>
            </div>
        );
    }

    const activeGoals = progressData;
    const cumplidas = activeGoals.filter(g => g.status === 'cumplido');
    const atrasadas = activeGoals.filter(g => g.status === 'atrasado' || g.status === 'vencido');
    const promedio = activeGoals.length > 0 ? activeGoals.reduce((a,b) => a + b.overallPercent, 0) / activeGoals.length : 0;

    return (
        <div className="p-6 font-sans">
            <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
                <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-indigo-500/20 rounded-xl flex items-center justify-center text-indigo-400">
                        <Flag size={24} />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-white">Metas Operativas</h1>
                        <p className="text-sm text-gray-400">Objetivos y cumplimiento del equipo por período.</p>
                    </div>
                </div>

                <button 
                    onClick={() => setModalConfig({ isOpen: true, goal: null })}
                    className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
                >
                    <Plus size={18} /> Nueva Meta
                </button>
            </div>

            {loading ? (
                <div className="flex justify-center items-center h-64">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500"></div>
                </div>
            ) : (
                <>
                    {/* CARDS */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                        <div className="bg-[#161619] border border-[#33333A] rounded-xl p-5 flex flex-col justify-center">
                            <div className="flex items-center gap-2 text-indigo-400 mb-2">
                                <Flag size={16} /> <span className="text-xs font-bold uppercase">Metas Activas</span>
                            </div>
                            <div className="text-3xl text-white font-bold">{activeGoals.length}</div>
                        </div>
                        <div className="bg-[#161619] border border-[#33333A] rounded-xl p-5 flex flex-col justify-center">
                            <div className="flex items-center gap-2 text-green-500 mb-2">
                                <CheckCircle size={16} /> <span className="text-xs font-bold uppercase">Cumplidas</span>
                            </div>
                            <div className="text-3xl text-white font-bold">{cumplidas.length}</div>
                        </div>
                        <div className="bg-[#161619] border border-[#33333A] rounded-xl p-5 flex flex-col justify-center">
                            <div className="flex items-center gap-2 text-red-400 mb-2">
                                <Clock size={16} /> <span className="text-xs font-bold uppercase">Atrasadas / Venc.</span>
                            </div>
                            <div className="text-3xl text-white font-bold">{atrasadas.length}</div>
                        </div>
                        <div className="bg-[#161619] border border-[#33333A] rounded-xl p-5 flex flex-col justify-center">
                            <div className="flex items-center gap-2 text-blue-400 mb-2">
                                <TrendingUp size={16} /> <span className="text-xs font-bold uppercase">Promedio Equipo</span>
                            </div>
                            <div className="text-3xl text-white font-bold">{Math.round(promedio)}%</div>
                        </div>
                    </div>

                    <div className="bg-[#161619] border border-[#33333A] rounded-xl overflow-hidden">
                        <div className="p-5 border-b border-[#33333A] bg-[#24242B]">
                            <h2 className="font-bold text-white uppercase text-sm">Progreso Actual de Metas</h2>
                        </div>
                        
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse min-w-[900px]">
                                <thead>
                                    <tr className="border-b border-[#33333A] bg-[#1E1E24]">
                                        <th className="p-4 text-xs font-bold text-gray-400 uppercase">Usuario</th>
                                        <th className="p-4 text-xs font-bold text-gray-400 uppercase">Período</th>
                                        <th className="p-4 text-xs font-bold text-gray-400 uppercase min-w-[200px]">Progreso Global</th>
                                        <th className="p-4 text-xs font-bold text-gray-400 uppercase">Detalle Target</th>
                                        <th className="p-4 text-xs font-bold text-gray-400 uppercase">Estado</th>
                                        <th className="p-4 text-xs font-bold text-gray-400 uppercase text-right">Acción</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {activeGoals.length === 0 ? (
                                        <tr><td colSpan="6" className="p-4 text-center text-sm text-gray-500">No hay metas activas.</td></tr>
                                    ) : (
                                        activeGoals.map(goal => (
                                            <tr key={goal.goalId} className="border-b border-[#33333A] hover:bg-[#1E1E24] transition-colors">
                                                <td className="p-4">
                                                    <div className="text-sm font-bold text-white">{goal.userId?.name || 'Usuario eliminado'}</div>
                                                    <div className="text-xs text-gray-500 capitalize">{goal.userId?.role}</div>
                                                </td>
                                                <td className="p-4">
                                                    <div className="text-sm text-gray-300">{goal.periodLabel}</div>
                                                    <div className="text-xs text-gray-500">{new Date(goal.startDate).toLocaleDateString()} al {new Date(goal.endDate).toLocaleDateString()}</div>
                                                </td>
                                                <td className="p-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className="flex-1 bg-[#24242B] h-2.5 rounded-full overflow-hidden">
                                                            <div 
                                                                className={`h-full rounded-full ${goal.overallPercent >= 100 ? 'bg-green-500' : goal.overallPercent > 50 ? 'bg-indigo-500' : 'bg-yellow-500'}`} 
                                                                style={{ width: `${Math.min(goal.overallPercent, 100)}%` }}
                                                            ></div>
                                                        </div>
                                                        <div className="text-sm font-bold text-white w-10 text-right">{goal.overallPercent}%</div>
                                                    </div>
                                                </td>
                                                <td className="p-4">
                                                    <div className="flex flex-wrap gap-2">
                                                        {Object.entries(goal.progress).map(([key, p]) => (
                                                            <div key={key} className="bg-[#24242B] border border-[#33333A] px-2 py-1 rounded text-xs" title={`${p.real} de ${p.target}`}>
                                                                <span className="text-gray-400 mr-1">{key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}:</span>
                                                                <span className={p.real >= p.target ? 'text-green-400 font-bold' : 'text-white'}>{p.real}/{p.target}</span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </td>
                                                <td className="p-4">
                                                    <span className={`text-xs px-2 py-1 rounded font-bold uppercase whitespace-nowrap ${
                                                        goal.status === 'superado' ? 'bg-green-600/30 text-green-300' :
                                                        goal.status === 'cumplido' ? 'bg-green-500/20 text-green-400' :
                                                        goal.status === 'proximo_vencer' ? 'bg-orange-500/20 text-orange-400' :
                                                        goal.status === 'atrasado' ? 'bg-yellow-500/20 text-yellow-500' :
                                                        goal.status === 'vencido' ? 'bg-red-500/20 text-red-400' :
                                                        goal.status === 'sin_avance' ? 'bg-gray-500/20 text-gray-400' :
                                                        'bg-indigo-500/20 text-indigo-400'
                                                    }`}>
                                                        {goal.status.replace('_', ' ')}
                                                    </span>
                                                </td>
                                                <td className="p-4 text-right">
                                                    <button onClick={() => setModalConfig({ isOpen: true, goal })} className="text-xs bg-[#33333A] hover:bg-[#4A4A55] text-white px-3 py-1.5 rounded transition-colors">
                                                        Editar
                                                    </button>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </>
            )}

            <TeamGoalModal 
                isOpen={modalConfig.isOpen} 
                onClose={() => setModalConfig({ isOpen: false, goal: null })} 
                goal={modalConfig.goal}
                onSuccess={fetchGoalsProgress}
            />
        </div>
    );
}
