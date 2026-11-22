// Banco de examen independiente de los ejercicios y casos de práctica.
// El valor esperado es explícito y se contrasta con oráculos en las pruebas.
export const assessmentVariants = {
    fundamentos: [
        ['Activos por $48 millones y obligaciones por $19 millones: ¿patrimonio?', 29000000, '48.000.000 − 19.000.000 = 29.000.000.', 'pesos'],
        ['Venta reconocida $21 millones, costo vendido total $16 millones y comisión variable $1 millón. ¿Contribución antes de estructura e impuestos?', 4000000, '21.000.000 − 16.000.000 − 1.000.000 = 4.000.000; el cobro no cambia esta diferencia.', 'pesos'],
        ['Venta $30 millones y costo atribuible total $22,5 millones. ¿Margen porcentual sobre venta?', 25, '(30 − 22,5) / 30 × 100 = 25%; el recargo sobre costo sería distinto.', '%'],
    ],
    liquidez: [
        ['Caja inicial $7 millones. Mes 1: cobros 5 y pagos 9 millones; mes 2: cobros 8 y pagos 6 millones. ¿Caja al terminar el mes 2?', 5000000, 'Mes 1: 7+5−9 = 3; mes 2: 3+8−6 = 5 millones. Se arrastra el saldo.', 'pesos'],
        ['Venta $18 millones: anticipo cobrado de 35%, resto a crédito. ¿Entrada inicial de efectivo?', 6300000, '18.000.000 × 0,35 = 6.300.000. El saldo futuro no es caja disponible hoy.', 'pesos'],
        ['La reserva objetivo es $6 millones y el menor saldo proyectado es $3,7 millones. ¿Cuánto falta para cumplir la reserva?', 2300000, '6.000.000 − 3.700.000 = 2.300.000; es una necesidad respecto del objetivo, no una pérdida contable.', 'pesos'],
    ],
    rentabilidad: [
        ['Venta $23,5 millones, compra $18,4 millones, preparación $800.000 y comisión $700.000. ¿Contribución?', 3600000, '23.500.000 − 18.400.000 − 800.000 − 700.000 = 3.600.000.', 'pesos'],
        ['Una operación compromete $16 millones antes de cerrar y deja resultado definido de $2,24 millones. ¿Retorno porcentual por operación?', 14, '2.240.000 / 16.000.000 × 100 = 14%. No es una tasa anual garantizada.', '%'],
        ['Costos fijos de $5,4 millones y contribución media de $1,2 millones por unidad. ¿Mínimo de unidades enteras para cubrirlos?', 5, '5,4 / 1,2 = 4,5; se necesitan 5 unidades completas. Cuatro no alcanzan.', 'unidades'],
    ],
    capital: [
        ['Inventario inicial al costo $18 millones, final $30 millones y costo vendido anual $96 millones. ¿Rotación anual usando promedio de extremos?', 4, 'Promedio = (18+30)/2 = 24; 96/24 = 4 veces.', 'veces'],
        ['Inventario 65 días, cobro 28 días y pago 19 días. ¿Ciclo de caja aproximado?', 74, '65 + 28 − 19 = 74 días.', 'días'],
        ['Costo vendido de $240 millones en un año convencional de 360 días. Para 45 días de inventario, ¿stock promedio objetivo al costo?', 30000000, '240.000.000 / 360 × 45 = 30.000.000. No representa utilidad.', 'pesos'],
    ],
    financiacion: [
        ['Principal $1,8 millones al 4% simple por período durante 3 períodos. ¿Monto final sin cargos?', 2016000, '1.800.000 × (1 + 0,04 × 3) = 2.016.000. No capitaliza interés.', 'pesos'],
        ['TNA 30% capitalizable en 12 meses iguales. ¿TEA porcentual a dos decimales, sin cargos ni impuestos?', 34.49, 'Tasa mensual 0,30/12 = 0,025; [(1,025)^12−1]×100 ≈ 34,49%. No es CFT.', '%'],
        ['Principal $2,4 millones sin interés ni cargos en 8 cuotas vencidas iguales. ¿Cuota?', 300000, 'A tasa cero: 2.400.000 / 8 = 300.000.', 'pesos'],
    ],
    riesgos: [
        ['Exposición ficticia $7,5 millones, probabilidad de incumplimiento 12% y severidad 40%. ¿Pérdida esperada?', 360000, '7.500.000 × 0,12 × 0,40 = 360.000; no es una pérdida cierta ni máxima.', 'pesos'],
        ['Una unidad concentra $9 millones de un stock al costo de $45 millones. ¿Concentración porcentual?', 20, '9.000.000 / 45.000.000 × 100 = 20%.', '%'],
        ['Contribución base $2,8 millones. En estrés se reducen ingresos $900.000 y suben costos $450.000. ¿Contribución bajo esos supuestos?', 1450000, '2.800.000 − 900.000 − 450.000 = 1.450.000. No es una predicción.', 'pesos'],
    ],
    inversiones: [
        ['Desembolso inicial $5 millones y retornos totales netos de costos operativos $6,75 millones dentro del horizonte. ¿ROI simple porcentual?', 35, '(6.750.000 − 5.000.000) / 5.000.000 × 100 = 35%.', '%'],
        ['Cobro único de $1.331.000 al terminar 3 períodos. Tasa de descuento 10% por período. ¿Valor presente?', 1000000, '1.331.000 / (1,10)^3 = 1.000.000.', 'pesos'],
        ['Inversión inicial $7,2 millones y flujo neto uniforme de $900.000 por mes. ¿Payback simple?', 8, '7.200.000 / 900.000 = 8 meses, sin descuento ni flujos posteriores.', 'meses'],
    ],
    direccion: [
        ['Capital $80 millones, reserva mínima $16 y pago ineludible $12 millones antes de cualquier venta. Sin financiación: ¿máxima inversión inicial compatible?', 52000000, '80.000.000 − 16.000.000 − 12.000.000 = 52.000.000. Se protege la reserva después del vencimiento.', 'pesos'],
        ['Retorno nominal 56% e inflación 30% en igual horizonte. ¿Retorno real porcentual?', 20, '(1,56 / 1,30 − 1) × 100 = 20%. Restar tasas daría una respuesta incorrecta.', '%'],
        ['Estructura hipotética: 40% de deuda al 15% anual y 60% de capital propio al 25% anual, sin efecto fiscal. ¿Costo ponderado porcentual?', 21, '0,40 × 15% + 0,60 × 25% = 21%. El ejemplo no incorpora deducibilidad de intereses.', '%'],
    ],
};
