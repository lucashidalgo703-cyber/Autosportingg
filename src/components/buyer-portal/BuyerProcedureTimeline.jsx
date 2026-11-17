import { AlertCircle, CarFront, Check, FileClock, XCircle } from 'lucide-react';
import { buyerProcedureTimeline } from '../../utils/buyerProcedureTimeline';
import styles from './BuyerProcedureTimeline.module.css';

export default function BuyerProcedureTimeline({ procedure }) {
    const state = buyerProcedureTimeline(procedure.status, procedure.type);
    const title = procedure.type === 'Transferencia Egreso' ? 'Documentación' : procedure.type || 'Trámite de tu vehículo';
    return <section className="min-w-0 space-y-4 rounded-xl border border-solid border-neutral-700 bg-neutral-950 p-3 sm:p-4" aria-label={`Seguimiento: ${title}`} data-procedure-timeline data-procedure-status={procedure.status || ''}>
        <div className="flex min-w-0 flex-wrap items-start justify-between gap-2">
            <h3 className="min-w-0 text-sm font-semibold text-white [overflow-wrap:anywhere]" data-procedure-title={title}>{title}</h3>
            <p className={`inline-flex items-center gap-1.5 text-xs font-semibold ${state.observed ? 'text-amber-200' : state.cancelled ? 'text-red-300' : state.complete ? 'text-emerald-300' : 'text-neutral-300'}`}>
                {state.observed ? <AlertCircle aria-hidden="true" size={15}/> : state.cancelled ? <XCircle aria-hidden="true" size={15}/> : state.complete ? <Check aria-hidden="true" size={15}/> : <FileClock aria-hidden="true" size={15}/>}{state.label}
            </p>
        </div>
        <div className="relative min-w-0 pt-0.5" style={{ '--procedure-progress': `${state.progress}%`, '--step-count': state.stages.length }}>
            <div className={styles.track} aria-hidden="true"><div className={`${styles.progress} ${state.inProgress ? styles.moving : ''}`}/></div>
            <ol className={styles.steps} aria-label="Etapas del trámite">
                {state.stages.map((stage, index) => {
                    const current = state.currentIndex === index;
                    const completed = state.currentIndex > index || state.complete;
                    return <li key={stage.key} aria-current={current ? 'step' : undefined} className={styles.step} data-stage={stage.key} data-stage-state={current ? 'current' : completed ? 'complete' : 'pending'}>
                        <span className={`relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 border-solid ${current && !state.complete ? `border-red-400 bg-red-600 text-white ${styles.active}` : completed ? 'border-red-500 bg-red-600 text-white' : 'border-neutral-600 bg-neutral-950 text-neutral-500'}`} aria-hidden="true">
                            {current && !state.complete ? <CarFront size={20}/> : completed ? <Check size={17}/> : <span className="h-2 w-2 rounded-full bg-current"/>}
                        </span>
                        <span className={`max-w-full text-sm leading-5 sm:text-xs sm:leading-4 ${current || completed ? 'font-semibold text-white' : 'text-neutral-400'}`}>{stage.label}<span className="sr-only">{current ? ', etapa actual' : completed ? ', completada' : ', pendiente'}</span></span>
                    </li>;
                })}
            </ol>
        </div>
        {state.observed && <p className="text-xs leading-relaxed text-amber-200">Gestoría informó observaciones. Revisá la última novedad y el próximo paso; las etapas anteriores quedan por confirmar.</p>}
        {state.cancelled && <p className="text-xs leading-relaxed text-red-300">Este trámite fue cancelado. AutoSporting te informará cómo continuar.</p>}
        {state.currentIndex < 0 && !state.observed && !state.cancelled && <p className="text-xs leading-relaxed text-neutral-400">Gestoría todavía no informó una etapa específica. El gráfico se actualizará cuando registre el avance.</p>}
    </section>;
}
