# Contexto Operativo para Agentes (CRM AutoSporting)

**⚠️ STOP - ANTES DE TOCAR CÓDIGO DEL CRM LEE ESTO:**

Si vas a trabajar en cualquier tarea relacionada con el CRM en este repositorio, **DEBES** leer los siguientes documentos primero:

1. `/docs/crm/README.md`
2. `/docs/crm/CRM_AUTOSPORTING_ANALISIS_COMPLETO.md`
3. `/docs/crm/CRM_AUTOSPORTING_PROMPT_FINAL_ANTIGRAVITY.md`

Para Clientes y Stock, consultar también la [revisión fiel del 10/11/2026](REVISION_FIEL_CLIENTES_STOCK_2026-11-10.md): distingue el cierre histórico de la ampliación actual, incluyendo importación/OCR local, documentos privados por partes, NPS contextual, retiro de venta, portal del propietario y Capital separado por moneda. Las ausencias del corte inicial no describen la implementación posterior. Consultar sus contratos, permisos, configuración y límites vigentes; no interpretar este registro como confirmación de despliegue o QA global final.

Para Ventas y devoluciones de aranceles del Registro, consultar la [revisión de Ventas y Registro](REVISION_FIEL_VENTAS_REGISTRO_2026-11-10.md): contratos de señas/permutas, autoridad de estados, conciliación explícita y caja manual, pruebas y límites de la implementación local.

Para Finanzas, consultar la [revisión de Finanzas](REVISION_FIEL_FINANZAS_2026-11-10.md): movimientos, cuentas, documentos privados, cuotas por pagar, instrumentos y formularios auxiliares; resultados locales y límites. La opción elegida por el usuario es iniciar períodos de gestión conservando saldos y obligaciones: Control → Períodos guarda resúmenes inmutables sin borrar ni ocultar movimientos ni alterar Tesorería.

## Directrices Operativas

* **Contexto:** El CRM pertenece a AutoSporting (agencia de autos).
* **Ubicación:** El CRM debe integrarse como el panel principal bajo la ruta `/admin`. El admin anterior se conserva temporalmente en `/admin/legacy` y `/crm` redirige a `/admin`. Toda nueva pantalla del CRM debe colgar de `/admin` (ej: `/admin/stock`, `/admin/ventas`).
* **Aislamiento:** El CRM debe mantenerse separado de la web pública.
* **Metodología:** La implementación **DEBE** ser por fases. No implementar todo de golpe.
* **Paso Inicial Obligatorio:** Primero analizar el stack actual, las rutas, los componentes y los estilos existentes en el proyecto.
* **Backend:** No implementar un backend real hasta que la estructura/prototipo esté aprobada.
* **Datos:** **NO usar datos reales.** Usar datos demo anónimos.
* **Seguridad:**
  * Priorizar la seguridad, el RBAC (Control de Acceso Basado en Roles), la auditoría y la protección de documentos.
  * **NO** replicar fallas de seguridad observadas en el CRM de referencia.
* **Registro:** Mantener un registro de decisiones cuando cambie algo.
* **Propiedad Intelectual:** No copiar código privado ni marcas de terceros.
