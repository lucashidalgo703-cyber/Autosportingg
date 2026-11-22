'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '../../../context/AuthContext';
import { useAcademyProgress } from './AcademyProgressProvider';
import { ROLE_TRACKS } from '../../../lib/academy/catalog';
import { ROLE_MODULES, MODULE_STATUS } from '../../../lib/academy/roleModules';
import { ROLE_SIMULATIONS } from '../../../lib/academy/roleSimulations';

// Colaboradores ficticios simulados para demostración en Comodoro Rivadavia
const INITIAL_TEAM_MEMBERS = [
    {
        id: 'usr-01',
        name: 'Lucas Hidalgo',
        email: 'lucas.ventas@autosporting.com.ar',
        role: 'ventas',
        roleLabel: 'Vendedor',
        assignedTrack: 'ventas',
        completedModules: ['comun-trabajo', 'ventas-consulta-presentacion'],
        simulationsPassed: 2,
        weakAreas: ['ventas-negociacion-objeciones'],
        lastActive: '2026-11-21T18:30:00Z'
    },
    {
        id: 'usr-02',
        name: 'Carla Benítez',
        email: 'carla.gestoria@autosporting.com.ar',
        role: 'gestoria_contabilidad',
        roleLabel: 'Gestoría',
        assignedTrack: 'gestoria',
        completedModules: ['comun-trabajo', 'gestoria-lectura-expediente', 'gestoria-control-faltantes'],
        simulationsPassed: 1,
        weakAreas: ['gestoria-transferencias-coordinacion'],
        lastActive: '2026-11-20T16:45:00Z'
    },
    {
        id: 'usr-03',
        name: 'Esteban Morales',
        email: 'esteban.admin@autosporting.com.ar',
        role: 'administrativo',
        roleLabel: 'Administración',
        assignedTrack: 'administracion',
        completedModules: ['comun-trabajo', 'admin-preparacion-validacion'],
        simulationsPassed: 1,
        weakAreas: ['admin-cobros-comprobantes'],
        lastActive: '2026-11-21T11:15:00Z'
    }
];

export default function AcademyGestion() {
    const { user } = useAuth();
    const { progress, setAssignedTrack, recommendActivity } = useAcademyProgress();

    const isSupervisor = user?.role === 'owner' || user?.role === 'admin';

    const [teamMembers, setTeamMembers] = useState(INITIAL_TEAM_MEMBERS);
    const [selectedMember, setSelectedMember] = useState(INITIAL_TEAM_MEMBERS[0]);
    const [recommendationSent, setRecommendationSent] = useState('');
    const [selectedModuleToRecommend, setSelectedModuleToRecommend] = useState(ROLE_MODULES[1].id);

    // Si no es supervisor, mostrar pantalla de acceso restringido
    if (!isSupervisor) {
        return (
            <div className="rounded-2xl border border-zinc-800 bg-[#0e0e12] p-12 text-center space-y-4">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-red-600/10 border border-red-500/30 text-red-500 text-xl font-bold">
                    🔒
                </div>
                <h2 className="text-lg font-bold text-white uppercase tracking-wider">
                    Acceso Exclusivo a Supervisión Formativa
                </h2>
                <p className="text-xs text-zinc-400 max-w-md mx-auto leading-relaxed">
                    Esta sección está reservada para el Propietario y la Dirección de AutoSporting para la asignación de recorridos y el seguimiento formativo del equipo.
                </p>
                <div className="pt-2">
                    <Link
                        href="/admin/academy"
                        className="rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-2 text-xs font-bold text-zinc-300 hover:text-white"
                    >
                        ← Volver a Mi Capacitación
                    </Link>
                </div>
            </div>
        );
    }

    const handleChangeTrack = (memberId, newTrackId) => {
        setTeamMembers(prev => prev.map(m => m.id === memberId ? { ...m, assignedTrack: newTrackId } : m));
        if (selectedMember?.id === memberId) {
            setSelectedMember(prev => ({ ...prev, assignedTrack: newTrackId }));
        }
        setAssignedTrack(newTrackId);
    };

    const handleSendRecommendation = (e) => {
        e.preventDefault();
        const mod = ROLE_MODULES.find(m => m.id === selectedModuleToRecommend);
        if (!mod) return;

        recommendActivity({
            memberId: selectedMember.id,
            moduleId: mod.id,
            title: mod.title,
            reason: `Recomendado por la Dirección para reforzar el rol de ${selectedMember.roleLabel}.`
        });

        setRecommendationSent(`Recomendación enviada con éxito a ${selectedMember.name}: ${mod.code} - ${mod.title}`);
        setTimeout(() => setRecommendationSent(''), 4000);
    };

    const sharedReflections = progress?.sharedErrorReflections || [];

    return (
        <div className="space-y-6">
            {/* Cabecera de gestión */}
            <div className="rounded-2xl border border-red-500/30 bg-gradient-to-br from-red-950/20 via-[#0e0e12] to-zinc-950 p-6 shadow-xl">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                        <div className="flex items-center gap-2 mb-2">
                            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-red-600/10 border border-red-600/30 text-red-500 font-bold text-sm">
                                👑
                            </span>
                            <span className="text-xs font-bold uppercase tracking-wider text-crm-red">
                                Gestión de Capacitación · Panel de Supervisión
                            </span>
                        </div>
                        <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                            Asignación de Recorridos y Supervisión Formativa
                        </h2>
                        <p className="mt-1 text-xs sm:text-sm text-zinc-400 max-w-2xl">
                            Administrá los recorridos asignados a cada integrante, supervisá su avance pedagógico y revisá el estado de validación de los procedimientos.
                        </p>
                    </div>

                    <div className="rounded-xl border border-zinc-800 bg-zinc-950/80 px-4 py-3 text-right">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 block">
                            Equipo Activo
                        </span>
                        <span className="text-lg font-bold font-mono text-white">
                            {teamMembers.length} Colaboradores
                        </span>
                    </div>
                </div>

                {/* Advertencia obligatoria: La capacitación no concede permisos operativos */}
                <div className="mt-4 pt-3 border-t border-zinc-800/80 text-xs text-amber-400 flex items-center gap-2 font-medium">
                    <span>⚠️</span>
                    <span>
                        <strong>Regla de Aislamiento Operativo:</strong> Asignar o completar capacitaciones NO otorga permisos operativos en el CRM ni abre módulos restringidos (como Finanzas o Stock Completo).
                    </span>
                </div>
            </div>

            {/* Tabla de asignación de recorridos y supervisión */}
            <div className="rounded-2xl border border-zinc-800 bg-[#0e0e12] p-6 shadow-xl space-y-5">
                <div className="flex items-center justify-between">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-white">
                        Colaboradores y Recorridos Asignados
                    </h3>
                    <span className="text-xs text-zinc-500">
                        Hacé click sobre un colaborador para gestionar su capacitación
                    </span>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                        <thead>
                            <tr className="border-b border-zinc-800 text-[10px] font-bold uppercase tracking-wider text-zinc-500">
                                <th className="py-3 px-3">Colaborador</th>
                                <th className="py-3 px-3">Rol Operativo</th>
                                <th className="py-3 px-3">Recorrido Asignado</th>
                                <th className="py-3 px-3 text-center">Avance</th>
                                <th className="py-3 px-3 text-center">Simulaciones</th>
                                <th className="py-3 px-3">Última Actividad</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-800/60">
                            {teamMembers.map((m) => {
                                const track = ROLE_TRACKS[m.assignedTrack] || ROLE_TRACKS.comun;
                                const percent = Math.round((m.completedModules.length / track.moduleIds.length) * 100);
                                const isSelected = selectedMember?.id === m.id;

                                return (
                                    <tr
                                        key={m.id}
                                        onClick={() => setSelectedMember(m)}
                                        className={`transition-colors cursor-pointer ${
                                            isSelected ? 'bg-zinc-800/40 text-white' : 'hover:bg-zinc-900/40 text-zinc-300'
                                        }`}
                                    >
                                        <td className="py-3.5 px-3">
                                            <div className="font-bold text-white">{m.name}</div>
                                            <div className="text-[11px] text-zinc-500">{m.email}</div>
                                        </td>
                                        <td className="py-3.5 px-3">
                                            <span className="rounded-md border border-zinc-800 bg-zinc-900 px-2 py-0.5 text-[10px] font-bold uppercase text-zinc-400">
                                                {m.roleLabel}
                                            </span>
                                        </td>
                                        <td className="py-3.5 px-3">
                                            <select
                                                value={m.assignedTrack}
                                                onChange={(e) => { e.stopPropagation(); handleChangeTrack(m.id, e.target.value); }}
                                                className="rounded-lg border border-zinc-700 bg-zinc-950 px-2.5 py-1 text-xs text-white focus:outline-none cursor-pointer"
                                            >
                                                <option value="ventas">Recorrido Vendedores (5 mod)</option>
                                                <option value="gestoria">Recorrido Gestoría (4 mod)</option>
                                                <option value="administracion">Recorrido Administración (4 mod)</option>
                                                <option value="comun">Recorrido Común (1 mod)</option>
                                            </select>
                                        </td>
                                        <td className="py-3.5 px-3 text-center font-mono font-bold text-zinc-200">
                                            <div className="flex items-center justify-center gap-2">
                                                <span>{percent}%</span>
                                                <div className="w-16 h-1.5 rounded-full bg-zinc-800 overflow-hidden hidden sm:block">
                                                    <div className="h-full bg-red-600" style={{ width: `${percent}%` }} />
                                                </div>
                                            </div>
                                        </td>
                                        <td className="py-3.5 px-3 text-center font-mono text-emerald-400 font-bold">
                                            {m.simulationsPassed} aprobadas
                                        </td>
                                        <td className="py-3.5 px-3 text-[11px] text-zinc-500">
                                            {new Date(m.lastActive).toLocaleDateString('es-AR')}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Detalle de gestión y recomendación para el colaborador seleccionado */}
            {selectedMember && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Recomendación de práctica o módulo adicional */}
                    <div className="rounded-2xl border border-zinc-800 bg-[#0e0e12] p-6 shadow-xl space-y-4">
                        <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
                            <h4 className="text-xs font-bold uppercase tracking-wider text-white">
                                Recomendar Capacitación a {selectedMember.name}
                            </h4>
                            <span className="text-[10px] text-zinc-500 font-mono">
                                {selectedMember.email}
                            </span>
                        </div>

                        {recommendationSent && (
                            <div className="rounded-xl border border-emerald-500/30 bg-emerald-950/20 p-3 text-xs text-emerald-300 font-medium">
                                ✓ {recommendationSent}
                            </div>
                        )}

                        <form onSubmit={handleSendRecommendation} className="space-y-3">
                            <div>
                                <label className="block text-[11px] font-bold text-zinc-400 uppercase mb-1">
                                    Módulo o práctica sugerida:
                                </label>
                                <select
                                    value={selectedModuleToRecommend}
                                    onChange={(e) => setSelectedModuleToRecommend(e.target.value)}
                                    className="w-full rounded-xl border border-zinc-800 bg-zinc-950 p-2.5 text-xs text-white focus:border-red-500 focus:outline-none cursor-pointer"
                                >
                                    {ROLE_MODULES.map(m => (
                                        <option key={m.id} value={m.id}>
                                            {m.code} - {m.title} ({m.roleLabel})
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <button
                                type="submit"
                                className="w-full rounded-xl bg-red-600 hover:bg-red-500 py-2.5 text-xs font-bold uppercase tracking-wider text-white shadow-md transition-all cursor-pointer"
                            >
                                Asignar Recomendación Formativa
                            </button>
                        </form>
                    </div>

                    {/* Entradas Compartidas Voluntariamente en "Aprender del Error" */}
                    <div className="rounded-2xl border border-zinc-800 bg-[#0e0e12] p-6 shadow-xl space-y-4">
                        <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
                            <h4 className="text-xs font-bold uppercase tracking-wider text-white flex items-center gap-2">
                                <span>📤</span> Reflexiones Compartidas Voluntariamente
                            </h4>
                            <span className="text-[10px] text-zinc-500">
                                {sharedReflections.length} entradas
                            </span>
                        </div>

                        {sharedReflections.length === 0 ? (
                            <div className="rounded-xl border border-zinc-800/80 bg-zinc-950/40 p-6 text-center text-xs text-zinc-500">
                                Ningún colaborador ha compartido reflexiones con la Dirección en esta sesión.
                                <br />
                                Las notas individuales permanecen protegidas por la regla de privacidad.
                            </div>
                        ) : (
                            <div className="space-y-2.5 max-h-[220px] overflow-y-auto pr-1 custom-scrollbar">
                                {sharedReflections.map((ref, idx) => (
                                    <div key={idx} className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-3 space-y-1 text-xs">
                                        <div className="flex items-center justify-between">
                                            <span className="font-bold text-white">{ref.titulo}</span>
                                            <span className="text-[10px] text-zinc-500 font-mono">
                                                {ref.fechaCompartido ? new Date(ref.fechaCompartido).toLocaleDateString('es-AR') : 'Reciente'}
                                            </span>
                                        </div>
                                        <p className="text-zinc-400 text-[11px] line-clamp-2">
                                            Plan de mejora: {ref.planMejora}
                                        </p>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Control de Versiones y Validación Profesional de Contenidos */}
            <div className="rounded-2xl border border-zinc-800 bg-[#0e0e12] p-6 shadow-xl space-y-4">
                <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
                    <div>
                        <h3 className="text-xs font-bold uppercase tracking-wider text-white">
                            Versiones de Contenidos y Estado de Validación Profesional
                        </h3>
                        <p className="text-xs text-zinc-400">
                            Auditoría de procedimientos: contenidos vigentes, fuentes oficiales y necesidad de validación profesional externa.
                        </p>
                    </div>
                    <span className="text-[11px] font-mono text-zinc-500">
                        11 Módulos Activos
                    </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {ROLE_MODULES.map((m) => (
                        <div key={m.id} className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-3.5 space-y-2 text-xs">
                            <div className="flex items-center justify-between">
                                <span className="font-mono font-bold text-zinc-300">
                                    {m.code} v{m.version}
                                </span>
                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                    m.status === MODULE_STATUS.PUBLISHED
                                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                                        : 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                                }`}>
                                    {m.status}
                                </span>
                            </div>

                            <h5 className="font-bold text-white line-clamp-1">
                                {m.title}
                            </h5>

                            <div className="text-[11px] text-zinc-400 leading-relaxed">
                                {m.validationNote}
                            </div>

                            <div className="pt-2 border-t border-zinc-800/80 flex items-center justify-between text-[10px] text-zinc-500">
                                <span>Revisión: {m.reviewDate}</span>
                                {m.requiresProfessionalValidation && (
                                    <span className="text-amber-400 font-semibold">
                                        Requiere firma externa
                                    </span>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
