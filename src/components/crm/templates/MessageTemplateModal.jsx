import { useState, useEffect } from 'react';
import { X, Save, AlertCircle } from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';

const AVAILABLE_VARIABLES = [
    '{{nombre_cliente}}',
    '{{telefono_cliente}}',
    '{{email_cliente}}',
    '{{vehiculo}}',
    '{{marca}}',
    '{{modelo}}',
    '{{version}}',
    '{{anio}}',
    '{{precio}}',
    '{{dominio}}',
    '{{vendedor}}',
    '{{agencia}}',
    '{{fecha_entrega}}',
    '{{monto_cuota}}',
    '{{fecha_vencimiento}}',
    '{{link_google_reviews}}'
];

export default function MessageTemplateModal({ isOpen, onClose, template, onSaved }) {
    const { token } = useAuth();
    const isEdit = !!template;
    
    const [formData, setFormData] = useState({
        name: '',
        category: 'lead',
        channel: 'whatsapp',
        subject: '',
        body: '',
        isActive: true
    });
    
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        if (template) {
            setFormData({
                name: template.name || '',
                category: template.category || 'lead',
                channel: template.channel || 'whatsapp',
                subject: template.subject || '',
                body: template.body || '',
                isActive: template.isActive !== false
            });
        }
    }, [template]);

    if (!isOpen) return null;

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));
    };

    const handleInsertVariable = (variable) => {
        setFormData(prev => ({
            ...prev,
            body: prev.body + ' ' + variable
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        
        if (!formData.name.trim() || !formData.body.trim()) {
            return setError('El nombre y el cuerpo del mensaje son obligatorios.');
        }

        try {
            setSaving(true);
            
            // Extraer variables usadas
            const usedVars = AVAILABLE_VARIABLES.filter(v => formData.body.includes(v)).map(v => v.replace(/[{}]/g, ''));

            const payload = {
                ...formData,
                variables: usedVars
            };

            const url = isEdit ? `/api/admin/message-templates/${template._id}` : '/api/admin/message-templates';
            const method = isEdit ? 'PATCH' : 'POST';

            const res = await fetch(url, {
                method,
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            });

            if (res.ok) {
                onSaved();
                onClose();
            } else {
                const data = await res.json();
                setError(data.message || 'Error al guardar la plantilla');
            }
        } catch (err) {
            setError('Error de conexión al servidor');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-3xl flex flex-col max-h-[90vh]">
                <div className="flex items-center justify-between p-6 border-b border-gray-100">
                    <h2 className="text-xl font-semibold text-gray-900">
                        {isEdit ? 'Editar Plantilla' : 'Nueva Plantilla'}
                    </h2>
                    <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="p-6 overflow-y-auto flex-1 custom-scrollbar">
                    {error && (
                        <div className="mb-6 flex items-center gap-2 p-4 text-red-700 bg-red-50 border border-red-200 rounded-xl">
                            <AlertCircle className="w-5 h-5 shrink-0" />
                            <p className="text-sm">{error}</p>
                        </div>
                    )}

                    <form id="templateForm" onSubmit={handleSubmit} className="space-y-6">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Nombre de la Plantilla</label>
                                <input
                                    type="text"
                                    name="name"
                                    required
                                    value={formData.name}
                                    onChange={handleChange}
                                    placeholder="Ej: Seguimiento Lead Frío"
                                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-black focus:border-transparent outline-none transition-all"
                                />
                            </div>
                            
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Categoría Operativa</label>
                                <select
                                    name="category"
                                    value={formData.category}
                                    onChange={handleChange}
                                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-black outline-none transition-all"
                                >
                                    <option value="lead">Lead</option>
                                    <option value="client">Cliente</option>
                                    <option value="sale">Venta</option>
                                    <option value="reservation">Reserva</option>
                                    <option value="installment">Cuota</option>
                                    <option value="post_sale">Postventa</option>
                                    <option value="documentation">Documentación</option>
                                    <option value="delivery">Entrega</option>
                                    <option value="review">Reseñas</option>
                                    <option value="internal">Interno</option>
                                    <option value="other">Otro</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Canal por Defecto</label>
                                <select
                                    name="channel"
                                    value={formData.channel}
                                    onChange={handleChange}
                                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-black outline-none transition-all"
                                >
                                    <option value="whatsapp">WhatsApp</option>
                                    <option value="email">Email</option>
                                    <option value="phone_script">Guion Telefónico</option>
                                    <option value="internal_note">Nota Interna</option>
                                    <option value="other">Otro</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Asunto (solo Email)</label>
                                <input
                                    type="text"
                                    name="subject"
                                    value={formData.subject}
                                    onChange={handleChange}
                                    placeholder="Asunto del correo"
                                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-black outline-none transition-all"
                                />
                            </div>
                        </div>

                        <div>
                            <div className="flex items-center justify-between mb-2">
                                <label className="block text-sm font-medium text-gray-700">Mensaje</label>
                            </div>
                            
                            <div className="border border-gray-200 rounded-xl overflow-hidden focus-within:border-black focus-within:ring-1 focus-within:ring-black transition-all">
                                <textarea
                                    name="body"
                                    required
                                    rows={6}
                                    value={formData.body}
                                    onChange={handleChange}
                                    placeholder="Escribe el mensaje de la plantilla aquí..."
                                    className="w-full p-4 border-0 focus:ring-0 resize-y min-h-[150px] outline-none"
                                />
                                <div className="bg-gray-50 border-t border-gray-200 p-3">
                                    <p className="text-xs font-medium text-gray-500 mb-2 uppercase tracking-wider">Variables Disponibles (clic para insertar)</p>
                                    <div className="flex flex-wrap gap-2">
                                        {AVAILABLE_VARIABLES.map(variable => (
                                            <button
                                                key={variable}
                                                type="button"
                                                onClick={() => handleInsertVariable(variable)}
                                                className="px-2 py-1 text-[11px] font-mono text-blue-700 bg-blue-50 hover:bg-blue-100 rounded border border-blue-100 transition-colors"
                                            >
                                                {variable}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center gap-3">
                            <input
                                type="checkbox"
                                id="isActive"
                                name="isActive"
                                checked={formData.isActive}
                                onChange={handleChange}
                                className="w-4 h-4 text-black border-gray-300 rounded focus:ring-black"
                            />
                            <label htmlFor="isActive" className="text-sm text-gray-700 cursor-pointer">
                                Plantilla Activa (visible para el equipo)
                            </label>
                        </div>
                    </form>
                </div>

                <div className="p-6 border-t border-gray-100 bg-gray-50 rounded-b-2xl flex justify-end gap-3 shrink-0">
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={saving}
                        className="px-5 py-2.5 text-sm font-medium text-gray-700 hover:text-gray-900 bg-white border border-gray-200 hover:bg-gray-50 rounded-xl transition-all disabled:opacity-50"
                    >
                        Cancelar
                    </button>
                    <button
                        type="submit"
                        form="templateForm"
                        disabled={saving}
                        className="flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-white bg-black hover:bg-gray-900 rounded-xl transition-all disabled:opacity-50"
                    >
                        <Save className="w-4 h-4" />
                        {saving ? 'Guardando...' : 'Guardar Plantilla'}
                    </button>
                </div>
            </div>
        </div>
    );
}
