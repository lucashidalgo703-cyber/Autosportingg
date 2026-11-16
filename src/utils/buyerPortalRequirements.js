// Agency guidance supplied for this portal; dates are reviewed by Gestoría.
// Formulario 08 belongs to the notary workflow and is deliberately absent.
export const BUYER_REQUIREMENTS = [
    { key: 'title', label: 'CAT o título del automotor', guidance: 'Foto o PDF. Para modelos anteriores a 2016, nuestra guía pide presentar el título de propiedad original.' },
    { key: 'domain_report', label: 'Informe de estado de dominio', requiresIssuedAt: true, guidance: 'Informe completo y fecha de emisión. Nuestra guía indica una validez estimada de 30 días; Gestoría revisa su vigencia.' },
    { key: 'traffic_report', label: 'SUATS – Informe de infracciones de tránsito', guidance: 'Foto o PDF actualizado al momento de la operación.' },
    { key: 'police_check', label: 'Formulario 12 – Verificación policial', requiresIssuedAt: true, guidance: 'Verificación de chasis y motor y fecha de emisión. Nuestra guía indica una validez estimada de 150 días hábiles; Gestoría revisa su vigencia.' },
    { key: 'registration_cards', label: 'Cédulas del automotor', guidance: 'Podés cargar varias cédulas. Identificá el frente y el dorso de cada una, por ejemplo Cédula 1 · Frente y Cédula 1 · Dorso.' },
    { key: 'municipal_clearance', label: 'Libre deuda municipal y de infracciones', guidance: 'Nuestra guía pide gestionarlo dentro de las 24 horas previas a la entrega. El resto de la documentación se puede adelantar.' }
];
