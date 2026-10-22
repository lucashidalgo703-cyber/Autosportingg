import { courses, checkNumericAnswer } from './curriculum.js';

const concepts = {
    fundamentos: ['¿Qué cambia al comprar un vehículo al contado para stock?', ['Se cambia caja por inventario.', 'Siempre se genera una pérdida por todo el precio.', 'Aumentan las ventas.'], 0, 'La compra transforma activos. El resultado por venta se determina con su reconocimiento y costo correspondiente.'],
    liquidez: ['¿Qué dato sirve directamente para preparar el calendario de caja?', ['Solo el margen de las ventas.', 'Fechas e importes de cobros y pagos.', 'Solo el patrimonio.'], 1, 'La liquidez exige ubicar cobros y pagos en el tiempo.'],
    rentabilidad: ['¿Qué indicador compara contribución con el precio de venta?', ['Retorno sobre capital.', 'Rotación.', 'Margen de contribución.'], 2, 'El margen divide contribución por venta. No utiliza el capital como denominador.'],
    capital: ['¿Qué bases son consistentes para la rotación del stock?', ['Ventas sobre inventario al costo.', 'Costo vendido sobre inventario promedio al costo.', 'Caja sobre precio de lista.'], 1, 'Numerador y denominador deben estar al costo y referirse al mismo período.'],
    financiacion: ['¿Qué permite afirmar una TEA aislada?', ['Es la tasa efectiva anual, sin asegurar que incluya todos los cargos.', 'Es siempre idéntica a la TNA.', 'Es necesariamente el CFT.'], 0, 'La TEA incorpora capitalización. El CFT contempla costos adicionales aplicables.'],
    riesgos: ['¿Qué describe la pérdida esperada?', ['La pérdida máxima garantizada.', 'Una pérdida cierta.', 'Una media modelada con probabilidad, exposición y severidad.'], 2, 'Es una estimación bajo supuestos; no describe todos los escenarios extremos.'],
    inversiones: ['¿Qué limitación tiene el ROI simple?', ['Siempre es negativo.', 'No considera cuándo ocurren los flujos.', 'No usa inversión inicial.'], 1, 'El ROI simple no descuenta flujos ni incorpora por sí mismo su riesgo.'],
    direccion: ['¿Cómo comparar alternativas empresariales?', ['Solo por precio de venta.', 'Solo por mayor margen.', 'Considerando retorno, plazo, liquidez y riesgo.'], 2, 'Una decisión requiere indicadores consistentes y restricciones explícitas.'],
};

const cases = {
    fundamentos: ['Se reconoce una venta por $12 millones y costo de $10 millones; solo se cobran $4 millones. ¿Qué interpretación corresponde?', ['La utilidad bruta es $2 millones; quedan $8 millones por cobrar.', 'La utilidad bruta es $4 millones.', 'Los $12 millones ya están disponibles en caja.'], 0, 'El resultado bruto y el cobro miden hechos distintos. Se supone que se cumplen las condiciones de reconocimiento de la venta.'],
    liquidez: ['Caja actual $5 millones; mañana vencen pagos de $4 millones. Un cobro de $6 millones está previsto dentro de 30 días. Comprar stock hoy cuesta $3 millones. Sin otra financiación, ¿qué alternativa conserva la capacidad de pago?', ['Comprar porque el cobro futuro cubre todo.', 'Reservar el dinero para el vencimiento y postergar la compra.', 'Contar la cuenta por cobrar como caja actual.'], 1, 'Comprar hoy dejaría $2 millones para pagar $4 millones mañana. El cobro posterior no cubre ese vencimiento a tiempo.'],
    rentabilidad: ['Dos unidades generan igual contribución; A usa $10 millones y B $20 millones durante el mismo plazo y riesgo supuesto. ¿Cuál rinde más sobre el capital?', ['Ambas necesariamente tienen igual retorno.', 'B, por usar más capital.', 'A, por obtener igual resultado con menor capital.'], 2, 'Con numerador idéntico, un menor capital comprometido produce mayor retorno por operación.'],
    capital: ['El inventario promedio sube de $20 a $40 millones y el costo vendido anual permanece en $80 millones. ¿Qué sucede?', ['La rotación cae de 4 a 2 veces.', 'La rotación sube a 8 veces.', 'La liquidez mejora necesariamente.'], 0, '80/20 = 4; 80/40 = 2. Más inventario con igual costo vendido reduce la rotación.'],
    financiacion: ['Dos préstamos tienen igual TNA y plazo, pero comisiones distintas. ¿Cómo avanzar para comparar su costo?', ['Elegir cualquiera: cuestan lo mismo.', 'Comparar flujos netos, cuotas, cargos y CFT bajo iguales condiciones.', 'Elegir el que tenga mayor comisión.'], 1, 'La TNA aislada no describe todos los costos. También importan periodicidad y monto neto recibido.'],
    riesgos: ['Una unidad absorbe el 70% del capital disponible y podría tardar seis meses en venderse. ¿Qué análisis corresponde antes de comprar?', ['Comprar automáticamente por su margen.', 'Ignorar la demora si tiene buen precio.', 'Probar liquidez, concentración y escenarios de demora.'], 2, 'El margen potencial no elimina el riesgo de inmovilización y concentración.'],
    inversiones: ['Desembolso hoy $1 millón y cobro único en un período de $1,1 millones. La tasa requerida es 20%. ¿Qué indica el VAN?', ['Es negativo: el valor presente del cobro es menor que la inversión.', 'Es positivo porque se cobran más pesos.', 'Es exactamente cero.'], 0, 'VP = 1.100.000 / 1,20 ≈ 916.667; VAN ≈ −83.333. El retorno nominal de 10% no alcanza la tasa requerida.'],
    direccion: ['Resultado nominal 20% e inflación 25% en igual período. ¿Qué implica?', ['Se ganó 20% de poder adquisitivo.', 'El retorno real fue negativo.', 'El retorno real fue cero.'], 1, '1,20/1,25 − 1 = −4%. Ganar pesos no implica aumentar poder adquisitivo.'],
};

function choice(courseId, type, tuple, level) {
    const [prompt, options, correct, explanation] = tuple;
    return { id: `${courseId}-${type}`, courseId, type: 'choice', prompt, options, correct, explanation, level };
}

export const questions = courses.flatMap(course => [
    choice(course.id, 'concepto', concepts[course.id], 'Inicial'),
    ...course.lessons.map(lesson => ({ id: `${lesson.id}-numerico`, courseId: course.id, type: 'numeric', prompt: `${lesson.exercise.question} (${lesson.exercise.unit})`, correct: lesson.exercise.answer, explanation: lesson.exercise.explanation, level: 'Intermedio' })),
    choice(course.id, 'caso', cases[course.id], 'Avanzado'),
]);

export function gradeAssessment(items, answers) {
    if (!Array.isArray(items) || items.length === 0) throw new Error('La evaluación no contiene preguntas.');
    const results = items.map(item => {
        const answer = answers[item.id];
        if (answer === undefined || answer === null || String(answer).trim() === '') throw new Error('Respondé todas las preguntas antes de corregir.');
        if (item.type === 'choice' && (!Number.isInteger(Number(answer)) || Number(answer) < 0 || Number(answer) >= item.options.length)) throw new Error('Elegí una alternativa válida.');
        const correct = item.type === 'numeric' ? checkNumericAnswer(answer, item.correct) : Number(answer) === item.correct;
        return { id: item.id, courseId: item.courseId, correct, explanation: item.explanation };
    });
    const correctCount = results.filter(item => item.correct).length;
    return { correctCount, total: items.length, score: Math.round(correctCount / items.length * 100), results, review: [...new Set(results.filter(item => !item.correct).map(item => item.courseId))] };
}
