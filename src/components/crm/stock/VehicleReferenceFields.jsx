"use client";
import {VehicleFormSection} from './VehicleEditorDialog';

export const VEHICLE_CONDITIONS = ['0 km','Excelente','Muy bueno','Bueno','Regular','Usado','Nuevo'];
const VEHICLE_TYPES = ['Auto','Camioneta/SUV','Pick-up','Moto','Cuatriciclo','UTV','Moto de agua','Náutica','Camión','Otro'];
const CONTROL = 'h-9 w-full min-w-0 rounded-lg border border-crm-border bg-crm-bg px-3 py-1.5 text-sm leading-5 text-crm-fg focus:border-crm-red focus:outline-none focus:ring-1 focus:ring-crm-red disabled:opacity-60';
const GRID = 'grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3';

function Field({data,onChange,prefix,name,label,options,type='text',required=false,wide=false,...rest}) {
    const value = data[name] ?? '';
    const id = prefix+'-'+name;
    return <div className={wide ? 'sm:col-span-2 md:col-span-3' : 'min-w-0'}>
        <label htmlFor={id} className="mb-1.5 block text-xs font-medium leading-4 text-crm-fg-muted">{label}{required && ' *'}</label>
        {options ? <select id={id} name={name} value={value} onChange={onChange} required={required} className={CONTROL} {...rest}>
            {value !== '' && !options.includes(value) && <option value={value}>{value}</option>}
            {options.map(option => <option key={option} value={option}>{option || 'Sin especificar'}</option>)}
        </select> : type === 'textarea' ? <textarea id={id} name={name} value={value} onChange={onChange} rows={3} className={CONTROL+' h-auto min-h-20 resize-y'} {...rest} /> : <input id={id} name={name} type={type} value={value} onChange={onChange} required={required} className={CONTROL} {...rest} />}
    </div>;
}
function OpenSection({title,children}) {
    return <section className="space-y-3"><h3 className="m-0 text-sm font-semibold leading-5 text-crm-fg">{title}</h3>{children}</section>;
}

export default function VehicleReferenceFields({data,onChange,prefix,isEditing=false,lockedStatus=false,costs,documents,photos}) {
    const fieldChange = event => {
        onChange(event);
        if(isEditing && ['purchasePrice','purchaseCurrency'].includes(event.target.name)) {
            const section=document.getElementById(prefix+'-costs');
            if(section)section.open=true;
        }
    };
    const field = (name,label,props={}) => <Field key={name} data={data} onChange={fieldChange} prefix={prefix} name={name} label={label} {...props} />;
    return <div className="space-y-5">
        <OpenSection title="Identidad">
            <div className={GRID}>
                {field('vehicleType','Tipo de vehículo',{options:VEHICLE_TYPES})}
                {field('brand','Marca',{required:true})}
                {field('name','Modelo',{required:true})}
                {field('year','Año',{type:'number',required:true,min:1886,max:new Date().getFullYear()+2,step:1})}
                {field('plateOrVin','Patente / VIN')}
                {field('condition','Condición',{options:VEHICLE_CONDITIONS})}
                {field('color','Color')}
            </div>
        </OpenSection>
        <OpenSection title="Precio y ubicación">
            <div className={GRID}>
                {field('price','Precio de venta',{type:'number',min:0,step:'0.01',required:true})}
                {field('currency','Moneda de venta',{options:['USD','ARS']})}
                {field('purchasePrice','Precio de compra / toma (opcional)',{inputMode:'decimal'})}
                {field('purchaseCurrency','Moneda de compra',{options:['USD','ARS']})}
                {field('km','Kilómetros',{type:'number',min:0,step:1,required:true})}
                {field('location','Ubicación',{options:['Salón Principal','Depósito','Con cliente','Taller Mecánico','Taller Chapa y Pintura','Otra']})}
                {field('status',isEditing ? 'Estado' : 'Estado inicial',{options:['Disponible','Pausado'],disabled:lockedStatus})}
            </div>
            {lockedStatus && <p className="m-0 text-xs text-crm-fg-muted">El estado se gestiona desde la reserva o venta vinculada.</p>}
        </OpenSection>
        <OpenSection title="Consignante / propietario comercial">
            <label className="flex items-start gap-2.5 rounded-lg border border-crm-border px-3 py-2.5 text-sm text-crm-fg"><input id={prefix+'-agencyOwned'} type="checkbox" name="agencyOwned" checked={Boolean(data.agencyOwned)} onChange={onChange} className="mt-0.5 h-4 w-4 accent-crm-red" /><span>Vehículo propio de la agencia<span className="mt-0.5 block text-xs text-crm-fg-muted">Si es de un tercero, completá los datos del propietario comercial.</span></span></label>
            <div className={GRID}>
                {field('ownerName','Nombre / razón social')}
                {field('linkedClient','Cliente vinculado (referencia)')}
                {field('ownerPhone','Teléfono',{type:'tel'})}
                {field('ownerEmail','Email',{type:'email'})}
                {field('consignedBy','Responsable de consignación')}
            </div>
        </OpenSection>
        {costs && <VehicleFormSection id={prefix+'-costs'} title="Costos y operación de AutoSporting">{costs}</VehicleFormSection>}
        <VehicleFormSection title="Ingreso al stock"><div className={GRID}>{field('createdAt','Fecha de ingreso',{type:'date'})}{isEditing && Object.hasOwn(data,'soldAt') && field('soldAt','Fecha de venta registrada · AutoSporting',{type:'date',disabled:data.status !== 'Vendido'})}</div></VehicleFormSection>
        <VehicleFormSection title="Identificación y accesorios"><div className={GRID}>
            {field('owners','Cantidad de dueños',{type:'number',min:1,step:1})}
            {field('engineNumber','Número de motor')}
            {field('chassisNumber','Número de chasis')}
            {field('hasManuals','Manuales',{options:['No','Sí','Parcial']})}
            {field('hasDuplicateKeys','Duplicado de llaves',{options:['No','Sí','Parcial']})}
            {field('hasOfficialServices','Servicios oficiales',{options:['No','Sí','Parcial']})}
        </div></VehicleFormSection>
        <VehicleFormSection title="Ficha técnica"><div className={GRID}>
            {field('fuel','Combustible',{options:['Nafta','Diésel','GNC','Híbrido','Eléctrico']})}
            {field('transmission','Transmisión',{options:['','Manual','Automática']})}
            {field('bodyType','Carrocería',{options:['','SUV','Sedán','Hatchback','Pick-up','Coupé','Cabriolet','Familiar','Utilitario','Otro']})}
            {field('doors','Puertas',{type:'number',min:0,max:12,step:1})}
            {field('engine','Motor / cilindrada')}
            {field('version','Versión')}
        </div></VehicleFormSection>
        <VehicleFormSection title="Publicación"><div className={GRID}>
            {field('publishedOnML','Publicado en Mercado Libre',{options:['No','Sí']})}
            {field('publishedBy','Publicado por')}
            {field('mlLink','Link de Mercado Libre')}
            <label className="flex items-center gap-2 text-sm text-crm-fg sm:col-span-2 md:col-span-3"><input id={prefix+'-visibleEnWeb'} type="checkbox" name="visibleEnWeb" checked={data.visibleEnWeb !== false} onChange={onChange} className="h-4 w-4 accent-crm-red" />Mostrar en el catálogo público</label>
        </div></VehicleFormSection>
        <VehicleFormSection title="Información para el catálogo público"><div className={GRID}>
            {field('description','Descripción pública',{type:'textarea',wide:true,maxLength:20000})}
            {field('publicEquipment','Equipamiento verificado',{type:'textarea',wide:true,maxLength:5000})}
            {field('publicMaintenance','Mantenimiento informado',{type:'textarea',wide:true,maxLength:5000})}
            {field('publicPurchaseConditions','Condiciones de compra y gastos',{type:'textarea',wide:true,maxLength:5000})}
            {field('youtubeUrl','Video de YouTube',{type:'url',wide:true,placeholder:'https://www.youtube.com/watch?v=…',maxLength:2048})}
        </div></VehicleFormSection>
        <VehicleFormSection title="Notas internas"><div className={GRID}>{field('notes','Notas internas',{type:'textarea',wide:true,maxLength:20000})}</div></VehicleFormSection>
        <VehicleFormSection title="Fotos">{photos}</VehicleFormSection>
        {documents && <VehicleFormSection title="Documentación registral · AutoSporting">{documents}</VehicleFormSection>}
    </div>;
}
