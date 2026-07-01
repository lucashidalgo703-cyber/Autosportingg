import React from 'react';
import { motion } from 'framer-motion';

/**
 * KPIGrid - muestra un conjunto de tarjetas KPI con icono, valor y descripción.
 * Props:
 *   items: Array<{ icon: ReactComponent, value: string | number, label: string }>
 */
const KPIGrid = ({ items }) => {
  return (
    <motion.div
      className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
      initial="hidden"
      animate="visible"
      variants={{
        hidden: { opacity: 0, y: 20 },
        visible: { opacity: 1, y: 0, transition: { staggerChildren: 0.1 } },
      }}
    >
      {items.map((item, idx) => {
        const Icon = item.icon;
        return (
          <div
            key={idx}
            className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-5 flex items-center space-x-4 hover:bg-zinc-800/70 transition-colors"
          >
            <div className="p-3 bg-red-600/10 rounded-lg">
              <Icon size={24} className="text-red-500" />
            </div>
            <div className="flex-1">
              <h3 className="text-2xl font-bold text-white tracking-tight">
                {item.value}
              </h3>
              <p className="text-sm text-zinc-400 uppercase tracking-wider">
                {item.label}
              </p>
            </div>
          </div>
        );
      })}
    </motion.div>
  );
};

export default KPIGrid;
