'use client';
import toast from 'react-hot-toast';
import { useState, useEffect } from 'react';
import { MessageSquare, Copy, Check, ChevronDown } from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';
import ConfirmModal from '../ui/ConfirmModal';

export default function MessageTemplatePicker({ category, entityData, onLogAction }) {
    const { token } = useAuth();
    const [templates, setTemplates] = useState([]);
    const [isOpen, setIsOpen] = useState(false);
    const [selectedTemplate, setSelectedTemplate] = useState(null);
    const [previewText, setPreviewText] = useState('');
    const [copied, setCopied] = useState(false);
    const [loading, setLoading] = useState(false);
    const [settings, setSettings] = useState(null);
    const [confirmLogModal, setConfirmLogModal] = useState({ isOpen: false, template: null, text: null });

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
                if (dataSettings.ok && dataSettings.settings) {
                    setSettings(dataSettings.settings);
                }
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
                setConfirmLogModal({ isOpen: true, template: selectedTemplate, text: previewText });
            }
        } catch (err) {
            console.error('Failed to copy: ', err);
            toast.error('No se pudo copiar al portapapeles. Selecciona y copia manualmente.');
        }
    };

    const confirmLogAction = () => {
        const { template, text } = confirmLogModal;
        if (template && text && onLogAction) {
            onLogAction(template, text);
        }
        setConfirmLogModal({ isOpen: false, template: null, text: null });
    };

    return (
        <div className="relative">
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-white bg-crm-red/10 border border-crm-red/20 rounded-lg hover:bg-crm-red/20 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-crm-red transition-colors"
            >
                <MessageSquare className="w-4 h-4" />
                Usar Plantilla
                <ChevronDown className="w-4 h-4" />
            </button>

            {isOpen && (
                <div className="absolute right-0 z-10 mt-2 w-80 sm:w-96 bg-crm-surface border border-crm-border rounded-xl shadow-2xl overflow-hidden shadow-black/50">
                    {!selectedTemplate ? (
                        <div className="p-2 max-h-64 overflow-y-auto custom-scrollbar">
                            <div className="px-3 py-2 text-xs font-semibold text-crm-fg-muted uppercase tracking-wider">
                                Plantillas Disponibles
                            </div>
                            {loading ? (
                                <div className="p-4 text-sm text-center text-crm-fg-muted">Cargando...</div>
                            ) : templates.length === 0 ? (
                                <div className="p-4 text-sm text-center text-crm-fg-muted">No hay plantillas activas.</div>
                            ) : (
                                templates.map(t => (
                                    <button
                                        key={t._id}
                                        onClick={() => handleSelectTemplate(t)}
                                        className="w-full text-left px-3 py-2 text-sm text-crm-fg-muted hover:bg-crm-surface-raised hover:text-crm-fg rounded-md transition-colors"
                                    >
                                        {t.name}
                                    </button>
                                ))
                            )}
                        </div>
                    ) : (
                        <div className="flex flex-col h-full max-h-[400px]">
                            <div className="px-4 py-3 border-b border-crm-border flex items-center justify-between bg-crm-surface">
                                <h4 className="text-sm font-medium text-white truncate pr-4">{selectedTemplate.name}</h4>
                                <button
                                    onClick={() => setSelectedTemplate(null)}
                                    className="text-xs text-crm-red hover:text-crm-red-hover font-medium whitespace-nowrap"
                                >
                                    Cambiar
                                </button>
                            </div>
                            <div className="p-4 overflow-y-auto custom-scrollbar">
                                <textarea
                                    value={previewText}
                                    onChange={(e) => setPreviewText(e.target.value)}
                                    className="w-full h-32 p-3 text-sm text-crm-fg bg-crm-bg border border-crm-border rounded-lg focus:ring-2 focus:ring-crm-red focus:border-transparent outline-none resize-none placeholder-crm-fg-muted"
                                />
                            </div>
                            <div className="p-4 pt-0">
                                <button
                                    onClick={handleCopy}
                                    className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-crm-red text-white text-sm font-medium rounded-lg hover:bg-crm-red-hover transition-colors"
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

            <ConfirmModal
                isOpen={confirmLogModal.isOpen}
                onClose={() => setConfirmLogModal({ isOpen: false, template: null, text: null })}
                onConfirm={confirmLogAction}
                title="Registrar en Historial"
                message={`¿Querés registrar esta acción en el Historial de Contacto?\n\nPlantilla: ${confirmLogModal.template?.name}`}
                confirmText="Registrar"
                isDestructive={false}
            />
        </div>
    );
}
