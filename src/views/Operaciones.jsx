import React, { useState } from 'react';
import ConstructionPlaceholder from '../components/ConstructionPlaceholder';

/**
 * Operaciones – contenedor con pestañas internas para Pedidos, Expedientes, Gestoría, Consignaciones, Infracción.
 * Por ahora cada pestaña muestra un placeholder.
 */
const Operaciones = () => {
  const [tab, setTab] = useState('pedidos');
  const tabs = [
    { id: 'pedidos', label: 'Pedidos' },
    { id: 'expedientes', label: 'Expedientes' },
    { id: 'gestoria', label: 'Gestoría' },
    { id: 'consignaciones', label: 'Consignaciones' },
    { id: 'infraccion', label: 'Infracción' },
  ];

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white p-6 lg:p-10">
      <h2 className="text-2xl font-semibold mb-4 tracking-tight">Operación</h2>
      <div className="flex space-x-4 mb-6">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors 
              ${tab === t.id ? 'bg-red-600/10 text-red-500 border border-red-500/20' : 'text-zinc-400 hover:text-zinc-100 hover:bg-white/5 border border-transparent'}`}
          >
            {t.label}
          </button>
        ))}
      </div>
      <ConstructionPlaceholder title={tabs.find((t) => t.id === tab).label} />
    </div>
  );
};

export default Operaciones;
