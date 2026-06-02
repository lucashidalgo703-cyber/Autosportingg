import MessageTemplateManager from '../../../../components/crm/templates/MessageTemplateManager';
import PermissionGuard from '../../../../components/crm/layout/PermissionGuard';
import { ROLES, PERMISSIONS } from '../../../../utils/adminPermissions';

export const metadata = {
    title: 'Plantillas de Mensajes - Admin AutoSporting'
};

export default function PlantillasPage() {
    return (
        <PermissionGuard 
            allowedRoles={[ROLES.OWNER, ROLES.ADMIN, ROLES.VENTAS, ROLES.ADMINISTRATIVO]} 
            requiredPermission={PERMISSIONS.MESSAGETEMPLATES_READ}
            fallback={<div className="p-6 text-red-500">No tenés permisos para ver esta sección.</div>}
        >
            <div className="p-6 max-w-7xl mx-auto">
                <div className="mb-6">
                    <h1 className="text-2xl font-bold text-white">Plantillas de Mensajes</h1>
                    <p className="text-[#A1A1AA] mt-1">
                        Gestioná los textos predefinidos para agilizar la comunicación operativa y comercial.
                    </p>
                </div>
                
                <MessageTemplateManager />
            </div>
        </PermissionGuard>
    );
}
