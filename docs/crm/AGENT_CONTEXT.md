# Contexto Operativo para Agentes (CRM AutoSporting)

**⚠️ STOP - ANTES DE TOCAR CÓDIGO DEL CRM LEE ESTO:**

Si vas a trabajar en cualquier tarea relacionada con el CRM en este repositorio, **DEBES** leer los siguientes documentos primero:

1. `/docs/crm/README.md`
2. `/docs/crm/CRM_AUTOSPORTING_ANALISIS_COMPLETO.md`
3. `/docs/crm/CRM_AUTOSPORTING_PROMPT_FINAL_ANTIGRAVITY.md`

## Directrices Operativas

* **Contexto:** El CRM pertenece a AutoSporting (agencia de autos).
* **Ubicación:** El CRM debe integrarse bajo la ruta `/crm`.
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
