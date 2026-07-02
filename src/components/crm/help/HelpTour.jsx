"use client";
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../../context/AuthContext';
import { X, ChevronRight, ChevronLeft, Map } from 'lucide-react';

const TOUR_CONTENT = {
    'admin': [
        { title: "Bienvenido al CRM", body: "Como Administrador tienes acceso completo al sistema. Empecemos un recorrido rápido." },
        { title: "Módulo de Finanzas", body: "Aquí controlarás el flujo de caja, las autorizaciones y la rentabilidad.", route: "/admin/finanzas" },
        { title: "Configuración y Seguridad", body: "Configura reglas de negocio, usuarios, y revisa la papelera de reciclaje.", route: "/admin/configuracion" }
    ],
    'owner': [
        { title: "Bienvenido Owner", body: "Tienes el control total de tu agencia. Este tour te mostrará lo básico." },
        { title: "Módulo de Finanzas", body: "Control de caja, retiros y reportes de rentabilidad.", route: "/admin/finanzas" },
        { title: "Configuración y Seguridad", body: "Administra los roles, permisos y visualización de tu equipo.", route: "/admin/configuracion" }
    ],
    'ventas': [
        { title: "Bienvenido al Equipo de Ventas", body: "Tu objetivo es cerrar negocios. Este tour te mostrará tus herramientas principales." },
        { title: "Leads y Clientes", body: "Gestiona tus oportunidades entrantes y mantén la agenda al día.", route: "/admin/leads" },
        { title: "Ventas y Comisiones", body: "Carga tus operaciones y revisa tus comisiones generadas en tiempo real.", route: "/admin/mis-ventas" }
    ],
    'administrativo': [
        { title: "Bienvenido", body: "Como administrativo serás el pilar del orden de la agencia." },
        { title: "Liquidaciones y Cuotas", body: "Gestiona pagos de clientes y liquida operaciones a los dueños.", route: "/admin/liquidaciones" },
        { title: "Expedientes y Gestoría", body: "Sigue el avance del papeleo de cada venta.", route: "/admin/expedientes" }
    ],
    'gestoria': [
        { title: "Bienvenido a Gestoría", body: "El control del papeleo está en tus manos." },
        { title: "Trámites", body: "Utiliza el tablero Kanban para avanzar con las transferencias y faltantes.", route: "/admin/gestoria" }
    ],
    'recepcion': [
        { title: "Bienvenido a Recepción", body: "Eres la primera cara de la agencia." },
        { title: "Reclamos y Sugerencias", body: "Gestiona el ingreso de tickets y deriva problemas a los encargados.", route: "/admin/reclamos" },
        { title: "Teléfonos Útiles", body: "Encuentra rápido contactos de emergencia y grúas.", route: "/admin/telefonos-utiles" }
    ],
    'taller': [
        { title: "Bienvenido al Taller", body: "Manejo de reparaciones." },
        { title: "Órdenes de Trabajo", body: "Controla los servicios internos de la agencia y los servicios a clientes.", route: "/admin/taller" }
    ]
};

export default function HelpTour() {
    const { user } = useAuth();
    const router = useRouter();
    const [isVisible, setIsVisible] = useState(false);
    const [currentStep, setCurrentStep] = useState(0);

    const userRole = user?.role || 'ventas';
    const tourData = TOUR_CONTENT[userRole] || TOUR_CONTENT['ventas'];

    useEffect(() => {
        if (user?.id) {
            const hasSeen = localStorage.getItem(`autosporting_tour_seen_${user.id}`);
            if (!hasSeen) {
                // Pequeño delay para no abrumar en el login
                const timer = setTimeout(() => setIsVisible(true), 1500);
                return () => clearTimeout(timer);
            }
        }
    }, [user?.id]);

    const handleClose = () => {
        if (user?.id) {
            localStorage.setItem(`autosporting_tour_seen_${user.id}`, 'true');
        }
        setIsVisible(false);
    };

    const nextStep = () => {
        if (currentStep < tourData.length - 1) {
            const nextIdx = currentStep + 1;
            setCurrentStep(nextIdx);
            if (tourData[nextIdx].route) {
                router.push(tourData[nextIdx].route);
            }
        } else {
            handleClose();
        }
    };

    const prevStep = () => {
        if (currentStep > 0) {
            const prevIdx = currentStep - 1;
            setCurrentStep(prevIdx);
            if (tourData[prevIdx].route) {
                router.push(tourData[prevIdx].route);
            }
        }
    };

    if (!isVisible || !user) return null;

    const step = tourData[currentStep];

    return (
        <div className="fixed bottom-6 right-6 z-50 w-80 rounded-xl bg-crm-surface border border-crm-border shadow-2xl overflow-hidden animate-in fade-in slide-in-from-bottom-4">
            <div className="bg-crm-red p-4 flex items-center justify-between">
                <div className="flex items-center gap-2 text-white">
                    <Map size={20} />
                    <span className="font-bold text-sm">Tour: {userRole.toUpperCase()}</span>
                </div>
                <button onClick={handleClose} className="text-white/80 hover:text-white transition-colors">
                    <X size={18} />
                </button>
            </div>
            
            <div className="p-5">
                <h3 className="text-base font-bold text-crm-fg mb-2">{step.title}</h3>
                <p className="text-sm text-crm-fg-muted leading-relaxed">
                    {step.body}
                </p>
                
                <div className="mt-6 flex items-center justify-between">
                    <div className="flex gap-1">
                        {tourData.map((_, idx) => (
                            <div 
                                key={idx} 
                                className={`h-1.5 w-1.5 rounded-full ${idx === currentStep ? 'bg-crm-red' : 'bg-crm-border'}`} 
                            />
                        ))}
                    </div>
                    
                    <div className="flex gap-2">
                        <button 
                            onClick={prevStep} 
                            disabled={currentStep === 0}
                            className="p-1.5 rounded-md hover:bg-crm-surface-hover text-crm-fg-muted disabled:opacity-30 transition-colors"
                        >
                            <ChevronLeft size={18} />
                        </button>
                        <button 
                            onClick={nextStep}
                            className="flex items-center gap-1 bg-crm-red hover:bg-crm-red-hover text-white px-3 py-1.5 rounded-md text-xs font-semibold transition-colors"
                        >
                            {currentStep === tourData.length - 1 ? 'Finalizar' : 'Siguiente'}
                            {currentStep < tourData.length - 1 && <ChevronRight size={14} />}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
