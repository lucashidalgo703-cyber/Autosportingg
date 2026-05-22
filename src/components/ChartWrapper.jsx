import React from 'react';
import { motion } from 'framer-motion';

/**
 * ChartWrapper - contenedor con título y estilo premium para cualquier gráfico.
 * Props:
 *   title: string – Título que aparece arriba del gráfico.
 *   children: ReactNode – El gráfico propio (puede ser Recharts, Chart.js, etc.).
 */
const ChartWrapper = ({ title, children }) => {
  return (
    <motion.div
      className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6 overflow-hidden"
      whileHover={{ scale: 1.01 }}
      transition={{ duration: 0.2 }}
    >
      <h3 className="text-lg font-medium text-white mb-4 tracking-tight">{title}</h3>
      <div className="h-64 md:h-80 lg:h-96">{children}</div>
    </motion.div>
  );
};

export default ChartWrapper;
