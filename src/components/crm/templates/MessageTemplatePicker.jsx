'use client';
import { useState, useEffect } from 'react';
import { MessageSquare, Copy, Check, ChevronDown } from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';

export default function MessageTemplatePicker({ category, entityData, onLogAction }) {
    const { token } = useAuth();
    const [templates, setTemplates] = useState([]);
    const [isOpen, setIsOpen] = useState(false);
    const [selectedTemplate, setSelectedTemplate] = useState(null);
    const [previewText, setPreviewText] = useState('');
    const [copied, setCopied] = useState(false);
    const [loading, setLoading] = useState(false);
    const [settings, setSettings] = useState(null);

    useEffect(() => {
        if (isOpen && templates.length === 0) {
            fetchTemplates();
        }
    }, [isOpen]);

    const fetchTemplates = async () => {
        try {
            setLoading(true);
            const [res, resSettings] = await Promise.all([
                fetch(`/api/admin/message-templates?category=${category}&activeOnly=true`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                }),
                fetch('/api/admin/settings', {
                    headers: { 'Authorization': `Bearer ${token}` }
                })
            ]);
            
            if (res.ok) {
                const data = await res.json();
                setTemplates(data);
            }
            if (resSettings.ok) {
                const dataSettings = await resSettings.json();
                setSettings(dataSettings);
            }
        } catch (error) {
            console.error('Error fetching templates:', error);
        } finally {
            setLoading(false);
        }
    };

    const resolveVariables = (body) => {
        if (!body) return '';
        let text = body;
        
        const replacements = {
            '{{nombre_cliente}}': entityData?.clientName || entityData?.name || '',
            '{{telefono_cliente}}': entityData?.clientPhone || entityData?.phone || '',
            '{{email_cliente}}': entityData?.clientEmail || entityData?.email || '',
            '{{vehiculo}}': entityData?.vehicleName || '',
            '{{marca}}': entityData?.vehicleBrand || '',
            '{{modelo}}': entityData?.vehicleModel || '',
            '{{version}}': entityData?.vehicleVersion || '',
            '{{anio}}': entityData?.vehicleYear || '',
            '{{precio}}': entityData?.vehiclePrice || '',
            '{{dominio}}': entityData?.vehicleDomain || '',
            '{{vendedor}}': entityData?.assignedToName || '',
            '{{agencia}}': settings?.agencyName || 'AutoSporting',
            '{{fecha_entrega}}': entityData?.deliveryDate || '',
            '{{monto_cuota}}': entityData?.installmentAmount || '',
            '{{fecha_vencimiento}}': entityData?.installmentDueDate || '',
            '{{link_google_reviews}}': settings?.googleReviewsUrl || 'https://g.page/r/autosporting/review'
        };

        for (const [key, value] of Object.entries(replacements)) {
            const regex = new RegExp(key, 'g');
            text = text.replace(regex, value || `[Falta ${key.replace(/[{}]/g, '')}]`);
        }
        return text;
    };

    const handleSelectTemplate = (template) => {
        setSelectedTemplate(template);
        setPreviewText(resolveVariables(template.body));
    };

    const handleCopy = async () => {
        try {
            if (navigator.clipboard && window.isSecureContext) {
                await navigator.clipboard.writeText(previewText);
            } else {
                // Fallback for older browsers
                let textArea = document.createElement("textarea");
                textArea.value = previewText;
                textArea.style.position = "fixed";
                textArea.style.left = "-999999px";
                textArea.style.top = "-999999px";
                document.body.appendChild(textArea);
                textArea.focus();
                textArea.select();
                document.execCommand('copy');
                textArea.remove();
            }
            
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
            
            if (onLogAction) {
                // Ofrecer registrar
                if (window.confirm(`¿Querés registrar esta acción en el Historial de Contacto?\n\nPlantilla: ${selectedTemplate.name}`)) {
                    onLogAction(selectedTemplate, previewText);
                }
            }
        } catch (err) {
            console.error('Failed to copy: ', err);
            alert('No se pudo copiar al portapapeles. Selecciona y copia manualmente.');
        }
    };

    return (
        <div className="relative">
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-black"
            >
                <MessageSquare className="w-4 h-4" />
                Usar Plantilla
                <ChevronDown className="w-4 h-4" />
            </button>

            {isOpen && (
                <div className="absolute right-0 z-10 mt-2 w-80 sm:w-96 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden">
                    {!selectedTemplate ? (
                        <div className="p-2 max-h-64 overflow-y-auto">
                            <div className="px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                Plantillas Disponibles
                            </div>
                            {loading ? (
                                <div className="p-4 text-sm text-center text-gray-500">Cargando...</div>
                            ) : templates.length === 0 ? (
                                <div className="p-4 text-sm text-center text-gray-500">No hay plantillas activas.</div>
                            ) : (
                                templates.map(t => (
                                    <button
                                        key={t._id}
                                        onClick={() => handleSelectTemplate(t)}
                                        className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-md transition-colors"
                                    >
                                        {t.name}
                                    </button>
                                ))
                            )}
                        </div>
                    ) : (
                        <div className="flex flex-col h-full max-h-[400px]">
                            <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between bg-gray-50">
                                <h4 className="text-sm font-medium text-gray-900 truncate pr-4">{selectedTemplate.name}</h4>
                                <button
                                    onClick={() => setSelectedTemplate(null)}
                                    className="text-xs text-blue-600 hover:text-blue-800 font-medium whitespace-nowrap"
                                >
                                    Cambiar
                                </button>
                            </div>
                            <div className="p-4 overflow-y-auto">
                                <textarea
                                    value={previewText}
                                    onChange={(e) => setPreviewText(e.target.value)}
                                    className="w-full h-32 p-3 text-sm text-gray-700 bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent outline-none resize-none"
                                />
                            </div>
                            <div className="p-4 pt-0">
                                <button
                                    onClick={handleCopy}
                                    className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-black text-white text-sm font-medium rounded-lg hover:bg-gray-900 transition-colors"
                                >
                                    {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                                    {copied ? '¡Copiado!' : 'Copiar Mensaje'}
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            )}
            
            {isOpen && (
                <div 
                    className="fixed inset-0 z-0" 
                    onClick={() => setIsOpen(false)}
                />
            )}
        </div>
    );
}
