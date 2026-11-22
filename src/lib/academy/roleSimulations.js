// src/lib/academy/roleSimulations.js
// AutoSporting Academy — 6 Casos Prácticos Completos y Simulaciones Interactivas
// Con contexto, objetivos, información disponible, decisiones, consecuencias y rúbricas explícitas

export const ROLE_SIMULATIONS = [
    // =========================================================================
    // CASO 1 (Ventas): Cliente que considera caro el vehículo y compara con otra agencia
    // =========================================================================
    {
        id: 'sim-vta-01',
        title: 'Hilux SRX vs. otra agencia: El cliente considera caro el vehículo',
        role: 'ventas',
        roleLabel: 'Ventas',
        estimatedMinutes: 10,
        context: `El cliente Alberto, productor ganadero de Sarmiento que viaja frecuentemente por la Ruta 26 hacia Comodoro Rivadavia, visita la agencia un martes por la tarde.
Está mirando una Toyota Hilux 2.8 SRX 4x4 Automática 2021 de color blanco, con 68.000 km, publicada en el CRM a $38.500.000.
Alberto te dice con tono firme:
"Mirá, la chata me gusta, pero está muy cara. En una agencia de Trelew vi una 2021 igualita a $35.000.000 y el vendedor me dijo que me la entrega con el service hecho. Si me la bajás a $35.500.000 te dejo la seña ya mismo en efectivo; si no, el jueves viajo a Trelew y la compro allá".`,
        objective: 'Conducir la objeción de precio indagando con precisión qué está comparando el cliente, defender la propuesta de valor y las garantías de AutoSporting, y negociar dentro de las pautas autorizadas sin regalar margen ni generar rispideces.',
        availableInfo: [
            { label: 'Unidad AutoSporting', value: 'Toyota Hilux 2021 SRX 4x4 AT, 68.000 km reales con historial en concesionario oficial Toyota verificado, cubiertas Michelin LTX Force con 85% de vida útil, batería Moura nueva colocada hace 1 mes, auxilio sin rodar, dos llaves de presencia originales.' },
            { label: 'Garantía AutoSporting', value: 'Peritaje mecánico de 120 puntos aprobado, garantía mecánica escrita por 6 meses en motor y caja, radicación en Chubut libre de deudas garantizada y entrega en Comodoro Rivadavia con gestoría propia incluida.' },
            { label: 'Unidad comparada en Trelew', value: 'Alberto solo vio fotos por un portal web. No sabe kilometraje real de tablero, no vio el estado de las cubiertas ni si adeuda patentes de Rentas Chubut o tiene prenda bancaria.' },
            { label: 'Límites de negociación del vendedor', value: 'Precio de lista: $38.500.000. Descuento máximo comercial directo permitido por Dirección: hasta $500.000 ($38.000.000). Posibilidad de bonificar el primer service de fluidos y polarizado antivandálico (valor costo agencia: $180.000). Toda rebaja mayor requiere autorización del Propietario.' }
        ],
        decisions: [
            {
                id: 'opt-a',
                title: 'Aceptar la rebaja a $35.500.000 de palabra para cerrar la venta inmediatamente',
                action: 'Le decís: "Trato hecho Alberto, te la dejo en $35.500.000 porque me caés bien y la plata en mano manda, dejame $200.000 de seña".',
                outcome: 'Riesgo grave. La operación no puede ser ejecutada por administración porque excede por $2.500.000 tu límite de descuento y destruye el margen de la unidad. El Propietario rechaza la venta, y cuando llamás a Alberto para decirle que hubo un error, Alberto se siente engañado, exige la devolución de la seña con escándalo en la sucursal y publica una reseña negativa de 1 estrella acusando a la agencia de estafa.',
                score: 20,
                rubricBreakdown: {
                    escuchaIndagacion: 20,
                    defensaValor: 10,
                    respetoAutorizaciones: 10,
                    comunicacionProfesional: 30
                },
                feedback: 'Pésima decisión. Viola el límite de descuento autorizado, destruye la rentabilidad y genera un grave conflicto legal y reputacional con el cliente.'
            },
            {
                id: 'opt-b',
                title: 'Descalificar con soberbia la unidad de Trelew y ponerse a la defensiva',
                action: 'Le respondés: "Es imposible que te vendan una SRX a 35 millones. Seguro esa camioneta de Trelew está volcada, tiene el motor fundido o es un cuento del tío. Si querés comprar barato andate a Trelew, acá vendemos calidad".',
                outcome: 'Alberto se siente ofendido por tu tono agresivo. Te contesta: "No me trates de tonto, el vendedor de Trelew fue muy atento conmigo". Se da media vuelta, se retira de la agencia y pierdes definitivamente a un cliente ganadero con alto poder adquisitivo y capacidad de compra recurrente.',
                score: 35,
                rubricBreakdown: {
                    escuchaIndagacion: 30,
                    defensaValor: 40,
                    respetoAutorizaciones: 50,
                    comunicacionProfesional: 20
                },
                feedback: 'Mala decisión. Atacar a la competencia o agredir indirectamente el criterio del cliente rompe el vínculo comercial. La firmeza debe ir siempre acompañada de empatía y profesionalismo.'
            },
            {
                id: 'opt-c',
                title: 'Indagar la comparación, contrastar costos ocultos y ofrecer concesión condicionada dentro de pauta',
                action: 'Le decís con serenidad: "Alberto, es muy comprensible que mires opciones, 35 millones es un número tentador. Ahora bien, para que compares peras con peras: ¿Pudiste ver el estado de las cubiertas de esa camioneta? Las 4 cubiertas de nuestra Hilux son Michelin nuevas, cambiarlas hoy cuesta más de 2 millones de pesos. Además, esta chata tiene los services oficiales comprobables, dos llaves y la podés revisar ahora mismo con tu mecánico acá en Comodoro. En Trelew tenés el viaje, el traslado y el riesgo de encontrarte sorpresas. Si tu decisión es cerrar hoy en Comodoro, lo que puedo hacer es ajustarte el precio a $38.000.000 de contado y te incluyo sin cargo el service de fluidos y el trámite de transferencia bonificado en un 50%".',
                outcome: 'Alberto reflexiona: reconoce que no había tenido en cuenta el costo de las cubiertas nuevas ni el riesgo de viajar 400 km para encontrarse con una camioneta que tal vez no estuviera tan buena. Te pide probar la camioneta en la subida del cerro Chenque; la prueba es excelente. Acepta tu contrapropuesta de $38.000.000 con los beneficios añadidos, deja la seña formal en la caja y la venta se cierra con margen saludable.',
                score: 100,
                rubricBreakdown: {
                    escuchaIndagacion: 100,
                    defensaValor: 100,
                    respetoAutorizaciones: 100,
                    comunicacionProfesional: 100
                },
                feedback: '¡Excelente decisión! Indagó con preguntas inteligentes, ayudó al cliente a calcular el costo real de los neumáticos y el traslado, defendió la garantía local de AutoSporting y negoció una concesión condicionada perfectamente dentro de sus facultades autorizadas.'
            },
            {
                id: 'opt-d',
                title: 'Tomar la oferta ad referéndum del Propietario con seña formal previa',
                action: 'Le decís: "Alberto, 35.5 millones es una cifra que escapa totalmente a mis facultades directas. Lo que podemos hacer, si tu intención es comprar esta camioneta hoy, es que dejemos una oferta formal por escrito con una seña de reserva ad referéndum de $500.000 sujeta a la aprobación de la Dirección en un plazo de 2 horas. Si la Dirección no la aprueba, te devolvemos el 100% de la seña en el acto".',
                outcome: 'Alberto acepta dejar la oferta formal. Subes la solicitud de autorización al CRM explicando la postura del cliente. El Propietario evalúa la rotación del stock y responde con una contraoferta autorizada de $37.500.000. Alberto acepta la contraoferta al sentir que la agencia hizo un esfuerzo real por acercarse a su número.',
                score: 85,
                rubricBreakdown: {
                    escuchaIndagacion: 85,
                    defensaValor: 80,
                    respetoAutorizaciones: 100,
                    comunicacionProfesional: 85
                },
                feedback: 'Muy buena alternativa. Canalizó la excepción formalmente en el sistema sin comprometer a la empresa de antemano y logró sostener el interés del cliente con un compromiso recíproco.'
            }
        ],
        rubricCriteria: [
            { name: 'Escucha e indagación', description: 'Capacidad para preguntar qué compara el cliente antes de reaccionar.' },
            { name: 'Defensa del valor de AutoSporting', description: 'Argumentación basada en cubiertas, peritaje, garantía escrita y presencia física en Comodoro Rivadavia.' },
            { name: 'Respeto a las autorizaciones', description: 'Apego estricto a los límites de descuento y uso de la seña ad referéndum.' },
            { name: 'Comunicación profesional', description: 'Tono empático, asertivo y libre de soberbia o agresiones.' }
        ]
    },

    // =========================================================================
    // CASO 2 (Ventas): Cliente que exige mejor toma de su usado y descuento sobre la diferencia
    // =========================================================================
    {
        id: 'sim-vta-02',
        title: 'Amarok V6 y EcoSport: Exigencia de sobretasación del usado y descuento',
        role: 'ventas',
        roleLabel: 'Ventas',
        estimatedMinutes: 10,
        context: `El cliente Claudio concurre a la agencia con su Ford EcoSport 2017 Titanium Manual (125.000 km) para comprar una Volkswagen Amarok V6 Extreme 2022 publicada en $42.000.000.
Nuestro tasador peritó la EcoSport en el taller: el valor de toma de tabla interna es de $9.500.000, considerando que adeuda $280.000 de patentes municipales en Comodoro Rivadavia y tiene las dos cubiertas delanteras lisas que demandan cambio inmediato ($400.000).
Claudio se enoja al ver la cotización y dice:
"¡Una vergüenza! En la revista InfoAuto mi EcoSport Titanium figura en 12 millones de pesos. Ustedes me la quieren pagar monedas. Si quieren que les compre la Amarok, me tienen que tomar la EcoSport en $11.500.000 limpios y además me tienen que hacer un descuento de $1.000.000 sobre la diferencia, si no me la llevo a otra parte".`,
        objective: 'Explicar pedagógicamente al cliente cómo se compone una tasación profesional de permuta (costos de reacondicionamiento, garantía, transferencia y margen de rotación), defender la diferencia comercial y acordar un esquema viable sin sobretasar pérdidas.',
        availableInfo: [
            { label: 'Unidad a la venta', value: 'VW Amarok V6 Extreme 2022, 45.000 km, impecable, muy demandada en la zona petrolera de Chubut y Santa Cruz.' },
            { label: 'Estado real de la EcoSport', value: 'Kilometraje alto (125.000 km), service de distribución pendiente de comprobante, 2 cubiertas delanteras para cambio urgente, deuda municipal de $280.000.' },
            { label: 'Referencia InfoAuto vs. Valor de Toma', value: 'InfoAuto publica precios promedio de venta al público en Buenos Aires, no valores de toma directa con acondicionamiento en plaza patagónica.' },
            { label: 'Facultades del vendedor', value: 'Puede ajustar la toma hasta $9.800.000 absorbiendo la gestión municipal en Gestoría, o bonificar gastos de entrega de la Amarok. No puede bajar la diferencia en 3 millones de forma unilateral.' }
        ],
        decisions: [
            {
                id: 'opt-a',
                title: 'Aceptar la sobretasación a $11.500.000 para no perder la venta de la Amarok',
                action: 'Le decís: "Bueno Claudio, para que te lleves la Amarok hoy te tomo la EcoSport en 11.5 millones y te bajo 1 millón la diferencia, firmanos ya".',
                outcome: 'Catástrofe financiera. Cuando la EcoSport ingresa al stock propio, la agencia debe pagar la deuda de patente ($280.000), cambiar las cubiertas ($400.000) y hacer el service ($250.000). El costo real de ingreso queda en $12.430.000, muy por encima de su valor de mercado. La unidad queda parada 180 días en el salón perdiendo valor. El Propietario sanciona la operación y se genera una pérdida neta para la agencia.',
                score: 15,
                rubricBreakdown: {
                    escuchaIndagacion: 10,
                    defensaValor: 20,
                    respetoAutorizaciones: 10,
                    comunicacionProfesional: 20
                },
                feedback: 'Inadmisible. Sobrepagar una permuta es la forma más rápida de fundir una agencia de autos usados. El vendedor debe cuidar el capital de la empresa como propio.'
            },
            {
                id: 'opt-b',
                title: 'Explicar con transparencia técnica el desglose de la tasación y mostrar los costos de alistamiento',
                action: 'Invitás a Claudio a sentarse con un café y le mostrás con respeto la planilla de peritaje técnico: "Claudio, entiendo perfectamente tu postura y es natural que busques el mejor número por tu camioneta, que ha sido un gran vehículo. Mirá, te quiero mostrar con total transparencia cómo llegamos a este número: el valor de venta al público promedio es de 11 millones. Para que nosotros podamos revenderla con la misma garantía que hoy te damos en la Amarok, tenemos que colocarle las dos cubiertas delanteras nuevas que están al límite de seguridad ($400.000), regularizar la deuda de patentes de Comodoro ($280.000) y hacer el peritaje oficial. Si te la tomáramos en 11.5 millones, estaríamos perdiendo dinero en la unidad. Lo que sí puedo proponerte es: te reconozco $9.800.000 por la EcoSport, la agencia se hace cargo de toda la gestión y gestoría de baja de deuda municipal, y en la Amarok te bonifico el polarizado y el kit de alfombras termoformadas. La diferencia neta te queda en un número muy competitivo para subirte a un vehículo 5 años más nuevo y con motor V6".',
                outcome: 'Claudio ve la planilla, constata que los argumentos sobre las cubiertas y las patentes son irrefutables y valora que se lo explicaran sin ocultamientos. Negocian unos minutos más y cierran el acuerdo: entrega su EcoSport, abona la diferencia de contado/transferencia y se va sumamente satisfecho con su Amarok V6.',
                score: 100,
                rubricBreakdown: {
                    escuchaIndagacion: 100,
                    defensaValor: 100,
                    respetoAutorizaciones: 100,
                    comunicacionProfesional: 100
                },
                feedback: '¡Brillante! Desarmó el conflicto con datos objetivos, no descalificó el auto del cliente, transparentó los costos de alistamiento y cerró una operación sana para ambas partes.'
            },
            {
                id: 'opt-c',
                title: 'Proponerle dejar la EcoSport en consignación y buscar otra alternativa para la compra',
                action: 'Le decís: "Claudio, si tu objetivo es defender los 11.5 millones en mano, te propongo lo siguiente: dejanos la EcoSport en consignación comercial para que la publiquemos en nuestros canales al valor que pretendés, y mientras tanto evaluamos señar la Amarok o esperar a que se venda tu usado".',
                outcome: 'Claudio necesita la Amarok ya para viajar por trabajo la semana próxima, por lo que la consignación no le resuelve el plazo inmediato. Sin embargo, valora la alternativa y te pide 24 horas para analizar si vende la EcoSport por su cuenta o si acepta nuestra toma de $9.800.000.',
                score: 80,
                rubricBreakdown: {
                    escuchaIndagacion: 80,
                    defensaValor: 85,
                    respetoAutorizaciones: 90,
                    comunicacionProfesional: 85
                },
                feedback: 'Buena alternativa comercial. Ofreció una opción honesta que no compromete el capital de la agencia cuando el cliente tiene expectativas de precio que no coinciden con la toma directa.'
            }
        ],
        rubricCriteria: [
            { name: 'Pedagogía en la tasación', description: 'Capacidad para explicar la diferencia entre precio de venta al público y valor de toma neta.' },
            { name: 'Defensa de la rentabilidad', description: 'Protección de los márgenes y rechazo a sobretasaciones ruinosas.' },
            { name: 'Manejo de la objeción agresiva', description: 'Desescalamiento del enojo del cliente con datos objetivos y trato respetuoso.' },
            { name: 'Creatividad en el cierre', description: 'Búsqueda de alternativas viables (bonificaciones de servicio, consignación, plazos).' }
        ]
    },

    // =========================================================================
    // CASO 3 (Ventas): Cliente que condiciona el cierre a una seña o excepción no autorizada
    // =========================================================================
    {
        id: 'sim-vta-03',
        title: 'Seña condicionada y entrega previa no autorizada',
        role: 'ventas',
        roleLabel: 'Ventas',
        estimatedMinutes: 10,
        context: `El cliente Damián quiere comprar un Jeep Renegade 2020 por $24.000.000.
El viernes a las 18:30 hs se presenta en la agencia con $500.000 en billetes y dice:
"Mirá, tengo que viajar a Río Mayo mañana sábado a las 7 de la mañana sí o sí. Te dejo esta seña de $500.000 ahora, me hacés un boleto provisorio, me llevo el Jeep hoy y el lunes al mediodía te transfiero los $23.500.000 restantes desde mi cuenta bancaria. Si no me dejás llevarme el Jeep ahora, me guardo la plata y no hacemos nada".`,
        objective: 'Sostener firmemente las normas de seguridad de la empresa frente a la presión extrema de un cliente, explicar los riesgos legales y proponer alternativas operativas legítimas sin violar el circuito de autorizaciones.',
        availableInfo: [
            { label: 'Estado del Jeep', value: 'Unidad en stock propio, documentación lista para ingresar transferencia el lunes en el Registro de Comodoro.' },
            { label: 'Regla de Oro AutoSporting', value: 'ESTRICTAMENTE PROHIBIDO entregar la posesión física de un vehículo sin el 100% de los fondos acreditados y la documentación provisoria o definitiva habilitante emitida.' },
            { label: 'Riesgo inminente', value: 'Si el cliente se lleva el Jeep con solo el 2% del valor pagado y sufre un accidente en la Ruta 26 o no transfiere el lunes, la agencia asume un riesgo patrimonial y penal incalculable.' },
            { label: 'Alternativas viables', value: 'Asegurar la reserva con la seña formal, emitir recibo oficial y coordinar la entrega prioritaria para el lunes ni bien impacte la transferencia.' }
        ],
        decisions: [
            {
                id: 'opt-a',
                title: 'Ceder a la presión y entregar el Jeep con la seña del 2%',
                action: 'Le decís: "Bueno Damián, veo que sos un tipo de palabra. Firmame este pagaré en blanco, dejame los $500.000 y llevate el Jeep, pero por favor el lunes transferime temprano".',
                outcome: 'Desastre operacional. El sábado a la madrugada, el Jeep protagoniza un despiste sobre la nieve cerca de Sarmiento; el vehículo queda con daños graves y sin seguro vigente a nombre del nuevo conductor. El lunes Damián no transfiere el dinero argumentando que "el auto se rompió solo". AutoSporting queda sin el vehículo, sin el dinero y envuelta en una demanda judicial de años. Eres despedido con justa causa por incumplimiento de deberes de custodia.',
                score: 0,
                rubricBreakdown: {
                    escuchaIndagacion: 0,
                    defensaValor: 0,
                    respetoAutorizaciones: 0,
                    comunicacionProfesional: 0
                },
                feedback: 'Gravísima negligencia. Ningún vehículo bajo custodia de AutoSporting se entrega sin fondos acreditados y documentación legal habilitante, bajo ninguna circunstancia.'
            },
            {
                id: 'opt-b',
                title: 'Mantener la norma con firmeza profesional y ofrecer congelamiento y alistamiento prioritario',
                action: 'Le explicás con calma y firmeza: "Damián, comprendo perfectamente tu necesidad de viajar a Río Mayo, pero las políticas de seguridad de la agencia y las leyes nacionales de tránsito nos impiden terminantemente entregar la posesión de una unidad sin el pago cancelado y la cobertura de seguro transferida; esto es ante todo para cuidar tu propia seguridad jurídica y la nuestra. Lo que sí podemos hacer para resolver tu compra es: tomamos los $500.000 como seña de reserva formal, congelamos el precio del Jeep por escrito, te emitimos el recibo oficial y dejamos el vehículo en el taller con peritaje final y lavado completo para que el lunes a primera hora, ni bien impacte tu transferencia, te entreguemos la unidad sin ninguna espera adicional".',
                outcome: 'Damián protesta al principio, pero comprende que tu postura es inquebrantable y seria. Reconoce que ninguna empresa responsable le habría entregado un auto de 24 millones por 500 mil pesos. Deja la seña, viaja a Río Mayo en su vehículo actual o en transporte de línea, y el lunes a las 10 hs realiza la transferencia bancaria. Se le entrega el Jeep a las 11:30 hs con toda la documentación y agradece la prolijidad de la agencia.',
                score: 100,
                rubricBreakdown: {
                    escuchaIndagacion: 100,
                    defensaValor: 100,
                    respetoAutorizaciones: 100,
                    comunicacionProfesional: 100
                },
                feedback: '¡Impecable! No titubeó ante la extorsión comercial de "o me lo das ahora o no compro", sostuvo la política de seguridad inquebrantable de AutoSporting y canalizó la operación con excelencia.'
            },
            {
                id: 'opt-c',
                title: 'Llamar al Propietario a las 19 hs para pedirle que autorice la entrega sin plata',
                action: 'Llamás desesperado al teléfono personal del dueño de la agencia para pedirle que haga una excepción y deje salir el auto con $500.000.',
                outcome: 'El Propietario te recrimina por no conocer las políticas elementales de la empresa y te ordena que no entregues bajo ningún concepto el vehículo sin la totalidad del dinero acreditado.',
                score: 50,
                rubricBreakdown: {
                    escuchaIndagacion: 50,
                    defensaValor: 40,
                    respetoAutorizaciones: 60,
                    comunicacionProfesional: 50
                },
                feedback: 'Regular. Al menos no entregó el auto por su cuenta, pero un vendedor profesional debe conocer y defender los protocolos básicos de seguridad sin trasladar dilemas absurdos a la Dirección.'
            }
        ],
        rubricCriteria: [
            { name: 'Firmeza ante la presión', description: 'Capacidad para decir NO a pedidos improcedentes sin perder la cortesía.' },
            { name: 'Cumplimiento del protocolo de seguridad', description: 'Respeto irrestricto a la prohibición de entrega de unidades sin cobro acreditado.' },
            { name: 'Capacidad de persuasión', description: 'Explicación del beneficio de la norma como protección para el propio comprador.' },
            { name: 'Propuesta de alternativas', description: 'Canalización hacia la reserva formal con entrega prioritaria.' }
        ]
    },

    // =========================================================================
    // CASO 4 (Ventas): Cliente interesado que posterga; preparar un seguimiento útil
    // =========================================================================
    {
        id: 'sim-vta-04',
        title: 'Cruze Premier: Seguimiento estructurado de valor vs. abandono comercial',
        role: 'ventas',
        roleLabel: 'Ventas',
        estimatedMinutes: 9,
        context: `El cliente Martín (38 años, ingeniero de operaciones en una contratista de Pan American Energy) visitó la agencia el jueves a la mañana.
Probó un Chevrolet Cruze Premier 2020 sedán de color gris plata, con 52.000 km, publicado en $21.800.000.
Durante el test drive se mostró sumamente entusiasmado: elogió la insonorización, el motor turbo y los asistentes de seguridad activa (frenado autónomo).
Sin embargo, al bajarse del auto te dijo:
"Me encantó la verdad, pero es una decisión que tengo que consultar con mi señora este fin de semana. Dejame que lo hablo con ella y cualquier cosa te llamo".`,
        objective: 'Diseñar y ejecutar un plan de seguimiento comercial multicanal de alto valor agregado (no invasivo), que mantenga el interés activo, responda objeciones implícitas y guíe al cliente hacia el cierre.',
        availableInfo: [
            { label: 'Perfil de Martín', value: 'Perfil técnico y analítico. Valora datos concretos de consumo, seguridad familiar e historial de mantenimiento.' },
            { label: 'Datos del Cruze', value: 'Pasaporte de unidad completo en el CRM: todos los services en concesionario oficial Chevrolet de Comodoro, cubiertas con 75% de vida, informe de dominio limpio y listo para transferir.' },
            { label: 'Riesgo comercial', value: 'Si no se hace seguimiento, el 70% de los clientes se enfrían o compran en otra agencia. Si se hace spam ("hola qué decidiste?"), el cliente se bloquea.' }
        ],
        decisions: [
            {
                id: 'opt-a',
                title: 'No volver a contactarlo para "no molestarlo y esperar que llame solo"',
                action: 'No registrás ningún próximo contacto en el CRM y esperás que Martín te llame el lunes por su cuenta.',
                outcome: 'El fin de semana Martín navega por redes sociales, ve una publicación de un Vento en otra agencia de Comodoro, va a verlo el lunes a la tarde y lo compra. Cuando te acordás de llamarlo el viernes siguiente, te dice: "Ah disculpá, como no tuve novedades de ustedes pensé que no les interesaba y compré otro auto". Venta perdida por inacción.',
                score: 10,
                rubricBreakdown: {
                    escuchaIndagacion: 10,
                    defensaValor: 10,
                    respetoAutorizaciones: 50,
                    comunicacionProfesional: 10
                },
                feedback: 'Pésimo. El seguimiento profesional no es molestar; es acompañar la decisión de compra. "Dejar que el cliente llame solo" es regalar la comisión a la competencia.'
            },
            {
                id: 'opt-b',
                title: 'Bombardearlo con mensajes diarios de "¿qué decidiste?"',
                action: 'El viernes a las 8 am le mandás: "Hola Martín, ¿lo hablaste con tu señora?". El sábado a las 11 am le mandás: "¿Pudieron definir?". El domingo le mandás un audio diciendo que hay otro interesado que viene el lunes.',
                outcome: 'Martín se siente acosado y percibe una falsa urgencia desesperada. Te responde con un escueto "te dije que te avisaba cualquier cosa, por favor no me escribas más" y te bloquea en WhatsApp.',
                score: 25,
                rubricBreakdown: {
                    escuchaIndagacion: 20,
                    defensaValor: 30,
                    respetoAutorizaciones: 50,
                    comunicacionProfesional: 20
                },
                feedback: 'Muy mala práctica. El spam desesperado aleja a los clientes profesionales y destruye la imagen de marca de AutoSporting.'
            },
            {
                id: 'opt-c',
                title: 'Plan de seguimiento con contenido de valor personalizado y propuesta de visita familiar',
                action: 'El viernes a las 16 hs le enviás un mensaje personalizado: "Hola Martín, un gusto saludarte. Como me comentaste que valoraban mucho la seguridad y el confort para la familia, te grabé este video corto (1 minuto) mostrando el espacio del baúl y el anclaje Isofix del Cruze, junto con la foto de la libreta de services oficiales al día. Para que tu señora lo pueda conocer sin ningún compromiso, el sábado a la mañana tenemos café listo en la sucursal: si quieren pasar unos minutos a dar una vuelta corta juntos, les dejo el auto reservado para ustedes a las 11 hs. ¡Que tengan un excelente fin de semana!".',
                outcome: 'Martín recibe el mensaje con agrado porque le aporta información útil que su señora quería ver (espacio de baúl y seguridad de sillitas infantiles). El sábado a las 11 hs asisten juntos a la agencia; su señora queda encantada con el confort del auto. Firman la reserva ese mismo mediodía con una experiencia de compra impecable.',
                score: 100,
                rubricBreakdown: {
                    escuchaIndagacion: 100,
                    defensaValor: 100,
                    respetoAutorizaciones: 100,
                    comunicacionProfesional: 100
                },
                feedback: '¡Magistral! Demostró escucha activa recordando las prioridades familiares de Martín, aportó contenido visual de valor sin presionar y facilitó el siguiente paso de forma cálida y profesional.'
            }
        ],
        rubricCriteria: [
            { name: 'Oportunidad y cadencia', description: 'Elección del momento oportuno para el contacto sin ser invasivo.' },
            { name: 'Aporte de valor en el seguimiento', description: 'Envío de información útil (video, ficha técnica, pasaporte de services) en lugar de preguntas vacías.' },
            { name: 'Facilitación del próximo paso', description: 'Invitación a un test drive familiar que derriba la objeción de consulta.' },
            { name: 'Registro en el CRM', description: 'Programación de recordatorios y notas detalladas en la oportunidad comercial.' }
        ]
    },

    // =========================================================================
    // CASO 5 (Gestoría): Expediente con datos contradictorios y presión por entrega
    // =========================================================================
    {
        id: 'sim-ges-01',
        title: 'Discrepancia en nombres y falta de asentimiento conyugal bajo presión',
        role: 'gestoria',
        roleLabel: 'Gestoría',
        estimatedMinutes: 10,
        context: `El vendedor Lucas entra apurado a la oficina de Gestoría el miércoles a las 11:30 hs:
"Chicos, por favor, autorícenme la entrega de la Renault Duster 2018 para hoy a las 15 hs. El comprador es Juan Carlos Pérez, pagó todo de contado y me está volviendo loco porque tiene que viajar a Perito Moreno hoy a la tarde".
Al abrir el expediente en el CRM y auditar los documentos físicos, detectas dos anomalías graves:
1. En el Boleto de Compraventa y en el DNI figura "Juan Carlos Pérez", pero en la Solicitud Tipo 08 digital precargada y en la constancia de CUIT figura únicamente "Juan C. Pérez", y la firma del 08 certificada por escribano no consigna el número de DNI en el texto de la certificación notarial.
2. La Duster que entrega en permuta es de un titular que figura como CASADO en el Título Digital, pero en el 08 de la toma NO FIRMÓ la cónyuge ni consta acreditación de bien propio o separación de bienes.`,
        objective: 'Auditar con rigurosidad las inconsistencias registrales, resistir la presión comercial interna, fundamentar el bloqueo técnico en normativas de la DNRPA y coordinar la subsanación urgente protegiendo a la agencia.',
        availableInfo: [
            { label: 'Normativa DNRPA aplicable', value: 'Digesto de Normas Técnico-Registrales Título I Cap. V (Certificaciones de firmas) y Código Civil y Comercial Art. 470 (Asentimiento conyugal para disponer de bienes registrables gananciales).' },
            { label: 'Consecuencia de ignorar el error', value: 'El Registro Seccional observará y rechazará la transferencia de la Duster; la permuta quedará trabada sin poder transferirse y la cónyuge del titular anterior puede reclamar judicialmente la nulidad de la venta del usado.' },
            { label: 'Acción de subsanación posible', value: 'Contactar de urgencia a la escribanía para emitir acta notarial complementaria que aclare el DNI del comprador y citar a la cónyuge de la permuta para certificar el asentimiento en el Registro local hoy mismo.' }
        ],
        decisions: [
            {
                id: 'opt-a',
                title: 'Ceder a los gritos del vendedor y autorizar la entrega en el CRM',
                action: 'Ponés el expediente como CONFORME en el CRM y le decís a Lucas: "Bueno, entregala, total en el Registro de Sarmiento son amigos y capaz no se dan cuenta de la firma ni del cónyuge".',
                outcome: 'Desastre registral. El Registro Seccional N° 2 rechaza la transferencia a los 4 días por defecto formal insubsanable de firma y falta de asentimiento. El titular de la permuta entra en litigio de divorcio contencioso y la esposa traba una medida cautelar sobre el vehículo. AutoSporting queda demandada judicialmente y debe pagar costas de abogados y resarcimiento.',
                score: 0,
                rubricBreakdown: {
                    deteccionInconsistencias: 30,
                    aplicacionNormativa: 0,
                    resistenciaPresion: 0,
                    coordinacionSubsanacion: 0
                },
                feedback: 'Inadmisible. Gestoría es el filtro legal de la agencia. Ceder ante el apuro de un vendedor destruye la seguridad jurídica del negocio.'
            },
            {
                id: 'opt-b',
                title: 'Bloquear el expediente en el CRM, explicar los artículos legales y activar subsanación urgente',
                action: 'Mantenés la calma y le decís a Lucas con claridad: "Lucas, entiendo el apuro de tu cliente, pero este expediente tiene dos bloqueos legales que impedirían que el auto sea legalmente suyo y dejarían a AutoSporting con un problema judicial grave: falta el DNI en la certificación notarial y la permuta no tiene la firma de la cónyuge exigida por el Art. 470 del Código Civil. Si lo dejamos viajar así, el cliente no va a poder transferir y el seguro no le va a cubrir nada. Hacemos esto ya mismo: 1) Llamo a la escribanía para que nos envíen el acta notarial rectificatoria en 45 minutos. 2) Citemos a la cónyuge de la permuta que vive acá en Km 3 para que firme el asentimiento en el Registro antes de las 13 hs. Si coordinamos esto juntos, a las 16 hs el cliente se va con la Duster 100% legal y sin riesgos".',
                outcome: 'Lucas comprende la gravedad de las observaciones y colabora: llama de inmediato a la cónyuge para que concurra a firmar. La escribanía subsana la certificación a las 12:45 hs. A las 15:30 hs el legajo ingresa al Registro sin observaciones y se libera la entrega física con respaldo impecable. El cliente viaja seguro y la agencia queda protegida.',
                score: 100,
                rubricBreakdown: {
                    deteccionInconsistencias: 100,
                    aplicacionNormativa: 100,
                    resistenciaPresion: 100,
                    coordinacionSubsanacion: 100
                },
                feedback: '¡Excelente gestión profesional! No se limitó a decir "no se puede", sino que explicó el fundamento legal con solvencia y lideró el plan de subsanación de forma proactiva.'
            },
            {
                id: 'opt-c',
                title: 'Echar al vendedor de la oficina y desentenderse del cliente',
                action: 'Le gritás a Lucas que no sabés nada de su cliente y que no te moleste hasta la semana que viene.',
                outcome: 'Se genera una pelea a los gritos en el pasillo que escuchan los clientes. El cliente Juan Carlos Pérez cancela la compra por la falta de profesionalismo del equipo.',
                score: 30,
                rubricBreakdown: {
                    deteccionInconsistencias: 80,
                    aplicacionNormativa: 50,
                    resistenciaPresion: 20,
                    coordinacionSubsanacion: 0
                },
                feedback: 'Muy mal manejo interpersonal. La rigurosidad técnica debe comunicarse con respeto y espíritu de equipo.'
            }
        ],
        rubricCriteria: [
            { name: 'Detección de inconsistencias', description: 'Identificación de errores en certificaciones notariales y faltantes de asentimiento conyugal.' },
            { name: 'Aplicación normativa', description: 'Fundamentación en el Digesto DNRPA y el Código Civil y Comercial.' },
            { name: 'Resistencia a la presión comercial', description: 'Firmeza para no ceder ante la urgencia infundada del vendedor.' },
            { name: 'Capacidad de resolución y subsanación', description: 'Liderazgo para destrabar el expediente por las vías legales en el menor tiempo.' }
        ]
    },

    // =========================================================================
    // CASO 6 (Facturación): Pago sin validar y diferencias entre operación y documentación
    // =========================================================================
    {
        id: 'sim-adm-01',
        title: 'Captura de transferencia no acreditada y alícuota errónea en borrador',
        role: 'administracion',
        roleLabel: 'Administración y Facturación',
        estimatedMinutes: 10,
        context: `Es viernes 28 a las 17:00 hs. Cierre de mes contable en AutoSporting.
El vendedor Gonzalo te envía un mensaje urgente por el chat interno:
"Facturame ya la venta de la Ford Ranger 2019 de la consignación de don Méndez. El cliente 'Petróleo & Servicios SRL' me mandó la captura de transferencia por los $26.000.000 totales desde el Banco Macro. Si la facturás hoy, llegamos al objetivo mensual del equipo. ¡Emití la Factura A y dale el OK a entrega que el cliente está esperando afuera con el chofer!".
Al abrir la orden de venta borrador en el CRM y verificar el extracto bancario, encontrás dos problemas críticos:
1. Al ingresar al home banking del Banco Galicia de AutoSporting, los $26.000.000 NO figuran acreditados ni en saldo disponible; solo hay un movimiento de $500.000 de otra operación. La captura que mandó el vendedor parece una orden de transferencia programada para el lunes hábil siguiente.
2. En el borrador del CRM, Gonzalo cargó la operación como si fuera una venta propia de stock por $26.000.000 + IVA total ($5.460.000), cuando en realidad es un vehículo en CONSIGNACIÓN de un particular donde AutoSporting solo debe facturar su comisión pactada del 4% ($1.040.000 IVA incluido).`,
        objective: 'Aplicar estrictamente la política de conciliación previa de fondos antes de validar cobros y auditar el encuadre tributario correcto de operaciones de consignación vs. stock propio antes de emitir comprobantes electrónicos con CAE.',
        availableInfo: [
            { label: 'Extracto bancario real', value: 'Saldo bancario sin impacto de los $26.000.000. Riesgo de comprobante cancelable o no compensado.' },
            { label: 'Régimen fiscal de consignaciones', value: 'En vehículos tomados en consignación por cuenta y orden de terceros, la agencia NO es propietaria de la unidad; factura únicamente la comisión por intermediación comercial con IVA sobre dicha comisión.' },
            { label: 'Impacto impositivo del error', value: 'Si se emite Factura A por el total de 26 millones, la agencia genera un débito fiscal de IVA monstruoso e indebido de más de 5 millones de pesos y una base imponible ficticia de Ingresos Brutos en Chubut.' }
        ],
        decisions: [
            {
                id: 'opt-a',
                title: 'Emitir la Factura A por el total y dar el OK de cobro para cumplir la meta del mes',
                action: 'Presionás "Emitir Factura Electrónica con CAE" por $26.000.000 en ARCA y le das el OK a Gonzalo para que el chofer se lleve la Ranger.',
                outcome: 'Quiebre financiero y fiscal. El lunes el dinero nunca entra a la cuenta porque la transferencia era programada y fue anulada por la empresa antes del clearing. Además, ARCA reclama el pago de los $5.460.000 de IVA devengado de la factura emitida. AutoSporting se queda sin la camioneta del consignatario Méndez (quien le inicia una demanda penal a la agencia por defraudación) y con una deuda tributaria ilegítima millonaria. Dirección interviene el área de Administración y se despiden a los responsables.',
                score: 0,
                rubricBreakdown: {
                    conciliacionBancaria: 0,
                    encuadreTributario: 0,
                    auditoriaPrevia: 0,
                    comunicacionProfesional: 0
                },
                feedback: 'Fraude y negligencia total. Violar la regla de acreditación efectiva bancaria y el encuadre de consignaciones destruye la continuidad de la empresa.'
            },
            {
                id: 'opt-b',
                title: 'Frenar la facturación, no liberar la entrega y corregir el encuadre con el contador',
                action: 'Detenés de inmediato la emisión en el CRM, mantenés el estado en "PENDIENTE DE ACREDITACIÓN" y le comunicás formalmente a Gonzalo y a la Dirección: "Gonzalo, la entrega y la facturación quedan frenadas por dos razones insoslayables: 1) Los 26 millones no están acreditados en la cuenta bancaria de la agencia; la captura es una orden programada que no acredita fondos. No se entrega la llave sin dinero real en cuenta. 2) La camioneta es una consignación de don Méndez: si facturamos 26 millones en Factura A, le generamos a la agencia una deuda fiscal ficticia de 5 millones de IVA. La factura a emitir debe ser únicamente por nuestra comisión de intermediación de $1.040.000 IVA incluido contra liquidación de consignación. Reviso el borrador ahora con el contador para dejarlo listo, y el lunes a primera hora, cuando el Macro acredite los fondos en el Galicia, emitimos la comisión y liberamos la camioneta".',
                outcome: 'Gonzalo se da cuenta del error tributario y admite que no había verificado la acreditación real en el banco. Hablan con el comprador de Petróleo & Servicios SRL con total franqueza profesional: el cliente entiende que al ser una transferencia interbancaria de gran volumen debe aguardarse el clearing. El lunes a las 9:30 hs impactan los fondos en el extracto, se emite la factura de comisión con CAE correcto y se entrega la Ranger sin contingencias fiscales ni de caja.',
                score: 100,
                rubricBreakdown: {
                    conciliacionBancaria: 100,
                    encuadreTributario: 100,
                    auditoriaPrevia: 100,
                    comunicacionProfesional: 100
                },
                feedback: '¡Excelente actuación técnica! Salvó a la agencia de una pérdida de 26 millones de pesos y de un error fiscal devastador. Demostró templanza, apego irrestricto al control interno y claridad tributaria.'
            },
            {
                id: 'opt-c',
                title: 'Emitir la factura pero no entregar el auto hasta el lunes',
                action: 'Emitís la Factura A por los 26 millones con CAE en ARCA para que cuente para la meta del mes, pero le decís a Gonzalo que no entregue la camioneta hasta que impacte la plata.',
                outcome: 'Aunque protegiste la custodia física de la camioneta, el error tributario ya está consumado: la factura emitida devengó el impuesto ante ARCA/AFIP y el lunes deberán emitir una Nota de Crédito A compleja, justificando ante el fisco la anulación por encuadre erróneo de consignación.',
                score: 45,
                rubricBreakdown: {
                    conciliacionBancaria: 60,
                    encuadreTributario: 20,
                    auditoriaPrevia: 40,
                    comunicacionProfesional: 60
                },
                feedback: 'Regular. Evitó la pérdida del vehículo, pero falló gravemente en el control del encuadre tributario antes de emitir comprobantes con CAE.'
            }
        ],
        rubricCriteria: [
            { name: 'Conciliación bancaria real', description: 'Control de extracto bancario oficial y rechazo de órdenes programadas o capturas no acreditadas.' },
            { name: 'Encuadre tributario de consignación', description: 'Distinción impositiva entre venta de stock propio y comisión por cuenta de terceros.' },
            { name: 'Auditoría previa a la emisión de CAE', description: 'Control de consistencia de montos, partes y alícuotas antes de formalizar la factura en ARCA.' },
            { name: 'Comunicación y trazabilidad', description: 'Notificación clara y fundamentada de los bloqueos a Ventas y Dirección.' }
        ]
    }
];

export const getSimulationById = id => ROLE_SIMULATIONS.find(s => s.id === id);
export const getSimulationsByRole = role => role === 'todos'
    ? ROLE_SIMULATIONS
    : ROLE_SIMULATIONS.filter(s => s.role === role);
