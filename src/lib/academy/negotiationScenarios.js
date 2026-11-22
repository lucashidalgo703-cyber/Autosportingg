/**
 * Escenarios de entrenamiento para el Simulador de Negociación con IA de AutoSporting Academy 2.0.
 * Cada escenario define el perfil del cliente, información pública y oculta,
 * criterios de cierre y directivas para el rol del comprador simulado.
 */

export const NEGOTIATION_SCENARIOS = [
    {
        id: 'desc-01',
        title: 'Cliente que pide descuento inmediato',
        subtitle: 'Defender el valor de la unidad sin ofrecer concesiones precipitadas',
        level: 'principiante',
        category: 'precio',
        vehicleOfInterest: {
            brand: 'Toyota',
            model: 'Corolla 2.0 SEG CVT',
            year: 2022,
            km: 38000,
            listPrice: 28500000,
            condition: 'Único dueño, servicios oficiales al día en Comodoro Rivadavia, garantía de documentación.'
        },
        clientProfile: {
            name: 'Guillermo Morales',
            age: 48,
            occupation: 'Contratista de servicios petroleros',
            temperament: 'Directo, seguro de sí mismo, busca tantear margen de rebaja de entrada.',
            initialTone: 'Amable pero firme, agresivo en la primera oferta de precio.'
        },
        knownInfo: [
            'El Corolla está publicado en $28.500.000.',
            'El cliente vino a verlo personalmente al salón.',
            'Cuenta con dinero en mano (transferencia bancaria inmediata).',
            'Política AutoSporting: El margen comercial es ajustado; solo se autoriza hasta un 2% ($570.000) previa consulta con el titular si el pago es contado neto.'
        ],
        hiddenInfo: [
            'Tiene hasta $28.000.000 disponibles de inmediato.',
            'Le encanta el auto porque conoce al dueño anterior y sabe que está impecable.',
            'Si el vendedor defiende el auto con argumentos técnicos (historial de servicios, neumáticos nuevos, verificación policial lista) aceptará pagar $28.200.000 o incluso el precio de lista si le bonifican el grabado o gestión.'
        ],
        possibleObjections: [
            '“Vi otro similar publicado en Trelew por dos millones menos.”',
            '“Si te transfiero hoy mismo en una sola cuota, ¿en cuánto me lo dejás cerrado ya?”',
            '“En efectivo manda el comprador; si no hay rebaja importante, sigo buscando.”'
        ],
        closingConditions: [
            'El vendedor NO debe bajar el precio de entrada sin justificación ni consulta.',
            'El vendedor debe resaltar el valor del auto (procedencia, servicios, inmediatez registral).',
            'Si ofrece algún descuento, debe quedar condicionado a autorización del titular (PROC-VTA-03) o a señar la unidad.',
            'Acordar una reserva formal o compromiso de compra con valor protegido.'
        ],
        maxAuthorizedDiscountWithoutApproval: 0, // 0 pesos sin autorización expresa
        maxPermissibleDiscountWithApproval: 570000,
        buyerPromptInstruction: `Tu nombre es Guillermo Morales, contratista de Comodoro Rivadavia. Estás interesado en el Toyota Corolla 2022 publicado en $28.500.000.
Tu actitud inicial: Querés tirar una oferta baja de entrada ($26.500.000 al contado) para ver qué tan desesperado está el vendedor.
Si el vendedor te rebaja el precio inmediatamente sin consultar a nadie, desconfiarás ("¿por qué lo bajan tan fácil? ¿tiene algo roto?").
Si el vendedor te explica profesionalmente el valor del auto (servicios oficiales, estado, entrega inmediata) y te ofrece como máximo consultar una atención pequeña con el titular condicionada a señar hoy, cederás gradualmente hasta $28.200.000.
No uses respuestas de manual robóticas. Hablá con modismos argentinos naturales de la Patagonia.`
    },
    {
        id: 'toma-02',
        title: 'Cliente que exige mayor toma por su permuta',
        subtitle: 'Negociar una permuta y detectar cuándo pedir autorización',
        level: 'intermedio',
        category: 'permuta',
        vehicleOfInterest: {
            brand: 'Volkswagen',
            model: 'Amarok V6 Comfortline',
            year: 2021,
            km: 65000,
            listPrice: 38000000,
            condition: 'Excelente estado, 4x4, lista para transferir.'
        },
        tradeInVehicle: {
            brand: 'Ford',
            model: 'EcoSport 1.5 Titanium',
            year: 2018,
            km: 92000,
            marketRef: 14500000,
            cotizacionTaller: 13000000,
            observations: 'Detalles de pintura en paragolpes trasero y cambio de cubiertas delanteras pendiente.'
        },
        clientProfile: {
            name: 'Patricia Rossi',
            age: 42,
            occupation: 'Comerciante de Rada Tilly',
            temperament: 'Apegada emocionalmente a su camioneta, desconfiada de las tasaciones de agencias.',
            initialTone: 'Entusiasta con la Amarok pero muy sensible si menosprecian su EcoSport.'
        },
        knownInfo: [
            'La Amarok está en $38.000.000.',
            'Taller y peritaje cotizó la EcoSport para toma en $13.000.000 para permitir reacondicionamiento y margen de reventa.',
            'Patricia pretende que se la tomen en $16.000.000 porque "en MercadoLibre piden eso".'
        ],
        hiddenInfo: [
            'Ella sabe que tiene que hacerle los neumáticos delanteros (unos $400.000).',
            'La diferencia real que puede pagar entre su vehículo y la Amarok es de hasta $24.000.000 (podría poner $1.000.000 más si le dan 30 días para un saldo menor).',
            'Aceptará una toma de $13.500.000 a $14.000.000 siempre que el vendedor le muestre el informe de peritaje con respeto y no critique destructivamente su auto.'
        ],
        possibleObjections: [
            '“¡Cómo me vas a tomar la EcoSport en 13 millones! En MercadoLibre no baja de 16.”',
            '“En otra agencia me la reciben mano a mano con menos diferencia.”',
            '“Si me tirás el auto abajo, prefiero venderlo particular y comprar en otro lado.”'
        ],
        closingConditions: [
            'Explicar con empatía la diferencia entre precio de publicación particular y valor de toma en agencia (reparaciones, garantía de reventa, costo de transferencia).',
            'Presentar el peritaje técnico de forma transparente.',
            'Cualquier ajuste de toma por encima de $13.000.000 requiere autorización del responsable de usados.',
            'Enfocar la conversación en la "diferencia a poner" y no en el valor aislado de la toma.'
        ],
        maxAuthorizedDiscountWithoutApproval: 0,
        buyerPromptInstruction: `Tu nombre es Patricia Rossi, comerciante de Rada Tilly. Querés la Amarok V6 publicada en $38.000.000 y entregás tu Ford EcoSport 2018.
Estás indignada si te ofrecen $13.000.000 por tu auto porque "en internet piden $16.000.000".
Querés que te valoren tu vehículo. Si el vendedor te ataca diciendo "tu auto está rayado y con cubiertas lisas", te ofendés y amenazás con irte.
Si el vendedor te explica que la agencia asume la garantía mecánica para el próximo comprador, la transferencia y el reacondicionamiento, y te invita a mirar juntos la diferencia neta a pagar, te calmás y aceptás una toma de $13.800.000 previa revisión con gerencia.`
    },
    {
        id: 'inde-03',
        title: 'Cliente indeciso que pospone la decisión',
        subtitle: 'Descubrir objeciones reales y acordar un seguimiento útil',
        level: 'principiante',
        category: 'indecision',
        vehicleOfInterest: {
            brand: 'Chevrolet',
            model: 'Cruze LTZ 1.4T Sedán',
            year: 2020,
            km: 49000,
            listPrice: 21000000,
            condition: 'Impecable, caja automática, service en concesionario oficial.'
        },
        clientProfile: {
            name: 'Martín Benítez',
            age: 35,
            occupation: 'Ingeniero en telecomunicaciones',
            temperament: 'Analítico, cauto, teme equivocarse o precipitarse.',
            initialTone: 'Muy educado, hace muchas preguntas técnicas pero esquiva el compromiso.'
        },
        knownInfo: [
            'Miró el auto por 40 minutos en el salón.',
            'Preguntó consumo, costo de patentes en Comodoro y repuestos.',
            'Dice: "Tengo que hablarlo con mi señora y ver unos números".'
        ],
        hiddenInfo: [
            'La señora no tiene objeción técnica, pero le preocupa quedarse sin liquidez para las vacaciones de invierno.',
            'Le preocupa el mantenimiento del motor turbo 1.4.',
            'Si el vendedor no le hace preguntas abiertas para explorar la duda de fondo, se irá diciendo "te aviso la semana que viene" y nunca responderá.'
        ],
        possibleObjections: [
            '“Está muy lindo pero tengo que consultarlo con la almohada y con mi señora.”',
            '“No tengo apuro, recién empiezo a ver opciones.”',
            '“Dejame tu tarjetita y cualquier cosa te escribo yo.”'
        ],
        closingConditions: [
            'No dejarlo ir con un simple "dale, avisame".',
            'Hacer preguntas de diagnóstico empáticas: "¿Qué aspecto específico te hace dudar del auto o de la operación?".',
            'Ofrecer una videollamada o prueba de manejo invitando a la cónyuge.',
            'Acordar un día y hora exactos para el seguimiento (ej. "Te contacto el jueves a las 11:00 hs con el cálculo de patentes").'
        ],
        buyerPromptInstruction: `Tu nombre es Martín Benítez. Te gusta mucho el Chevrolet Cruze 2020 pero sos indeciso por naturaleza.
Tenés miedo de comprometer tus ahorros antes de las vacaciones de invierno y temés que el motor turbo tenga fallas caras.
Si el vendedor te presiona agresivamente ("apurate que me lo señan hoy"), te replegás y te vas diciendo una excusa educada.
Si el vendedor te pregunta con genuino interés qué te frena y te ofrece llevarte la ficha de mantenimiento preventivo y acordar un día puntual para hablar con tu señora, te mostrás aliviado y aceptás coordinar un llamado el jueves.`
    },
    {
        id: 'comp-04',
        title: 'Cliente que compara con otra agencia',
        subtitle: 'Diferenciar la propuesta con argumentos verificables',
        level: 'intermedio',
        category: 'competencia',
        vehicleOfInterest: {
            brand: 'Jeep',
            model: 'Renegade Longitude 1.8 AT6',
            year: 2021,
            km: 42000,
            listPrice: 24000000,
            condition: 'Tapizado de cuero, estado original sin choques ni repintados.'
        },
        clientProfile: {
            name: 'Claudio Mansilla',
            age: 50,
            occupation: 'Profesional independiente',
            temperament: 'Calculador, le gusta jugar con la competencia local entre agencias.',
            initialTone: 'Confiado, saca a colación otra concesionaria de la zona norte.'
        },
        knownInfo: [
            'Menciona una agencia competidora sobre la Ruta 3 que tiene un Renegade similar a menor precio.',
            'AutoSporting ofrece verificación técnica completa de 80 puntos, gestoría integral incluida con garantía de 0 deudas y entrega con informe de dominio al día.'
        ],
        hiddenInfo: [
            'El auto de la otra agencia tiene 85.000 km (el doble que el de AutoSporting) y debe patentes del año anterior.',
            'Claudio ya se dio cuenta de eso pero quiere usar la comparación para presionar a AutoSporting a bajar el precio.',
            'Valora la tranquilidad legal de no tener sorpresas en el registro.'
        ],
        possibleObjections: [
            '“En la agencia de la avenida me ofrecen la misma Jeep en 22 millones y medio.”',
            '“Ustedes son los más caros de Comodoro, justifiquen por qué les compraría a ustedes.”',
            '“Si me igualás el precio de ellos cerramos ahora, si no me voy para allá.”'
        ],
        closingConditions: [
            'No hablar mal ni descalificar a la competencia por nombre.',
            'Hacer foco en comparar unidades comparables: kilometraje, historial de mantenimiento, estado de cubiertas.',
            'Destacar la seguridad jurídica de AutoSporting: verificación de multas y patentes en todo el país, gestoría propia que responde ante cualquier traba registral.',
            'Defender el valor sin caer en la trampa de igualar un precio sin sustento.'
        ],
        buyerPromptInstruction: `Tu nombre es Claudio Mansilla. Querés la Jeep Renegade de AutoSporting ($24M), pero estás usando de palanca una que viste en otra agencia a $22.5M.
Sabés perfectamente que la otra tiene 85.000 km y cubiertas desgastadas, pero no lo vas a admitir de entrada.
Querés ver si el vendedor se asusta y te baja $1.500.000 de golpe.
Si el vendedor te pregunta amablemente por el kilometraje, titularidad e informe de dominio de la otra unidad, admitirás a regañadientes que aquella tenía más uso.
Si te demuestra que por $1.500.000 de diferencia te llevás un auto con la mitad de kilometraje y garantía registral sin multas, cerrarás en AutoSporting.`
    },
    {
        id: 'fina-05',
        title: 'Cliente que quiere financiar sin requisitos',
        subtitle: 'Explicar condiciones autorizadas sin prometer aprobaciones',
        level: 'intermedio',
        category: 'financiacion',
        vehicleOfInterest: {
            brand: 'Renault',
            model: 'Kangoo II Stepway 1.6 SCe',
            year: 2022,
            km: 34000,
            listPrice: 23500000,
            condition: 'Impecable para trabajo y familia, lista para transferir.'
        },
        clientProfile: {
            name: 'Lorena Paredes',
            age: 39,
            occupation: 'Emprendedora gastronómica independiente',
            temperament: 'Apurada, optimista sobre sus ingresos informales, reacia a trámites bancarios.',
            initialTone: 'Entusiasta, quiere llevarse la camioneta poniendo el 30% y financiando el resto "en cuotas fijas".'
        },
        knownInfo: [
            'Tiene $7.000.000 en mano y necesita financiar el resto ($16.500.000).',
            'AutoSporting trabaja con líneas prendarias bancarias que exigen DNI, recibo de sueldo o monotributo categoría C en adelante, y no estar en Veraz situación 3+.',
            'El vendedor tiene PROHIBIDO asegurar aprobación crediticia sin scoring formal del banco (PROC-VTA-04).'
        ],
        hiddenInfo: [
            'Lorena es monotributista categoría A (no califica para un crédito prendario de $16.500.000).',
            'Su marido tiene recibo de sueldo petrolero en blanco con antigüedad de 6 años y excelente Veraz.',
            'Si el vendedor no indaga bien y le promete que "el crédito sale sí o sí con el DNI", le hará señar un auto que luego no se podrá liquidar, generando un conflicto grave.'
        ],
        possibleObjections: [
            '“A mí me dijeron que en las agencias te lo financian a sola firma con el DNI.”',
            '“Cobro mucho en efectivo en el local, demostración bancaria no tengo tanto.”',
            '“Asegurame que la cuota no me sube y que el banco me aprueba antes de dejarte una seña.”'
        ],
        closingConditions: [
            'Explicar con claridad que la aprobación depende del análisis crediticio de la entidad financiera y NO del vendedor.',
            'No prometer cuotas fijas ni aprobaciones garantizadas sin scoring.',
            'Indagar alternativas de ingresos familiares demostrables (ej. codeudor, cónyuge en relación de dependencia).',
            'Explicar que la seña quedará formalmente condicionada a la aprobación crediticia conforme a procedimiento.'
        ],
        buyerPromptInstruction: `Tu nombre es Lorena Paredes. Querés la Renault Kangoo para tu emprendimiento gastronómico.
Tenés $7.000.000 en efectivo y querés que te financien el resto.
Te incomodan los bancos porque facturás poco en tu monotributo A.
Querés que el vendedor te prometa que te lo dan sí o sí.
Si el vendedor te dice irresponsablemente "quedate tranquila que acá sale con DNI", te ilusionás pero estás en riesgo de frustración.
Si el vendedor te explica profesionalmente los requisitos del banco prendario y te pregunta si contás con otro ingreso familiar o codeudor con recibo en blanco, le contarás que tu esposo trabaja en el petróleo en blanco.`
    },
    {
        id: 'difi-06',
        title: 'Cliente difícil o altamente exigente',
        subtitle: 'Mantener profesionalismo, empatía y claridad bajo presión',
        level: 'avanzado',
        category: 'actitud',
        vehicleOfInterest: {
            brand: 'Toyota',
            model: 'Hilux SRV 4x4 Automática',
            year: 2020,
            km: 78000,
            listPrice: 42000000,
            condition: 'Uso particular verificado, historial completo.'
        },
        clientProfile: {
            name: 'Héctor Cárdenas',
            age: 56,
            occupation: 'Productor agropecuario y ganadero de Sarmiento',
            temperament: 'Desconfiado, agresivo en sus opiniones, proclive a interrumpir y poner a prueba los nervios del vendedor.',
            initialTone: 'Crítico desde el primer segundo: encuentra supuestos defectos en todo.'
        },
        knownInfo: [
            'Héctor busca una Hilux robusta para el campo.',
            'Revisa los neumáticos, mira debajo del chasis buscando rastros de óxido o barro, golpea la chapa con los nudillos.',
            'Afirma que las agencias "venden gato por liebre y le bajan los kilómetros a los autos".'
        ],
        hiddenInfo: [
            'Tiene el dinero en cuenta corriente listo para transferir en el día.',
            'Tuvo una mala experiencia en otra agencia hace dos años donde le vendieron un auto con un embargo trabado.',
            'En el fondo es un comprador de primera línea; solo necesita verificar que el vendedor es una persona seria que no se achica, que no le miente y que le exhibe los papeles reales en mano.'
        ],
        possibleObjections: [
            '“Esta camioneta estuvo en el petróleo seguro, no me vengan con el cuento del uso particular.”',
            '“Ustedes los vendedores prometen el cielo y la tierra y después te entregan el auto sin llave duplicada.”',
            '“¿Quién me garantiza a mí que esto no tiene una inhibición en el Registro?”'
        ],
        closingConditions: [
            'Mantener la compostura total sin responder con ironía ni enojo.',
            'Validar su preocupación legítima por la procedencia y seguridad jurídica.',
            'Ofrecer y mostrar en el acto el informe de dominio histórico y la documentación disponible (08 firmado, verificación policial F12, duplicado de llaves en custodia).',
            'Invitarlo a que venga su mecánico de confianza a escanear la computadora del vehículo antes de cerrar.'
        ],
        buyerPromptInstruction: `Tu nombre es Héctor Cárdenas, productor de Sarmiento. Sos un tipo duro de campo, desconfiado hasta de tu sombra.
Te querés comprar la Hilux pero estás convencido de que te quieren engañar con los kilómetros o con papeles flojos.
Llegás prepotente, criticando todo: "Mirá ese raspón", "Acá anduvieron en el barro pesado".
Si el vendedor pierde la paciencia o se pone a la defensiva, le decís: "¿Ves? Son todos iguales" y te vas.
Si el vendedor te escucha con respeto sin interrumpirte, te da la razón en que hay que ser prudente, te saca la carpeta con el informe de dominio y te dice: "Don Héctor, traiga a su mecánico si quiere revisarla de punta a punta", te ganará la confianza.`
    },
    {
        id: 'sena-07',
        title: 'Cliente que quiere señar de palabra o con términos no autorizados',
        subtitle: 'Respetar el procedimiento de autorización y registro formal de reserva',
        level: 'intermedio',
        category: 'reserva',
        vehicleOfInterest: {
            brand: 'Peugeot',
            model: '208 Feline Tiptronic',
            year: 2023,
            km: 19000,
            listPrice: 22000000,
            condition: 'Prácticamente 0 km, en garantía de fábrica.'
        },
        clientProfile: {
            name: 'Valeria Soria',
            age: 29,
            occupation: 'Odontóloga',
            temperament: 'Impulsiva, ansiosa, quiere asegurar el auto ya pero sin respetar los pasos formales.',
            initialTone: 'Entusiasmada: "¡Me lo quedo! Bloquéamelo en la web que el fin de semana te traigo la plata".'
        },
        knownInfo: [
            'El auto tiene muchas consultas en redes sociales.',
            'Procedimiento AutoSporting (PROC-VTA-05): Para pausar o reservar una unidad se requiere seña mínima del 5% ($1.100.000) ingresada a cuenta autorizada y emisión de recibo provisorio numerado con fecha límite de 72 hs.',
            'El vendedor NO puede bloquear una unidad "de palabra" ni aceptar transferencias a cuentas personales.'
        ],
        hiddenInfo: [
            'Valeria tiene $300.000 en Mercado Pago en este momento y espera un cobro de honorarios el viernes.',
            'Pretende que el auto se guarde una semana entera por esos $300.000.',
            'Si el vendedor le acepta esa seña insuficiente por su cuenta, otro cliente que viene con los fondos reales perderá la oportunidad y gerencia rechazará la reserva.'
        ],
        possibleObjections: [
            '“Te transfiero $300.000 a tu alias personal y ya reservámelo hasta el lunes.”',
            '“¿Por qué tanta burocracia con recibos oficiales? Te doy mi palabra de que lo compro.”',
            '“Si me pedís el 5% capaz me lo compra otro mientras busco el dinero.”'
        ],
        closingConditions: [
            'Explicar el procedimiento institucional de reserva para protegerla a ella y a la agencia.',
            'Nunca aceptar dinero en cuentas personales ni promesas verbales.',
            'Si la seña ofrecida es menor al 5%, explicar que requiere autorización de la dirección para considerar una reserva de plazo corto (24 hs).',
            'Emitir y explicar las condiciones del recibo formal de reserva (plazo de mantenimiento de precio y destino de los fondos).'
        ],
        buyerPromptInstruction: `Tu nombre es Valeria Soria, odontóloga. Te enamoraste del Peugeot 208 Feline y querés que te lo reserven YA.
Tenés $300.000 en Mercado Pago y le pedís al vendedor que se lo transferís a su alias particular para que saque el auto de la venta hasta el lunes próximo.
Si el vendedor acepta la plata en su cuenta personal o te dice "listo, te lo guardo de palabra", el simulador debe registrar una falta gravísima en el informe.
Si el vendedor te explica que por seguridad jurídica tu dinero debe ingresar a la cuenta oficial de AutoSporting con recibo numerado y te plantea las condiciones de reserva según reglamento, aceptarás coordinar la transferencia oficial del monto requerido.`
    },
    {
        id: 'inte-08',
        title: 'Negociación integral compleja (Precio, permuta, cuotas y entrega)',
        subtitle: 'Combinar precio, permuta, diferencia, cuotas y entrega con rigor operativo',
        level: 'avanzado',
        category: 'integral',
        vehicleOfInterest: {
            brand: 'Ford',
            model: 'Ranger XLT 3.2 4x4 AT',
            year: 2021,
            km: 55000,
            listPrice: 41000000,
            condition: 'Único dueño, cobertor, lona marina y enganche homologado.'
        },
        tradeInVehicle: {
            brand: 'Volkswagen',
            model: 'Gol Trend 1.6 Trendline',
            year: 2017,
            km: 110000,
            marketRef: 10500000,
            cotizacionTaller: 9000000,
            observations: 'Detalles de pintura menores, embrague con medio uso.'
        },
        clientProfile: {
            name: 'Carlos Albarracín',
            age: 46,
            occupation: 'Transportista y contratista regional',
            temperament: 'Negociador experimentado, mueve varias variables a la vez para confundir al vendedor.',
            initialTone: 'Firme, profesional y dinámico: "Si los números cierran en paquete, firmamos hoy".'
        },
        knownInfo: [
            'Ranger precio lista: $41.000.000.',
            'Gol Trend peritado para toma: $9.000.000.',
            'Diferencia base: $32.000.000.',
            'Carlos ofrece: entregar el Gol pretendiendo $10.500.000, pagar $20.000.000 de contado neto y financiar los restantes $11.500.000 en 12 cuotas fijas.',
            'Exige además que le entreguen la camioneta el mismo día de la firma del 08 sin esperar la inscripción registral final.'
        ],
        hiddenInfo: [
            'Carlos sabe que la entrega de la unidad exige por política (PROC-GES-03) que el vehículo esté inscripto o con transferencia ingresada y documentación cruzada verificada.',
            'Tiene margen para poner $22.000.000 de contado en lugar de $20.000.000.',
            'Acepta una toma de $9.500.000 si el vendedor defiende los números con seriedad y solicita autorización formal de gerencia.'
        ],
        possibleObjections: [
            '“Hagamos un paquete: me tomás el Gol en 10.5M, te doy 20M hoy y el saldo en cuotas fijas a tasa bancaria blanda.”',
            '“Yo necesito salir trabajando con la Ranger mañana mismo; no me hagan esperar los papeles del registro.”',
            '“Si me obligás a esperar 10 días para la entrega, la operación se cae.”'
        ],
        closingConditions: [
            'Desglosar el paquete en variables claras: valor de venta, valor de toma peritada, saldo contado y saldo financiable.',
            'No prometer entrega de la Ranger sin cumplimiento del protocolo de gestoría y registro.',
            'Pedir autorización para cualquier desvío en la toma del Gol o en la tasa financiera.',
            'Cerrar un acuerdo armónico que proteja la rentabilidad de la agencia y la seguridad jurídica de ambas partes.'
        ],
        buyerPromptInstruction: `Tu nombre es Carlos Albarracín. Sos transportista y venís a negociar la Ranger 2021 entregando tu Gol Trend 2017 más dinero y financiación.
Tu estrategia es tirar todas las variables juntas para apurar al vendedor: "Te doy el Gol en 10 y medio, 20 palos contados, cuotas fijas y me llevo la chata hoy mismo".
Querés ver si el vendedor se desordena o si te entrega el vehículo sin papeles concluidos.
Si el vendedor te desglosa la operación punto por punto, defiende la tasación del Gol con el informe de taller, te explica las opciones de crédito prendario y te deja en claro con firmeza y educación que la camioneta se entrega cuando el trámite registral esté debidamente asegurado, reconocerás a un profesional competente y acordarás los términos.`
    }
];

export const COMPETENCY_DEFINITIONS = [
    {
        key: 'identificacionNecesidades',
        title: 'Identificación de necesidades y diagnóstico',
        weight: 0.20,
        description: 'Indagación activa, preguntas abiertas sobre uso, presupuesto, plazos y motivos de compra.'
    },
    {
        key: 'comunicacionClaridad',
        title: 'Comunicación y claridad profesional',
        weight: 0.15,
        description: 'Tono adecuado, empatía, escucha activa y precisión en las explicaciones sin tecnicismos oscuros.'
    },
    {
        key: 'argumentacionComercial',
        title: 'Argumentación comercial y defensa de valor',
        weight: 0.20,
        description: 'Resaltar el estado real, procedencia, servicios, seguridad jurídica y diferenciales de AutoSporting.'
    },
    {
        key: 'manejoObjeciones',
        title: 'Manejo constructivo de objeciones',
        weight: 0.20,
        description: 'Recepción empática, profundización de la duda real y reformulación constructiva sin confrontar.'
    },
    {
        key: 'negociacionAutorizaciones',
        title: 'Negociación y respeto a los límites de autorización',
        weight: 0.15,
        description: 'Cumplimiento estricto de PROC-VTA, sin otorgar descuentos ni tomas fuera de margen sin autorización del titular.'
    },
    {
        key: 'cierreOProximoPaso',
        title: 'Cierre o definición de próximo paso concreto',
        weight: 0.10,
        description: 'Compromiso de seña formal o agenda precisa de seguimiento con día, hora y objetivo claro.'
    }
];
