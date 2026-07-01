import React, { useState, useEffect } from 'react';
import CrmModal from './CrmModal';
import CrmButton from './CrmButton';

export default function InputModal({
    isOpen,
    title = "Ingresar valor",
    message,
    label,
    placeholder = "",
    type = "text",
    initialValue = "",
    confirmText = "Confirmar",
    cancelText = "Cancelar",
    variant = "primary", // can be "primary", "danger"
    onConfirm,
    onClose
}) {
    const [value, setValue] = useState(initialValue);

    useEffect(() => {
        if (isOpen) {
            setValue(initialValue);
        }
    }, [isOpen, initialValue]);

    const handleSubmit = (e) => {
        e.preventDefault();
        onConfirm(value);
        onClose();
    };

    return (
        <CrmModal
            isOpen={isOpen}
            onClose={onClose}
            title={title}
            maxWidth="max-w-md"
            footer={
                <div className="flex justify-end gap-3 w-full">
                    <CrmButton type="button" variant="ghost" onClick={onClose}>
                        {cancelText}
                    </CrmButton>
                    <CrmButton
                        type="button"
                        variant={variant}
                        disabled={!value.trim() && type !== 'password'} // Require value unless password, though password is usually required too
                        onClick={handleSubmit}
                    >
                        {confirmText}
                    </CrmButton>
                </div>
            }
        >
            <form onSubmit={handleSubmit} className="p-5 flex flex-col gap-4">
                {message && <p className="text-sm text-crm-fg-muted m-0">{message}</p>}
                
                <div className="flex flex-col gap-1.5">
                    {label && <label className="text-xs font-bold text-crm-fg-muted uppercase tracking-wider">{label}</label>}
                    <input
                        type={type}
                        value={value}
                        onChange={(e) => setValue(e.target.value)}
                        placeholder={placeholder}
                        autoFocus
                        className="w-full h-10 rounded-xl border border-crm-border bg-crm-bg px-3 text-sm text-crm-fg outline-none focus:border-crm-red transition-colors"
                    />
                </div>
                {/* Hidden submit button to allow Enter key to submit form */}
                <button type="submit" className="hidden">Submit</button>
            </form>
        </CrmModal>
    );
}
