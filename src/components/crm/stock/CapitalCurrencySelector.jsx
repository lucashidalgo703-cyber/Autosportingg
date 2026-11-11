"use client";
const button='inline-flex min-h-9 items-center justify-center rounded-lg border border-crm-border px-3 py-2 text-xs text-crm-fg';
export default function CapitalCurrencySelector({currency,onChange}) {
 return <fieldset className="m-0 flex min-w-0 items-center gap-1 border-0 p-0"><legend className="sr-only">Moneda del informe de capital</legend>{['ARS','USD'].map(value=><button key={value} type="button" aria-pressed={currency===value} onClick={()=>onChange?.(value)} disabled={!onChange} className={button+(currency===value?' !border-crm-red !bg-crm-red/10 !text-crm-red':'')}>{value}</button>)}</fieldset>;
}
