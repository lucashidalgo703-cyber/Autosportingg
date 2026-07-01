import React from 'react';
import { motion } from 'framer-motion';

/**
 * DataTable – tabla genérica con encabezados, filas y acciones.
 * Props:
 *   columns: Array<{ Header: string, accessor: string }>
 *   data: Array<object>
 *   onEdit: (row) => void
 *   onDelete: (row) => void
 */
const DataTable = ({ columns, data, onEdit, onDelete }) => {
  return (
    <motion.div
      className="overflow-x-auto rounded-xl border border-zinc-800 bg-zinc-900/30"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      <table className="min-w-full divide-y divide-zinc-700">
        <thead className="bg-zinc-800/50">
          <tr>
            {columns.map((col, idx) => (
              <th
                key={idx}
                className="px-4 py-2 text-left text-xs font-medium text-zinc-400 uppercase tracking-wider"
              >
                {col.Header}
              </th>
            ))}
            {(onEdit || onDelete) && (
              <th className="px-4 py-2 text-left text-xs font-medium text-zinc-400 uppercase tracking-wider">
                Acciones
              </th>
            )}
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-800">
          {data.map((row, i) => (
            <tr key={i} className="hover:bg-zinc-800/30 transition-colors">
              {columns.map((col, j) => (
                <td key={j} className="px-4 py-2 text-sm text-zinc-200">
                  {row[col.accessor] ?? '-'}
                </td>
              ))}
              {(onEdit || onDelete) && (
                <td className="px-4 py-2 flex space-x-2">
                  {onEdit && (
                    <button
                      onClick={() => onEdit(row)}
                      className="text-amber-400 hover:text-amber-300"
                    >
                      Edit
                    </button>
                  )}
                  {onDelete && (
                    <button
                      onClick={() => onDelete(row)}
                      className="text-red-500 hover:text-red-400"
                    >
                      Delete
                    </button>
                  )}
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </motion.div>
  );
};

export default DataTable;
