# RepairFlow: Track & Repair

# MASTER PROMPT

# REPAIRFLOW SaaS

## Plataforma Multi-Tenant de Gestión, Reparación, Inventario y Seguimiento para Talleres de Celulares

---

# 1. ROL

Actúa como:

* Software Architect Senior
* Full-Stack Engineer Senior
* PostgreSQL Database Architect
* Supabase Expert
* SaaS Multi-Tenant Architect
* Security Engineer
* UX/UI Designer
* DevOps Engineer
* QA Engineer

Debes construir un producto SaaS comercial, no una demo.

El sistema debe estar diseñado para que múltiples empresas/talleres utilicen una misma aplicación y una misma instancia de Supabase/PostgreSQL, manteniendo aislamiento estricto de información mediante:

* `tenant_id`
* PostgreSQL Row Level Security
* Supabase Auth
* RBAC
* autorización de servidor
* políticas de acceso
* separación de datos públicos y privados

La aplicación debe estar preparada para escalar de un MVP a un SaaS comercial.

---

# 2. VISIÓN DEL PRODUCTO

Crear una plataforma para administrar el ciclo completo de reparación de dispositivos.

Flujo principal:

```text
Cliente
↓
Recepción
↓
Registro del dispositivo
↓
Inspección física
↓
Checklist
↓
Fotografías
↓
Diagnóstico
↓
Cotización
↓
Aprobación
↓
Asignación de técnico
↓
Reparación
↓
Repuestos
↓
Pruebas finales
↓
Equipo listo
↓
Notificación
↓
Entrega
↓
Garantía
```

En paralelo:

```text
Orden de reparación
↓
QR único
↓
Portal público
↓
Cliente consulta el avance
```

---

# 3. ARQUITECTURA GENERAL

Utilizar:

```text
Frontend:
Next.js + React + TypeScript

UI:
Tailwind CSS + shadcn/ui

Backend principal:
Supabase

Database:
Supabase PostgreSQL

Authentication:
Supabase Auth

Authorization:
PostgreSQL RLS + RBAC

Realtime:
Supabase Realtime

Server-side logic:
Supabase Edge Functions
+ Next.js Server Actions / Route Handlers cuando corresponda

Validation:
Zod

Forms:
React Hook Form

Tables:
TanStack Table

Queries:
Supabase JS

Media:
ImageKit

QR:
qrcode

Charts:
Recharts

Deployment:
Vercel + Supabase + ImageKit
```

Usar la integración SSR actual de Supabase para Next.js y cookies seguras mediante `@supabase/ssr`. La documentación actual de Supabase recomienda esta integración para SSR con Next.js.

---

# 4. APLICACIONES DEL PRODUCTO

El producto tendrá tres superficies principales.

## A. App administrativa del taller

Ejemplo:

```text
https://app.repairflow.com
```

Utilizada por:

* propietario
* administrador
* recepción
* técnicos
* inventario
* contabilidad

---

## B. Portal público del cliente

Ejemplo:

```text
https://tracking.repairflow.com/r/{public_token}
```

No requiere cuenta.

Permite consultar:

* reparación
* dispositivo
* servicio
* estado
* timeline
* fecha estimada
* fotografías públicas
* pruebas finales públicas
* mensajes públicos del taller

---

## C. Super Admin SaaS

Ejemplo:

```text
https://app.repairflow.com/super-admin
```

Solo para el propietario de la plataforma.

Permite administrar:

* tenants
* planes
* suscripciones
* uso
* límites
* incidencias
* métricas
* configuración global

---

# 5. MODELO SaaS

Usar:

```text
Shared Database
+
Shared Schema
+
tenant_id
+
RLS
```

NO crear:

* una base de datos por taller
* un schema PostgreSQL por taller

Ejemplo:

```text
SUPABASE
│
└── PostgreSQL
    │
    ├── Tenant A
    ├── Tenant B
    ├── Tenant C
    └── Tenant D
```

Todas las entidades tenant-scoped deben tener `tenant_id`.

---

# 6. REGLA CRÍTICA DE SEGURIDAD

Nunca confiar únicamente en filtros como:

```sql
WHERE tenant_id = ...
```

Toda tabla expuesta mediante Supabase debe tener una estrategia RLS adecuada.

Supabase recomienda habilitar RLS en tablas de schemas expuestos y usar políticas para controlar acceso fila por fila.

Implementar:

```text
Authentication
+
Authorization
+
RLS
+
Server validation
```

como capas independientes.

---

# 7. SUPABASE AUTH

Utilizar Supabase Auth.

Autenticación inicial:

* email/password
* recuperación de contraseña
* reset de contraseña
* persistencia de sesión
* logout
* sesiones seguras

Arquitectura:

```text
auth.users
     ↓
public.profiles
     ↓
tenant_memberships
     ↓
roles
     ↓
permissions
```

Nunca tratar `auth.users` como sustituto de las tablas de negocio.

---

# 8. PERFIL DEL USUARIO

Crear:

```text
profiles
```

Campos:

```text
id
full_name
phone
avatar_url
is_active
created_at
updated_at
```

El `id` corresponde al usuario de Supabase Auth.

---

# 9. TENANTS

Crear:

```text
tenants
```

Campos:

```text
id UUID
name
legal_name
slug
tax_id
phone
email
website
logo_url
favicon_url
status
timezone
currency
locale
created_at
updated_at
```

Estados:

```text
ACTIVE
TRIAL
SUSPENDED
CANCELLED
```

---

# 10. MEMBERSHIPS

Crear:

```text
tenant_memberships
```

Campos:

```text
id
tenant_id
user_id
branch_id nullable
role_id
status
joined_at
created_at
updated_at
```

Esto permite que un usuario pertenezca a un tenant y, si se requiere, a una sucursal.

---

# 11. ROLES

Crear roles:

```text
OWNER
ADMIN
RECEPTION
TECHNICIAN
INVENTORY
ACCOUNTING
VIEWER
SUPER_ADMIN
```

No dar acceso SUPER_ADMIN mediante un rol normal tenant-scoped.

---

# 12. PERMISSIONS

Crear:

```text
permissions
role_permissions
```

Permisos ejemplo:

```text
dashboard.view

customers.view
customers.create
customers.update
customers.delete

devices.view
devices.create
devices.update
devices.delete

repairs.view
repairs.create
repairs.update
repairs.delete
repairs.assign
repairs.change_status

diagnostics.view
diagnostics.create
diagnostics.update

quotes.view
quotes.create
quotes.update
quotes.approve

inventory.view
inventory.create
inventory.update
inventory.adjust

payments.view
payments.create

invoices.view
invoices.create

reports.view

users.view
users.manage

settings.view
settings.manage
```

---

# 13. SUCURSALES

Crear:

```text
branches
```

Campos:

```text
id
tenant_id
name
code
phone
email
address
city
state
country
is_active
created_at
updated_at
```

Un tenant puede tener múltiples sucursales.

---

# 14. CLIENTES

Crear:

```text
customers
```

Campos:

```text
id
tenant_id
first_name
last_name
business_name nullable
phone
secondary_phone nullable
email nullable
document_number nullable
address nullable
city nullable
notes nullable
created_at
updated_at
deleted_at nullable
```

Índices:

```text
tenant_id
tenant_id + phone
tenant_id + email
tenant_id + document_number
```

---

# 15. DISPOSITIVOS

Crear:

```text
devices
```

Campos:

```text
id
tenant_id
customer_id
device_type
brand
model
variant
storage
color
imei_1
imei_2
serial_number
operating_system
carrier
notes
created_at
updated_at
deleted_at nullable
```

Tipos:

```text
PHONE
TABLET
SMARTWATCH
LAPTOP
OTHER
```

---

# 16. HISTORIAL DEL DISPOSITIVO

Crear:

```text
device_history
```

Campos:

```text
id
tenant_id
device_id
repair_order_id nullable
event_type
description
created_by nullable
created_at
```

Esto permite ver todas las reparaciones previas del dispositivo.

---

# 17. ORDEN DE REPARACIÓN

Crear:

```text
repair_orders
```

Campos:

```text
id
tenant_id
branch_id
repair_number
public_token
customer_id
device_id
assigned_technician_id nullable

status
priority

problem_description
customer_report
internal_notes

estimated_cost
final_cost

estimated_completion_at
received_at
diagnostic_started_at
repair_started_at
repair_completed_at
ready_at
delivered_at

created_by
updated_by
created_at
updated_at
deleted_at nullable
```

---

# 18. REGLA SOBRE EL IDENTIFICADOR

Separar:

```text
internal UUID/ULID
repair_number
public_token
```

Ejemplo:

```text
internal_id:
UUID

repair_number:
REP-2026-001042

public_token:
8F4K2M9X72Q4...
```

El QR utiliza exclusivamente `public_token`.

Nunca usar el `repair_number` como secreto.

---

# 19. TOKEN PÚBLICO

Crear:

```text
public_token
public_tracking_enabled
```

Reglas:

* generado criptográficamente
* suficientemente largo
* no secuencial
* único
* no reutilizable
* revocable

URL:

```text
https://tracking.repairflow.com/r/{public_token}
```

---

# 20. ESTADOS

Crear catálogo:

```text
repair_statuses
```

Estados predeterminados:

```text
RECEIVED
DIAGNOSING
WAITING_APPROVAL
APPROVED
WAITING_PART
IN_REPAIR
TESTING
READY
DELIVERED
ON_HOLD
CANCELLED
```

Cada tenant puede personalizar:

```text
label
color
sort_order
is_active
is_public
requires_comment
requires_tests
```

---

# 21. HISTORIAL DE ESTADOS

Crear:

```text
repair_status_history
```

Campos:

```text
id
tenant_id
repair_order_id
from_status
to_status
changed_by
comment
created_at
```

Cada cambio de estado debe ser auditado.

---

# 22. EVENTOS DE REPARACIÓN

Crear:

```text
repair_events
```

Eventos:

```text
REPAIR_CREATED
DEVICE_RECEIVED
PHYSICAL_INSPECTION_COMPLETED
DIAGNOSTIC_STARTED
DIAGNOSTIC_COMPLETED
QUOTE_CREATED
QUOTE_SENT
QUOTE_APPROVED
QUOTE_REJECTED
PART_REQUESTED
PART_RECEIVED
REPAIR_STARTED
REPAIR_COMPLETED
TEST_STARTED
TEST_COMPLETED
CUSTOMER_NOTIFIED
READY_FOR_PICKUP
DELIVERED
WARRANTY_CREATED
```

Campos:

```text
id
tenant_id
repair_order_id
event_type
actor_user_id nullable
metadata jsonb
created_at
```

---

# 23. RECEPCIÓN DEL EQUIPO

Crear:

```text
repair_intake
```

Campos:

```text
id
tenant_id
repair_order_id

screen_condition
body_condition
frame_condition
back_glass_condition
camera_condition

water_damage
physical_damage_notes

accessories_json

passcode_provided

customer_signature_media_id nullable

created_at
updated_at
```

---

# 24. PROTECCIÓN DEL CÓDIGO DE ACCESO

El PIN/password del teléfono:

* jamás se muestra públicamente
* no aparece en logs
* no aparece en analytics
* no debe aparecer en respuestas públicas
* limitar acceso mediante permisos

Evaluar cifrado en reposo o mecanismo equivalente según el caso.

No almacenar secretos innecesariamente.

---

# 25. CHECKLISTS

Crear:

```text
checklist_templates
checklist_items
repair_checklists
repair_checklist_results
```

Permitir crear checklists configurables.

Ejemplo:

```text
Pantalla
Touch
Face ID
Fingerprint
Cámara frontal
Cámara trasera
Flash
Micrófono
Auricular
Altavoz
Vibración
Botones
Wi-Fi
Bluetooth
SIM
Datos móviles
Carga
Carga inalámbrica
Batería
GPS
NFC
Sensores
```

Resultados:

```text
PASS
FAIL
NOT_TESTED
NOT_APPLICABLE
```

---

# 26. DIAGNÓSTICO

Crear:

```text
diagnostics
```

Campos:

```text
id
tenant_id
repair_order_id
technician_id
diagnosis
root_cause
recommendation
estimated_labor
estimated_parts
technical_notes
created_at
updated_at
```

---

# 27. COTIZACIONES

Crear:

```text
quotes
quote_items
```

Quote:

```text
id
tenant_id
repair_order_id
quote_number
subtotal
discount
tax
total
currency
status
expires_at
created_by
approved_at
rejected_at
created_at
updated_at
```

Items:

```text
id
quote_id
type
description
quantity
unit_price
total
part_id nullable
```

Tipos:

```text
LABOR
PART
SERVICE
OTHER
```

---

# 28. APROBACIÓN

Una cotización aprobada debe:

* registrar fecha
* registrar quién aprobó
* generar evento
* cambiar estado según flujo configurado
* quedar auditada

No modificar precios aprobados silenciosamente.

---

# 29. INVENTARIO

Crear:

```text
parts
inventory_locations
stock_movements
repair_parts
suppliers
```

Partes:

```text
id
tenant_id
sku
name
description
brand
category
cost_price
sale_price
stock_quantity
minimum_stock
supplier_id
is_active
created_at
updated_at
```

---

# 30. STOCK MOVEMENTS

Cada modificación de inventario debe generar:

```text
stock_movements
```

Tipos:

```text
PURCHASE
REPAIR_USAGE
ADJUSTMENT_IN
ADJUSTMENT_OUT
TRANSFER_IN
TRANSFER_OUT
RETURN
```

Nunca cambiar stock crítico sin registrar movimiento.

---

# 31. REPARACIÓN + INVENTARIO

Cuando un técnico utiliza un repuesto:

```text
repair_parts
+
stock_movements
+
actualización de stock
```

Todo debe realizarse dentro de una operación atómica.

---

# 32. PAGOS

Crear:

```text
payments
```

Campos:

```text
id
tenant_id
customer_id
repair_order_id nullable
invoice_id nullable
amount
currency
method
status
reference
paid_at
created_by
created_at
```

Métodos:

```text
CASH
CARD
BANK_TRANSFER
MOBILE_PAYMENT
OTHER
```

---

# 33. FACTURAS

Crear:

```text
invoices
invoice_items
```

Preparar para integración futura con facturación electrónica.

No asumir inicialmente un sistema fiscal específico.

---

# 34. GARANTÍAS

Crear:

```text
warranties
```

Campos:

```text
id
tenant_id
repair_order_id
customer_id
device_id
warranty_days
start_date
end_date
terms
status
created_at
```

Estados:

```text
ACTIVE
EXPIRED
VOID
```

---

# 35. MEDIA

Crear:

```text
repair_media
```

Campos:

```text
id
tenant_id
repair_order_id nullable
device_id nullable
uploaded_by
imagekit_file_id
imagekit_file_path
imagekit_url
file_name
mime_type
size_bytes
category
visibility
created_at
```

Categorías:

```text
INTAKE
PHYSICAL_DAMAGE
DIAGNOSTIC
REPAIR
FINAL
DOCUMENT
SIGNATURE
OTHER
```

Visibilidad:

```text
PRIVATE
PUBLIC
```

---

# 36. IMAGEKIT

ImageKit será el almacenamiento principal de imágenes y archivos multimedia.

PostgreSQL solo almacenará metadata.

Ejemplo:

```text
PostgreSQL
↓
imagekit_file_id
imagekit_file_path
imagekit_url
category
visibility
```

ImageKit:

```text
archivo real
```

---

# 37. IMAGEKIT SECURITY

Nunca exponer:

```text
IMAGEKIT_PRIVATE_KEY
```

al navegador.

Para uploads desde cliente:

```text
Frontend
↓
Backend seguro
↓
token
signature
expire
publicKey
↓
ImageKit
```

Este patrón coincide con la documentación actual de ImageKit, que indica que los parámetros de autenticación para uploads desde cliente deben generarse en backend y que la private key nunca debe publicarse en frontend.

Implementar:

```text
POST /api/media/auth
```

o Edge Function equivalente.

Validar:

* sesión
* tenant
* permisos
* reparación
* tipo MIME
* tamaño
* cuota del plan
* categoría

---

# 38. ESTRUCTURA IMAGEKIT

Utilizar:

```text
/tenants/{tenant_id}/
    repairs/
        {repair_id}/
            intake/
            physical-damage/
            diagnostic/
            repair/
            final/
            documents/
```

No mezclar archivos de tenants.

---

# 39. PORTAL PÚBLICO

Ruta:

```text
/r/[public_token]
```

No requiere login.

Debe ser mobile-first.

Debe cargar rápidamente.

---

# 40. SEGURIDAD DEL PORTAL

El portal público NO debe consultar directamente toda la tabla de `repair_orders`.

Crear una capa específica:

```text
Public Tracking Service
```

que devuelva un DTO seguro.

Ejemplo:

```json
{
  "repairNumber": "REP-2026-001042",
  "device": {
    "brand": "Apple",
    "model": "iPhone 13 Pro"
  },
  "service": "Cambio de pantalla",
  "status": "IN_REPAIR",
  "estimatedCompletion": "2026-08-29",
  "timeline": [],
  "publicPhotos": []
}
```

Nunca devolver:

```text
costos internos
márgenes
notas privadas
passcode
IMEI completo
documentos privados
información de otros clientes
```

---

# 41. PÁGINA PÚBLICA DE TRACKING

Diseñar:

```text
TALLER XYZ

Reparación #REP-2026-001042

iPhone 13 Pro

Cambio de pantalla

┌───────────────────────────────┐
│        EN REPARACIÓN          │
└───────────────────────────────┘
```

Timeline:

```text
✓ Equipo recibido
✓ Diagnóstico realizado
✓ Reparación aprobada
● En reparación
○ Pruebas finales
○ Listo para retirar
```

Mostrar:

* fecha
* hora
* eventos públicos
* fotos públicas
* mensaje del taller
* fecha estimada cuando exista

---

# 42. REALTIME

Utilizar Supabase Realtime para que el portal pueda actualizar información cuando cambie una reparación, cuando sea técnicamente apropiado.

Supabase Realtime dispone de mecanismos de autorización y puede integrarse con RLS para controlar acceso a canales privados.

Sin embargo:

**No exponer el canal interno de la reparación a usuarios anónimos.**

Para visitantes públicos, preferir:

```text
public repair channel
```

o polling seguro cuando resulte más apropiado.

No usar Realtime simplemente por moda.

---

# 43. QR

Cada reparación genera automáticamente:

```text
QR
```

El QR contiene:

```text
https://tracking.repairflow.com/r/{public_token}
```

Funciones:

```text
Generate
View
Download PNG
Download SVG
Print
Regenerate
Revoke
```

---

# 44. REVOCAR QR

Agregar:

```text
public_tracking_enabled
```

Si se revoca:

```text
portal → acceso denegado
```

No cambiar el token innecesariamente.

---

# 45. NOTIFICACIONES

Crear:

```text
notifications
notification_templates
```

Campos notification:

```text
id
tenant_id
customer_id
repair_order_id
channel
type
recipient
subject
content
status
provider_message_id
sent_at
error_message
created_at
```

Canales:

```text
EMAIL
WHATSAPP
SMS
IN_APP
```

---

# 46. TEMPLATES

Variables:

```text
{{customer_name}}
{{repair_number}}
{{device_brand}}
{{device_model}}
{{status}}
{{tracking_url}}
{{estimated_completion}}
{{total}}
```

---

# 47. AUTOMATIZACIONES

Preparar reglas:

```text
Estado → acción
```

Ejemplos:

```text
READY
→ WhatsApp

WAITING_APPROVAL
→ Email

QUOTE_APPROVED
→ IN_REPAIR

STOCK_LOW
→ Alert

WARRANTY_EXPIRING
→ Reminder
```

Separar la lógica de automatización de los componentes UI.

---

# 48. SUPER ADMIN

El Super Admin puede:

```text
ver tenants
crear tenant
suspender tenant
activar tenant
ver usuarios
ver consumo
ver plan
ver suscripción
ver métricas
```

Nunca debe depender de filtros client-side.

Aplicar privilegios y políticas apropiadas.

---

# 49. SUSCRIPCIONES

Crear:

```text
plans
subscriptions
subscription_events
usage_metrics
```

Plan:

```text
id
name
description
price_monthly
price_yearly
max_users
max_branches
max_repairs_per_month
max_storage_bytes
features_json
is_active
created_at
updated_at
```

---

# 50. PLANES INICIALES

## STARTER

```text
1 sucursal
3 usuarios
100 reparaciones/mes
5 GB
tracking QR
```

## BUSINESS

```text
3 sucursales
15 usuarios
1000 reparaciones/mes
50 GB
WhatsApp
reportes avanzados
```

## ENTERPRISE

```text
Personalizado
```

Los valores deben ser configurables desde Super Admin.

---

# 51. USAGE METRICS

Registrar:

```text
repair_count
storage_bytes
users_count
branches_count
notification_count
```

No ejecutar consultas costosas constantemente para obtener métricas.

Crear agregaciones cuando sea necesario.

---

# 52. LÍMITES

Antes de:

* crear usuario
* crear sucursal
* crear reparación
* subir imagen

verificar límites del plan.

Cuando se alcance límite:

```text
Has alcanzado el límite de tu plan.

Actualizar plan
```

---

# 53. AUDITORÍA

Crear:

```text
audit_logs
```

Campos:

```text
id
tenant_id
user_id
action
entity_type
entity_id
old_values jsonb
new_values jsonb
ip_address
user_agent
created_at
```

Auditar:

* creación
* actualización
* eliminación
* cambio de estado
* cambio de precio
* aprobación
* rechazo
* inventario
* pagos
* permisos
* configuración
* revocación QR

---

# 54. REPORTES

Crear:

```text
/reports
```

Reportes:

```text
reparaciones
ingresos
inventario
técnicos
marcas
servicios
garantías
```

---

# 55. KPIs

Calcular:

```text
Total Repairs
Average Repair Time
Approval Rate
Completion Rate
Revenue
Average Ticket
Technician Productivity
Warranty Rate
Gross Margin
```

---

# 56. DASHBOARD

Ruta:

```text
/dashboard
```

KPIs:

```text
Reparaciones activas
Diagnóstico pendiente
Aprobaciones pendientes
Esperando repuesto
En reparación
Pruebas
Listos
Entregados hoy
Ingresos
```

Alertas:

```text
Stock bajo
Reparaciones retrasadas
Cotizaciones pendientes
Equipos listos
```

---

# 57. VISTAS COMPLETAS

## Auth

```text
/login
/register
/forgot-password
/reset-password
```

## Onboarding

```text
/onboarding
/onboarding/business
/onboarding/branch
/onboarding/team
/onboarding/plan
```

## Dashboard

```text
/dashboard
```

## Customers

```text
/customers
/customers/new
/customers/[id]
/customers/[id]/edit
```

## Devices

```text
/devices
/devices/[id]
```

## Repairs

```text
/repairs
/repairs/new
/repairs/[id]
/repairs/[id]/edit
```

## Intake

```text
/repairs/new/intake
```

## Diagnosis

```text
/repairs/[id]/diagnosis
```

## Quotes

```text
/quotes
/quotes/[id]
```

## Inventory

```text
/inventory
/inventory/parts
/inventory/parts/[id]
/inventory/movements
/inventory/suppliers
```

## Payments

```text
/payments
```

## Invoices

```text
/invoices
/invoices/[id]
```

## Team

```text
/team
/team/[id]
```

## Reports

```text
/reports
/reports/repairs
/reports/revenue
/reports/inventory
/reports/technicians
```

## Settings

```text
/settings
/settings/business
/settings/branches
/settings/users
/settings/roles
/settings/checklists
/settings/statuses
/settings/notifications
/settings/integrations
/settings/billing
```

## Tracking

```text
/r/[public_token]
```

## Super Admin

```text
/super-admin
/super-admin/tenants
/super-admin/tenants/[id]
/super-admin/plans
/super-admin/subscriptions
/super-admin/usage
/system
```

---

# 58. CUSTOMER DETAIL

Mostrar:

```text
Información
Historial
Dispositivos
Reparaciones
Pagos
Garantías
```

---

# 59. DEVICE DETAIL

Mostrar:

```text
Información
IMEI
Serial
Historial
Reparaciones
Fotos
```

---

# 60. REPAIR DETAIL

Usar tabs:

```text
Resumen
Cliente
Equipo
Recepción
Diagnóstico
Checklist
Cotización
Repuestos
Fotos
Timeline
Pagos
Garantía
Auditoría
```

---

# 61. REPAIR HEADER

Debe mostrar:

```text
Repair Number
Device
Customer
Status
Priority
Technician
Branch
QR
Actions
```

Acciones:

```text
Edit
Change Status
Print
Open Tracking
Generate QR
```

---

# 62. RECEPCIÓN

Wizard:

```text
1 Cliente
2 Dispositivo
3 Problema
4 Inspección
5 Checklist
6 Accesorios
7 Fotos
8 Firma
9 Confirmar
```

Al finalizar:

```text
crear repair
generar repair_number
generar public_token
generar QR
crear evento
crear status history
generar recibo
```

---

# 63. FOTOS DE RECEPCIÓN

Checklist visual:

```text
Frente
Atrás
Lateral izquierdo
Lateral derecho
Pantalla
Daños
```

Usar cámara móvil cuando esté disponible.

---

# 64. FIRMA

Permitir firma táctil.

Guardar en ImageKit.

Registrar:

```text
signed_at
signed_by
media_id
```

---

# 65. TÉCNICO

Crear:

```text
/technician
```

Mostrar:

```text
Mis reparaciones
Pendientes
En reparación
Pruebas
Finalizadas
```

Acciones rápidas:

```text
Cambiar estado
Diagnóstico
Checklist
Fotos
Repuestos
Notas
```

---

# 66. RECEPCIONISTA

Crear vista rápida:

```text
/reception
```

Acciones:

```text
Nueva reparación
Buscar cliente
Buscar orden
Entregar equipo
Registrar pago
Imprimir
Escanear QR
```

---

# 67. ENTREGA

Flujo:

```text
Buscar orden
↓
Ver cliente
↓
Ver saldo
↓
Registrar pago
↓
Revisar pruebas
↓
Capturar firma
↓
DELIVERED
↓
Evento
↓
Comprobante
```

---

# 68. PRUEBAS FINALES

Antes de `READY` permitir reglas como:

```text
Pantalla
Touch
Cámara
Micrófono
Altavoz
Carga
Face ID
Wi-Fi
Bluetooth
```

El tenant podrá definir cuáles son obligatorias.

---

# 69. REGLAS DE NEGOCIO

Ejemplos:

```text
No READY si faltan pruebas obligatorias.

No DELIVERED si existe saldo pendiente,
salvo que la configuración permita excepción.

No usar stock negativo,
salvo configuración administrativa explícita.

No aprobar cotización sin registro.

No eliminar una reparación entregada físicamente.
Usar mecanismos de cancelación/anulación y auditoría.
```

---

# 70. TRÁFICO PÚBLICO

Aplicar:

* rate limiting
* anti-enumeration
* tokens seguros
* headers
* cache control
* noindex
* nofollow

El portal no debe convertirse en una API pública de clientes.

---

# 71. SEO DEL PORTAL

Las órdenes individuales no deben indexarse.

Agregar metadata apropiada:

```text
noindex
nofollow
```

---

# 72. RESPONSIVE

El sistema debe funcionar perfectamente en:

```text
desktop
tablet
mobile
```

El portal público debe diseñarse principalmente mobile-first.

---

# 73. DESIGN SYSTEM

Crear tokens para:

```text
primary
success
warning
danger
info
neutral
```

Componentes:

```text
Button
Input
Select
Textarea
Dialog
Drawer
Table
Badge
Card
Tabs
Timeline
Toast
Dropdown
Command Menu
Date Picker
Uploader
Stepper
```

---

# 74. ESTADOS DE UI

Implementar:

```text
loading
skeleton
empty
error
success
confirmation
```

Nunca dejar una pantalla vacía sin contexto.

---

# 75. ACCESIBILIDAD

Cumplir buenas prácticas:

* labels
* keyboard navigation
* contrast
* focus states
* aria cuando corresponda
* mensajes de error comprensibles

---

# 76. PERFORMANCE

Usar:

* server components donde tenga sentido
* paginación
* índices
* queries selectivas
* lazy loading
* image optimization
* cache
* debounce
* background tasks

No cargar todos los registros de una tabla.

---

# 77. SUPABASE CLIENTS

Separar:

```text
lib/supabase/client.ts
lib/supabase/server.ts
```

Utilizar cliente browser para Client Components.

Utilizar cliente server para:

* Server Components
* Server Actions
* Route Handlers

Este es el patrón documentado actualmente por Supabase para Next.js.

---

# 78. EDGE FUNCTIONS

Utilizar Edge Functions para:

* ImageKit auth
* WhatsApp
* webhooks
* tareas privilegiadas
* integración de pagos
* notificaciones
* procesamiento asíncrono

Las Edge Functions autenticadas deben validar el JWT y mantener RLS cuando la operación corresponda al usuario autenticado. Supabase documenta este patrón explícitamente.

---

# 79. SUPABASE DATABASE FUNCTIONS

Utilizar PostgreSQL Functions/RPC únicamente cuando aporte valor.

Ejemplos:

```text
change_repair_status()
consume_inventory_part()
create_repair()
create_quote()
record_payment()
```

Usar funciones transaccionales para operaciones críticas.

---

# 80. RLS

Todas las tablas tenant-scoped deben tener políticas apropiadas.

Ejemplo conceptual:

```text
auth.uid()
↓
tenant_memberships
↓
tenant_id
↓
access to tenant-scoped row
```

Crear funciones auxiliares si simplifican las políticas.

Nunca utilizar una policy demasiado permisiva como:

```sql
true
```

en datos de negocio.

---

# 81. RLS PARA SUPER ADMIN

No permitir automáticamente:

```text
is_super_admin = true
```

desde frontend.

Definir estrategia segura para privilegios elevados.

Preferir funciones seguras, claims/control administrativo y acceso server-side apropiado.

---

# 82. STORAGE

No usar Supabase Storage para las imágenes principales si ImageKit es el proveedor definido.

Supabase puede utilizarse para otros objetos técnicos si posteriormente resulta necesario, pero la fuente principal de media del producto será ImageKit.

---

# 83. PUBLIC DATA MODEL

Crear una capa específica:

```text
PublicRepairDTO
PublicTimelineEvent
PublicMedia
```

No devolver modelos completos de DB.

---

# 84. API/ROUTES

Crear endpoints coherentes.

Ejemplos:

```text
GET    /api/customers
POST   /api/customers
GET    /api/customers/:id
PATCH  /api/customers/:id

GET    /api/devices
POST   /api/devices

GET    /api/repairs
POST   /api/repairs
GET    /api/repairs/:id
PATCH  /api/repairs/:id

POST   /api/repairs/:id/status
POST   /api/repairs/:id/diagnosis
POST   /api/repairs/:id/checklist
POST   /api/repairs/:id/parts
POST   /api/repairs/:id/media

GET    /api/public/repairs/:token

POST   /api/media/auth
```

No permitir que cualquier frontend modifique directamente datos críticos sin validación.

---

# 85. DATABASE NAMING

Utilizar nombres consistentes.

Preferir:

```text
snake_case
```

para columnas PostgreSQL.

Ejemplo:

```text
created_at
updated_at
tenant_id
repair_order_id
```

---

# 86. UUID

Usar UUID como IDs internos.

No usar:

```text
1
2
3
4
```

como IDs públicos.

---

# 87. SOFT DELETE

Usarlo donde tenga sentido:

```text
customers
devices
repair_orders
parts
suppliers
```

No utilizarlo indiscriminadamente.

---

# 88. FOREIGN KEYS

Definir:

* FK
* constraints
* indexes
* cascading rules

correctamente.

No depender solamente de validación frontend.

---

# 89. TRANSACTIONS

Operaciones críticas deben ser atómicas.

Ejemplo:

```text
create repair
+
status history
+
event
+
customer/device relation
```

Otro:

```text
consume part
+
update stock
+
stock movement
+
repair_part
```

---

# 90. SEARCH

Búsqueda global:

```text
cliente
teléfono
IMEI
serial
repair number
```

Siempre respetando tenant.

---

# 91. DASHBOARD QUERIES

No hacer 30 queries independientes cada vez que se carga dashboard.

Crear vistas, funciones agregadas o consultas optimizadas cuando sea necesario.

---

# 92. NOTIFICATION QUEUE

Inicialmente utilizar:

```text
Supabase Edge Functions
```

y mecanismos de background compatibles.

No introducir Redis/BullMQ desde el principio sin una necesidad real.

Agregar Redis únicamente cuando exista una justificación de escala/colas persistentes.

---

# 93. EMAIL

Crear una abstracción:

```text
EmailProvider
```

para poder conectar posteriormente:

* Resend
* SendGrid
* Amazon SES
* otro proveedor

No acoplar el dominio a un proveedor concreto.

---

# 94. WHATSAPP

Crear:

```text
WhatsAppProvider
```

No acoplar el core a Meta Cloud API directamente.

Debe ser posible sustituir proveedor posteriormente.

---

# 95. PAYMENTS SaaS

Preparar:

```text
BillingProvider
```

Inicialmente compatible con:

```text
Stripe
```

pero abstraído.

---

# 96. USAGE BILLING

Permitir métricas por:

```text
tenant
month
metric
value
```

---

# 97. AUDIT LOGS

Los audit logs no deben ser modificables desde UI normal.

Restringir lectura por rol.

---

# 98. DATA PRIVACY

Datos especialmente sensibles:

```text
IMEI
Serial
Passcode
Document number
Payments
Private photos
Internal technical notes
```

No mostrar datos sensibles en el portal público.

---

# 99. PORTAL CLIENTE — INFORMACIÓN PERMITIDA

Puede mostrar:

```text
repair number
brand
model
service
current status
timeline
estimated date
public photos
public final tests
public message
```

---

# 100. PORTAL CLIENTE — INFORMACIÓN PROHIBIDA

No mostrar:

```text
private notes
technical cost
profit
supplier
full IMEI
passcode
internal documents
private photos
employee personal information
customer internal notes
```

---

# 101. RECEIPTS

Crear generación de recibos:

```text
A4
Thermal 58mm
Thermal 80mm
```

Contenido:

```text
Business logo
Business name
Customer
Repair number
Device
Problem
Received date
Terms
QR
Tracking URL
```

---

# 102. EXPORTS

Permitir:

```text
CSV Customers
CSV Repairs
CSV Inventory
CSV Payments
```

Respetando permisos y tenant.

---

# 103. IMPORTS

Preparar:

```text
Customers CSV
Inventory CSV
```

con preview antes de importar.

---

# 104. ERD

Crear ERD documentado.

Relaciones principales:

```text
Tenant
 ├── Branches
 ├── Users
 ├── Customers
 │    └── Devices
 │         └── Repair Orders
 │              ├── Intake
 │              ├── Diagnostics
 │              ├── Checklist
 │              ├── Status History
 │              ├── Events
 │              ├── Quotes
 │              ├── Parts
 │              ├── Media
 │              ├── Payments
 │              └── Warranty
 │
 ├── Inventory
 ├── Suppliers
 ├── Notifications
 ├── Audit Logs
 └── Subscription
```

---

# 105. DOCUMENTACIÓN

Crear:

```text
README.md
docs/architecture.md
docs/database.md
docs/security.md
docs/rls.md
docs/imagekit.md
docs/api.md
docs/deployment.md
docs/roadmap.md
```

---

# 106. ENVIRONMENT VARIABLES

Usar:

```text
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=

SUPABASE_SERVICE_ROLE_KEY=

IMAGEKIT_PUBLIC_KEY=
IMAGEKIT_PRIVATE_KEY=
IMAGEKIT_URL_ENDPOINT=

NEXT_PUBLIC_APP_URL=
NEXT_PUBLIC_TRACKING_URL=

EMAIL_API_KEY=
WHATSAPP_API_KEY=

STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
```

Nunca commitear secretos.

La documentación actual de Supabase utiliza la publishable key para el cliente y reserva claves/credenciales privilegiadas para el lado servidor.

---

# 107. SEED DATA

Crear un tenant demo:

```text
RepairFlow Demo
```

Con:

```text
3 usuarios
10 clientes
12 dispositivos
20 reparaciones
20 events
10 parts
3 suppliers
5 quotes
payments
sample statuses
sample checklist
```

---

# 108. TESTING

Implementar:

## Unit

* validators
* pricing
* permissions
* status transitions

## Integration

* Supabase
* RLS
* inventory
* repair creation
* media metadata

## E2E

Escenario:

```text
login
→ create customer
→ create device
→ create repair
→ generate QR
→ open portal
→ change status
→ verify portal update
→ add part
→ verify inventory
→ mark READY
→ verify notification
```

---

# 109. TEST DE AISLAMIENTO

Crear obligatoriamente:

```text
Tenant A
Tenant B
```

Probar:

```text
A → acceder cliente B = DENIED
A → acceder dispositivo B = DENIED
A → acceder reparación B = DENIED
A → acceder invoice B = DENIED
A → acceder media B = DENIED
A → modificar datos B = DENIED
```

No considerar terminado el proyecto sin estas pruebas.

---

# 110. TEST DE PUBLIC TRACKING

Probar:

```text
valid token → SUCCESS
invalid token → 404
revoked token → denied
valid token → only public data
```

---

# 111. TEST DE INVENTORY

Probar:

```text
stock = 10
use = 2
stock = 8
movement created
repair_part created
```

No permitir inconsistencias.

---

# 112. TEST DE ROLES

Probar:

```text
Technician
→ cannot manage subscriptions

Reception
→ cannot edit inventory configuration

Inventory
→ cannot modify billing

Viewer
→ cannot modify data
```

---

# 113. TEST DE ESTADOS

Validar transiciones.

Ejemplo:

```text
RECEIVED → DIAGNOSING
DIAGNOSING → WAITING_APPROVAL
WAITING_APPROVAL → APPROVED
APPROVED → IN_REPAIR
IN_REPAIR → TESTING
TESTING → READY
READY → DELIVERED
```

Permitir excepciones configurables cuando corresponda.

---

# 114. ROADMAP GENERAL

# FASE 0 — ARCHITECTURE

Objetivo:

Definir el sistema antes de programar.

Crear:

```text
architecture.md
database.md
ERD
routes map
permissions matrix
RLS strategy
ImageKit strategy
```

Resultado:

Arquitectura aprobada.

---

# FASE 1 — FOUNDATION

Implementar:

```text
Next.js
TypeScript
Tailwind
shadcn
Supabase
Auth
SSR
environment setup
routing
layout
```

Crear:

```text
login
register
forgot password
```

Resultado:

Usuario puede autenticarse correctamente.

---

# FASE 2 — MULTI-TENANCY

Implementar:

```text
tenants
profiles
memberships
roles
permissions
branches
RLS
tenant context
```

Crear:

```text
onboarding
business setup
branch setup
user setup
```

Resultado:

Dos tenants completamente aislados.

---

# FASE 3 — CUSTOMERS + DEVICES

Implementar:

```text
customers
devices
device_history
```

Vistas:

```text
customers
customer detail
devices
device detail
```

Resultado:

Cliente puede tener múltiples dispositivos e historial.

---

# FASE 4 — REPAIR CORE

Implementar:

```text
repair_orders
repair_statuses
repair_status_history
repair_events
```

Vistas:

```text
repairs
repair detail
new repair
```

Resultado:

Flujo básico de reparación funcionando.

---

# FASE 5 — INTAKE

Implementar:

```text
repair_intake
physical inspection
accessories
signature
checklist
```

Además:

```text
QR
public_token
receipt
```

Resultado:

Al recibir un equipo se genera una orden completamente documentada.

---

# FASE 6 — IMAGEKIT

Implementar:

```text
media auth
ImageKit upload
media metadata
public/private visibility
gallery
camera upload
```

Resultado:

Fotos almacenadas correctamente fuera de PostgreSQL.

---

# FASE 7 — PUBLIC TRACKING

Implementar:

```text
/r/[public_token]
Public DTO
Timeline
Public photos
Public status
```

Resultado:

Cliente puede escanear QR y consultar la reparación.

---

# FASE 8 — TECHNICIAN WORKFLOW

Implementar:

```text
technician dashboard
diagnostics
checklists
repair notes
status changes
final tests
```

Resultado:

El técnico puede gestionar una reparación de principio a fin.

---

# FASE 9 — INVENTORY

Implementar:

```text
parts
suppliers
stock
movements
repair parts
low stock
```

Resultado:

Repuestos ligados a reparaciones y stock correcto.

---

# FASE 10 — QUOTES + PAYMENTS

Implementar:

```text
quotes
quote items
approval
payments
invoices
```

Resultado:

Flujo comercial completo.

---

# FASE 11 — DELIVERY + WARRANTY

Implementar:

```text
delivery workflow
final confirmation
signature
warranty
```

Resultado:

Entrega y garantía integradas.

---

# FASE 12 — NOTIFICATIONS

Implementar:

```text
email
WhatsApp abstraction
templates
events
Edge Functions
```

Automatizar:

```text
RECEIVED
DIAGNOSTIC_COMPLETE
QUOTE_READY
APPROVED
IN_REPAIR
READY
DELIVERED
```

---

# FASE 13 — REALTIME

Implementar actualizaciones en vivo donde aporten valor.

Principalmente:

```text
Portal tracking
Technician dashboard
Reception dashboard
```

No exponer información interna.

---

# FASE 14 — REPORTS

Implementar:

```text
repair reports
revenue
inventory
technicians
customers
warranty
```

---

# FASE 15 — SaaS BILLING

Implementar:

```text
plans
subscriptions
usage
limits
billing provider
webhooks
upgrade/downgrade
```

---

# FASE 16 — SUPER ADMIN

Implementar:

```text
tenant management
plans
subscriptions
usage
platform metrics
support tools
```

---

# FASE 17 — HARDENING

Auditar:

```text
RLS
Auth
RBAC
API
public tracking
ImageKit
rate limiting
audit logs
secrets
```

Realizar pruebas de penetración básicas.

---

# FASE 18 — PERFORMANCE

Analizar:

```text
query performance
indexes
dashboard loading
portal loading
image loading
cache
bundle size
```

---

# FASE 19 — QA

Ejecutar:

```text
unit tests
integration tests
RLS tests
E2E
mobile testing
browser testing
permission testing
```

---

# FASE 20 — PRODUCTION

Preparar:

```text
Vercel
Supabase Production
ImageKit Production
domain
DNS
SSL
monitoring
backups
migrations
CI/CD
```

---

# 115. ROADMAP POST-MVP

Después del MVP:

```text
WhatsApp completo
Stripe
Multi-location inventory
Purchase orders
Supplier management
Customer portal account
Appointment booking
Pickup/delivery
Technician commissions
Advanced analytics
Automated warranty handling
Public API
Mobile PWA
Native app
White-label
Franchise support
```

---

# 116. POSIBLES FUNCIONES FUTURAS

Preparar arquitectura para:

```text
AI diagnosis assistant
OCR
IMEI lookup
Apple/Android device information
automated repair estimation
AI photo damage detection
customer segmentation
predictive inventory
technician performance recommendations
```

No implementar estas funciones inicialmente.

La arquitectura solamente debe permitir agregarlas posteriormente.

---

# 117. REGLA DE DESARROLLO POR FASE

Después de cada fase:

```text
npm run lint
npm run typecheck
npm test
npm run build
```

Además:

```text
run migration
verify RLS
verify permissions
verify tenant isolation
```

No continuar si existen errores estructurales.

---

# 118. GIT

Utilizar commits pequeños:

```text
feat(auth)
feat(tenancy)
feat(customers)
feat(repairs)
feat(intake)
feat(tracking)
feat(inventory)
feat(billing)
```

No hacer commits gigantes.

---

# 119. DOCUMENTACIÓN DE DECISIONES

Cuando exista una decisión arquitectónica importante:

documentarla en:

```text
docs/architecture.md
```

Ejemplos:

* estrategia multi-tenant
* RLS
* ImageKit
* public tokens
* realtime
* billing
* edge functions

---

# 120. PRINCIPIOS DE CALIDAD

Prioridad:

```text
1. Seguridad
2. Integridad de datos
3. Multi-tenancy
4. Mantenibilidad
5. UX
6. Performance
7. Escalabilidad
8. Features
```

No sacrificar seguridad para implementar una feature rápidamente.

---

# 121. PROHIBICIONES

No:

* usar IDs secuenciales como secretos
* exponer `service_role`
* exponer ImageKit private key
* confiar en validaciones frontend
* usar `tenant_id` recibido arbitrariamente desde body
* devolver modelos completos al portal público
* almacenar imágenes binarias en PostgreSQL
* permitir acceso cross-tenant
* hardcodear precios de SaaS
* acoplar WhatsApp a todo el dominio
* crear archivos gigantes
* colocar toda la lógica en componentes React
* duplicar lógica de negocio
* omitir tests RLS

---

# 122. PRIMERA EJECUCIÓN DEL AGENTE

Antes de escribir funcionalidad de negocio, debes devolver:

## 1. Arquitectura

## 2. Diagrama de componentes

## 3. ERD

## 4. Schema SQL / migraciones

## 5. Estrategia RLS

## 6. RBAC

## 7. Mapa de rutas

## 8. Estructura de carpetas

## 9. Estrategia ImageKit

## 10. Roadmap

Después comenzar implementación por Fases 1 → 2 → 3.

No comenzar por la landing page.

---

# 123. CRITERIO FINAL DE ACEPTACIÓN

El sistema debe ser capaz de ejecutar este escenario:

```text
Tenant A crea taller
↓
Usuario entra
↓
Crea cliente
↓
Crea iPhone
↓
Crea reparación
↓
Sistema genera Repair Number
↓
Sistema genera Public Token
↓
Sistema genera QR
↓
Recepción hace inspección
↓
Sube fotos a ImageKit
↓
Cliente firma
↓
Técnico diagnostica
↓
Se crea cotización
↓
Cliente aprueba
↓
Técnico repara
↓
Consume repuesto
↓
Inventario disminuye
↓
Realiza pruebas
↓
Estado READY
↓
WhatsApp/Email
↓
Cliente escanea QR
↓
Ve timeline
↓
Ve fotos públicas
↓
Llega al taller
↓
Realiza pago
↓
Firma entrega
↓
DELIVERED
↓
Se genera garantía
```

Al mismo tiempo:

```text
Tenant B
```

debe continuar viendo exclusivamente sus propios datos.

---

# 124. OBJETIVO FINAL

El resultado debe sentirse como:

**Un ERP/CRM especializado para talleres de celulares con tracking de reparación estilo DHL/Amazon.**

La experiencia central debe ser:

```text
Taller
→ recibe
→ diagnostica
→ cotiza
→ repara
→ prueba
→ entrega
```

mientras:

```text
Cliente
→ escanea
→ consulta
→ recibe actualizaciones
→ recoge
```

Todo esto sobre:

```text
Next.js
+
Supabase
+
PostgreSQL
+
RLS
+
Supabase Auth
+
Realtime
+
Edge Functions
+
ImageKit
```

La arquitectura debe permitir evolucionar posteriormente a un SaaS con cientos o miles de talleres sin rehacer el núcleo de datos.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/23f42ecd-0b4a-4d29-bfe6-afdcea39a0ca).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
