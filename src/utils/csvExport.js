export const escapeCsvValue = (value) => {
    if (value === null || value === undefined) return '';
    const stringValue = String(value);
    // Si contiene comillas dobles, punto y coma, o saltos de línea, lo escapamos
    if (stringValue.includes('"') || stringValue.includes(';') || stringValue.includes('\n') || stringValue.includes('\r')) {
        return `"${stringValue.replace(/"/g, '""')}"`;
    }
    return stringValue;
};

export const formatDateForCsv = (dateStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return '';
    const d = String(date.getDate()).padStart(2, '0');
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const y = date.getFullYear();
    return `${d}/${m}/${y}`;
};

export const formatMoneyForCsv = (value) => {
    if (value === null || value === undefined || isNaN(value)) return '0';
    // Para CSV en español, a veces se prefiere evitar símbolos de moneda o formatear con coma decimal.
    // Usaremos el valor numérico puro pero con 2 decimales si es necesario para facilitar la sumatoria en Excel.
    return Number(value).toFixed(2);
};

export const downloadCsv = (filename, columns, rows) => {
    const BOM = '\uFEFF'; // Asegura UTF-8 con BOM para que Excel lea los acentos correctamente
    
    const headers = columns.map(c => escapeCsvValue(c)).join(';');
    const csvContent = rows.map(row => 
        row.map(val => escapeCsvValue(val)).join(';')
    ).join('\n');
    
    const finalCsv = BOM + headers + '\n' + csvContent;
    
    const blob = new Blob([finalCsv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
};
