'use client';
import { useState, useEffect } from 'react';
import { useAuth } from '../../../context/AuthContext';
import { Plus, Search, Filter, Edit, Trash2, CheckCircle, XCircle } from 'lucide-react';
import MessageTemplateModal from './MessageTemplateModal';

export default function MessageTemplateManager() {
    const { token, hasPermission, role } = useAuth();
    const [templates, setTemplates] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [categoryFilter, setCategoryFilter] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingTemplate, setEditingTemplate] = useState(null);

    const fetchTemplates = async () => {
        try {
            setLoading(true);
            const queryParams = new URLSearchParams();
            if (categoryFilter) queryParams.append('category', categoryFilter);
            if (searchTerm) queryParams.append('search', searchTerm);

            const res = await fetch(`/api/admin/message-templates?${queryParams.toString()}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setTemplates(data);
            }
        } catch (error) {
            console.error('Error fetching templates:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (token) fetchTemplates();
    }, [token, categoryFilter, searchTerm]);

    const handleToggleActive = async (template) => {
        if (!hasPermission('messageTemplates.write') && role !== 'owner') return;
        try {
            const res = await fetch(`/api/admin/message-templates/${template._id}`, {
                method: 'PATCH',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ isActive: !template.isActive })
            });
            if (res.ok) fetchTemplates();
        } catch (error) {
            console.error('Error toggling template:', error);
        }
    };

    const handleDelete = async (templateId) => {
        if (!confirm('¿Seguro que querés desactivar esta plantilla?')) return;
        try {
            const res = await fetch(`/api/admin/message-templates/${templateId}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) fetchTemplates();
        } catch (error) {
            console.error('Error deleting template:', error);
        }
    };

    const openCreateModal = () => {
        setEditingTemplate(null);
        setIsModalOpen(true);
    };

    const openEditModal = (template) => {
        setEditingTemplate(template);
        setIsModalOpen(true);
    };

    const initBaseTemplates = async () => {
        try {
            const res = await fetch('/api/admin/message-templates/init', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) fetchTemplates();
        } catch (error) {
            console.error('Error initializing templates:', error);
        }
    };

    const canWrite = ['owner', 'admin'].includes(role) || hasPermission('messageTemplates.write');
    const canDelete = ['owner', 'admin'].includes(role) || hasPermission('messageTemplates.delete');

    return (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="p-4 border-b border-gray-200 flex flex-col sm:flex-row justify-between items-center gap-4">
                <div className="flex gap-2 w-full sm:w-auto">
                    <div className="relative flex-1 sm:w-64">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Buscar plantillas..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent outline-none"
                        />
                    </div>
                    <select
                        value={categoryFilter}
                        onChange={(e) => setCategoryFilter(e.target.value)}
                        className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-black outline-none"
                    >
                        <option value="">Todas las categorías</option>
                        <option value="lead">Leads</option>
                        <option value="client">Clientes</option>
                        <option value="sale">Ventas</option>
                        <option value="reservation">Reservas</option>
                        <option value="installment">Cuotas</option>
                        <option value="post_sale">Postventa</option>
                        <option value="documentation">Documentación</option>
                    </select>
                </div>
                
                <div className="flex gap-2">
                    {templates.length === 0 && role === 'owner' && (
                        <button
                            onClick={initBaseTemplates}
                            className="px-4 py-2 bg-gray-100 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-200 transition-colors"
                        >
                            Inicializar Plantillas Base
                        </button>
                    )}
                    {canWrite && (
                        <button
                            onClick={openCreateModal}
                            className="flex items-center gap-2 px-4 py-2 bg-black text-white text-sm font-medium rounded-lg hover:bg-gray-800 transition-colors"
                        >
                            <Plus className="w-4 h-4" />
                            Nueva Plantilla
                        </button>
                    )}
                </div>
            </div>

            <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-gray-600">
                    <thead className="bg-gray-50/50 text-xs text-gray-500 uppercase font-medium">
                        <tr>
                            <th className="px-6 py-3">Nombre</th>
                            <th className="px-6 py-3">Categoría</th>
                            <th className="px-6 py-3">Canal</th>
                            <th className="px-6 py-3">Estado</th>
                            <th className="px-6 py-3 text-right">Acciones</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                        {loading ? (
                            <tr>
                                <td colSpan="5" className="px-6 py-8 text-center text-gray-500">
                                    Cargando plantillas...
                                </td>
                            </tr>
                        ) : templates.length === 0 ? (
                            <tr>
                                <td colSpan="5" className="px-6 py-8 text-center text-gray-500">
                                    No se encontraron plantillas.
                                </td>
                            </tr>
                        ) : (
                            templates.map((template) => (
                                <tr key={template._id} className="hover:bg-gray-50 transition-colors">
                                    <td className="px-6 py-4 font-medium text-gray-900">
                                        {template.name}
                                        {template.isSystem && <span className="ml-2 text-[10px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded">BASE</span>}
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className="capitalize">{template.category.replace('_', ' ')}</span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className="capitalize">{template.channel.replace('_', ' ')}</span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <button 
                                            onClick={() => handleToggleActive(template)}
                                            disabled={!canWrite}
                                            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
                                                template.isActive ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-600'
                                            } ${canWrite ? 'hover:bg-opacity-80' : 'cursor-default'}`}
                                        >
                                            {template.isActive ? (
                                                <><CheckCircle className="w-3 h-3" /> Activa</>
                                            ) : (
                                                <><XCircle className="w-3 h-3" /> Inactiva</>
                                            )}
                                        </button>
                                    </td>
                                    <td className="px-6 py-4 text-right flex items-center justify-end gap-2">
                                        {canWrite && (
                                            <button
                                                onClick={() => openEditModal(template)}
                                                className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                                title="Editar plantilla"
                                            >
                                                <Edit className="w-4 h-4" />
                                            </button>
                                        )}
                                        {canDelete && template.isActive && (
                                            <button
                                                onClick={() => handleDelete(template._id)}
                                                className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                                title="Desactivar plantilla"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        )}
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {isModalOpen && (
                <MessageTemplateModal
                    isOpen={isModalOpen}
                    onClose={() => setIsModalOpen(false)}
                    template={editingTemplate}
                    onSaved={fetchTemplates}
                />
            )}
        </div>
    );
}
