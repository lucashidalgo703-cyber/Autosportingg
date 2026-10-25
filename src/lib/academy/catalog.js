export const academyCourses = [
    ['fundamentos', 'Fundamentos financieros', 'Separá ventas, resultados y dinero disponible.', 'Inicial'],
    ['liquidez', 'Flujo de caja y liquidez', 'Anticipá cobros, pagos y necesidades de efectivo.', 'Inicial'],
    ['rentabilidad', 'Rentabilidad de operaciones', 'Medí el resultado y el capital de cada operación.', 'Intermedio'],
    ['capital', 'Capital de trabajo y rotación', 'Entendé cuánto capital inmoviliza el inventario.', 'Intermedio'],
    ['financiacion', 'Financiación e intereses', 'Compará tasas, plazos y cronogramas.', 'Intermedio'],
    ['riesgos', 'Gestión de riesgos', 'Evaluá escenarios y protegé la continuidad.', 'Intermedio'],
    ['inversiones', 'Inversiones empresariales', 'Compará alternativas con flujos y valor presente.', 'Avanzado'],
    ['direccion', 'Dirección financiera avanzada', 'Asigná capital con objetivos y restricciones.', 'Avanzado'],
].map(([id, title, description, level]) => ({ id, title, description, level }));

export const academySections = [
    ['cursos', 'Cursos', 'Ocho recorridos de educación financiera empresarial.'],
    ['simuladores', 'Laboratorio', 'Experimentá con datos ficticios y fórmulas visibles.'],
    ['evaluaciones', 'Evaluaciones', 'Poné a prueba lo aprendido y recibí explicaciones.'],
    ['progreso', 'Mi progreso', 'Consultá tu avance educativo en este navegador.'],
    ['entrenador', 'Entrenador de decisiones', 'Compará alternativas de negocio en escenarios simulados.'],
    ['tutor', 'Tutor financiero', 'Repasá conceptos con una guía de contenidos estructurados.'],
];
