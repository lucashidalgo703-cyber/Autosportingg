# Documentación del CRM AutoSporting

Este directorio contiene toda la documentación necesaria para la implementación del CRM AutoSporting.

## Orden de Lectura Requerido

Antes de comenzar a programar o modificar código para el CRM, debes consultar los siguientes documentos en este orden:

1. **`README.md`** (este archivo): Visión general y reglas fundamentales.
2. **`CRM_AUTOSPORTING_ANALISIS_COMPLETO.md`**: Análisis detallado de la arquitectura, componentes y requisitos del CRM.
3. **`CRM_AUTOSPORTING_PROMPT_FINAL_ANTIGRAVITY.md`**: El prompt final de implementación con las instrucciones y reglas para la IA/Agente.

## Reglas de Implementación del CRM

* **Desarrollo por Etapas:** El CRM debe desarrollarse de forma iterativa y progresiva. **NO** debe implementarse todo de golpe.
* **Ruta Objetivo:** El CRM se establece como el panel principal de administración bajo la ruta `/admin`. El admin anterior se preserva en `/admin/legacy`, y `/crm` funciona como redirección hacia `/admin`. Toda nueva pantalla debe colgar de `/admin`.
* **Aislamiento de la Web Pública:** El desarrollo del CRM **NO** debe romper ni afectar el funcionamiento de la web pública actual (el catálogo, página de inicio, contacto, etc.).
* **Datos Pendientes:** Todo dato no confirmado (modelos de datos, campos específicos, lógica de negocio) debe marcarse claramente como **pendiente**.
* **Privacidad de Datos:** **NO** deben usarse datos reales de clientes bajo ninguna circunstancia. Utilizar únicamente datos ficticios (mock data) para el desarrollo.
* **Seguridad de Contraseñas:** **NO** deben guardarse contraseñas en texto plano en la base de datos ni en el código.
* **Manejo de Secretos:** **NO** deben exponerse secretos, claves API o configuraciones sensibles en el frontend.
