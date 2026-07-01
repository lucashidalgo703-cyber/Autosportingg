import React from 'react';
import CrmModal from './CrmModal';
import CrmButton from './CrmButton';
import { AlertTriangle } from 'lucide-react';

export default function ConfirmModal({
    isOpen,
    onClose,
    onConfirm,
    title = "Confirmar acción",
    message,
    confirmText = "Confirmar",
    cancelText = "Cancelar",
    isDestructive = false,
    isConfirmDisabled = false,
    children = null
}) {
    return (
        <CrmModal
            isOpen={isOpen}
            onClose={onClose}
            title={title}
            hideCloseButton={false}
            maxWidth="max-w-md"
            footer={
                <div className="flex justify-end gap-3 w-full">
                    <CrmButton type="button" variant="ghost" onClick={onClose}>
                        {cancelText}
                    </CrmButton>
                    <CrmButton
                        type="button"
                        variant={isDestructive ? "danger" : "primary"}
                        disabled={isConfirmDisabled}
                        onClick={() => {
                            if (isConfirmDisabled) return;
                            onConfirm();
                            onClose();
                        }}
                    >
                        {confirmText}
                    </CrmButton>
                </div>
            }
        >
            <div className="p-5 flex flex-col gap-4">
                <div className="flex items-start gap-4">
                    {isDestructive && (
                        <div className="bg-crm-red/10 p-3 rounded-full shrink-0">
                            <AlertTriangle size={24} className="text-crm-red" />
                        </div>
                    )}
                    <div className="flex-1">
                        <p className="text-sm text-crm-fg-muted leading-relaxed m-0">{message}</p>
                    </div>
                </div>
                {children && <div className="mt-2">{children}</div>}
            </div>
        </CrmModal>
    );
}
