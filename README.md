# Innova ARCO

Plataforma SaaS para gestionar los **derechos ARCO** (Acceso, Rectificación,
Cancelación y Oposición) de los conductores de camiones mineros cuyos datos
—incluida biometría sensible— son capturados por cámaras de seguridad.

El sistema conecta a **tres actores**:

| Rol | Qué hace |
| --- | --- |
| **Empresa minera (MINING)** | Tenant central: invita a sus conductores y a las proveedoras de cámaras, define los turnos (patente + hora de inicio), sube las grabaciones con su información extra y configura el plazo de borrado. |
| **Proveedor de cámaras (PROVIDER)** | Empresa contratada por la minera. Recibe en su panel una fila pidiendo eliminar de sus propios sistemas las grabaciones reclamadas, y declara el borrado. |
| **Conductor (DRIVER)** | Puede pertenecer a varias mineras. Ve las grabaciones asignadas a sus turnos, solicita el borrado y ve si la proveedora confirmó el borrado. |

---

## Stack

- **Next.js 16** (App Router, Server Actions, Turbopack) + **TypeScript 5.9**
- **React 19** · **Tailwind CSS v4** · **shadcn/ui** (Radix UI)
- **Supabase** (PostgreSQL + Auth con Google OAuth + Row Level Security + **Storage**)
- **Resend** (notificaciones por correo — **opcional**, la app funciona sin él)
- **Zod** (validación) · **next-themes** (modo claro/oscuro) · **sonner** (toasts)
- Despliegue: **Vercel** (app + cron) + **Supabase** (base de datos, auth y storage). **No requiere dominio propio.**

> Nota: en Next.js 16 el archivo `middleware.ts` se renombró a **`proxy.ts`**
> (función `proxy()`, runtime Node.js). Este proyecto ya usa la convención nueva.

---

## Requisitos previos

- **Node.js ≥ 20.9** (se desarrolló y verificó con **Node 24.21.0**)
- Una cuenta de **Supabase** (gratuita)
- Una cuenta de **Resend** (gratuita)
- Credenciales de **Google Cloud** para el OAuth

---

## 1. Instalación

```bash
npm install
```

Scripts disponibles:

```bash
npm run dev        # servidor de desarrollo
npm run build      # build de producción
npm run start      # servir el build
npm run lint       # ESLint
npm run typecheck  # tsc --noEmit
```

---

## 2. Variables de entorno

Copia `.env.example` a `.env.local` y completa los valores:

```bash
cp .env.example .env.local
```

| Variable | Obligatoria | Descripción |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | ✅ | Project URL de Supabase (`Settings → Data API`). |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ✅ | Clave pública `anon` / `publishable`. **Segura para el navegador.** |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | ➖ | Alias opcional: si no defines la anterior, se lee esta. |
| `SUPABASE_SERVICE_ROLE_KEY` | ✅ | Clave `service_role`. **Solo servidor.** Necesaria para el almacenamiento (subida/borrado en Storage) y el cron de borrado. |
| `NEXT_PUBLIC_SITE_URL` | ✅ | URL base pública (`http://localhost:3000` en local). Se usa para los enlaces de los correos y el `redirectTo` de OAuth. |
| `RESEND_API_KEY` | ➖ | **Opcional.** API key de Resend. Si falta, la app funciona igual: no se envían correos y las invitaciones/reclamos se gestionan dentro de la app. |
| `RESEND_FROM_EMAIL` | ➖ | **Opcional.** Remitente. Requiere dominio verificado en Resend (no necesitas dominio propio). Para pruebas: `"Innova ARCO <onboarding@resend.dev>"`. |
| `STORAGE_DRIVER` | ➖ | Driver de almacenamiento de video. Por defecto `supabase`. |
| `STORAGE_BUCKET` | ➖ | Bucket privado de Supabase Storage. Por defecto `recordings`. |
| `CRON_SECRET` | ➖ | Secreto que protege `GET /api/cron/process-deletions` (lo envía Vercel Cron como `Authorization: Bearer …`). |
| `NOTIFY_WEBHOOK_SECRET` | ➖ | *(legado)* Secreto del webhook de notificación. Ya no es necesario. |

> El código acepta tanto el nombre histórico (`..._ANON_KEY`) como el nuevo
> (`..._PUBLISHABLE_KEY`) para la clave pública.

---

## 3. Configurar Supabase

### 3.1 Crear el proyecto

1. Entra a [supabase.com/dashboard](https://supabase.com/dashboard) → **New project**.
2. Copia el **Project URL** y la **anon/publishable key** (`Settings → API Keys`)
   a tu `.env.local`.

### 3.2 Aplicar las migraciones

Las migraciones están en `supabase/migrations` y **deben ejecutarse en orden**.
Cada archivo es idempotente, así que puedes volver a ejecutarlos sin romper nada.

| Archivo | Contenido |
| --- | --- |
| `0001_schema.sql` | Enums, tablas e índices base (`companies`, `users`, `video_metadata`, `deletion_requests`, `user_invites`). |
| `0002_functions.sql` | Funciones `SECURITY DEFINER` iniciales. |
| `0003_policies.sql` | Políticas de Row Level Security iniciales. |
| `0004_triggers.sql` | Provisionamiento de usuarios y guardas iniciales. |
| `0005_schema_evolution.sql` | **Modelo multi-tenant**: `memberships`, `company_relations`, `shifts`; `companies.deletion_grace_days`; nuevas columnas en `video_metadata`/`deletion_requests`; migra `users.company_id` → `memberships` y lo elimina. |
| `0006_functions.sql` | Helpers de membresías/relaciones, *matching* de turnos, `create_company` y `process_due_deletions`. |
| `0007_policies.sql` | RLS multi-tenant para las tres roles. |
| `0008_triggers.sql` | `handle_new_user` con invitaciones, *matching* automático video↔turno y ciclo de los reclamos. |
| `0009_deletion_cron.sql` | Crea el bucket privado `recordings` y programa el borrado diario con `pg_cron`. |
| `0010_storage_limits.sql` | Fija el límite de tamaño del bucket `recordings` (50 MB). |
| `0011_recording_access_log.sql` | Bitácora inmutable de accesos a grabaciones (ARCO «acceso»). |
| `0012_explicit_shift_assignment.sql` | Asignación **manual** de la grabación al turno: elimina el *matching* automático por patente + hora y añade `UNIQUE(shift_id)`. |
| `0013_weekly_schedule.sql` | **Horario semanal**: tabla `shift_templates`, `shifts.template_id`, `generate_shift_occurrences()`, cron diario y *backfill* desde los turnos existentes. |

**Opción A — SQL Editor (sin instalar nada)**

Abre `Dashboard → SQL Editor` y pega y ejecuta, uno por uno:
`0001_schema.sql` → `0002_functions.sql` → `0003_policies.sql` → `0004_triggers.sql`.

**Opción B — Supabase CLI**

```bash
supabase link --project-ref <tu-project-ref>
supabase db push
```

### 3.3 Cargar datos de demo (opcional)

Ejecuta `supabase/seed.sql` en el SQL Editor. Crea:

- 2 empresas mineras y 2 proveedores de cámaras (con `support_email`).
- 4 **invitaciones** (`user_invites`) que asignan rol `MINING` / `PROVIDER`.
- 3 registros de video de ejemplo para `conductor.demo@gmail.com`.

> 🔴 **Importante:** reemplaza los correos del seed por **tus propias cuentas de
> Google**. El rol se decide por la tabla `user_invites`: cualquier email que
> **no** esté ahí entra como `DRIVER`.

```sql
-- Ejemplo: convertir tu correo en proveedor
insert into public.user_invites (email, role, company_id)
values ('tu-correo@gmail.com', 'PROVIDER', '33333333-3333-3333-3333-333333333333')
on conflict (email) do update set role = excluded.role, company_id = excluded.company_id;
```

### 3.4 Modelo de datos

```
companies ──┬──< memberships >─── users        (N:M: conductor ↔ mineras, staff, …)
            ├──< company_relations             (minera invita a la proveedora)
            ├──< shift_templates               (HORARIO semanal: día + hora + patente)
            ├──< shifts                        (turnos con fecha generados del horario)
            └──< video_metadata                (sube la minera; archivo en Storage)
                     │   ▲  asignación manual (turno elegido en el formulario)
                     ▼   │
                  shifts ─┘
video_metadata ──< deletion_requests >── users  (reclamo ARCO del conductor)
user_invites  (email → role, bootstrap solo service_role)
```

- `users.role` es el rol activo; se puede cambiar libremente entre los roles de
  las membresías del usuario (o desde el panel de administración).
- `users.active_company_id` es la empresa activa (entre sus membresías).
- `video_metadata.extra_info` (jsonb) es el «campo con información extra» que se
  borra junto con la grabación.
- `deletion_requests.provider_declared_at` es el campo que el conductor ve para
  saber si la proveedora declaró el borrado en sus sistemas.

---

## 4. Configurar Google OAuth

> 💡 **No necesitas un dominio comprado.** Google solo exige registrar el
> *callback* de Supabase (`https://<ref>.supabase.co/auth/v1/callback`) y la app
> funciona en `http://localhost:3000` y en el dominio por defecto de Vercel
> (`https://<proyecto>.vercel.app`). Mientras el *OAuth consent screen* esté en
> modo **Testing**, agrega tus correos en **Test users**.

### 4.1 Google Cloud Console

1. Crea un proyecto en [console.cloud.google.com](https://console.cloud.google.com).
2. **APIs & Services → OAuth consent screen** → tipo *External* → completa los
   datos. Scopes necesarios: `openid`, `.../auth/userinfo.email`,
   `.../auth/userinfo.profile`.
3. **Credentials → Create credentials → OAuth client ID → Web application**.
4. **Authorized redirect URIs**: agrega **únicamente** el callback de Supabase.

```
https://<tu-project-ref>.supabase.co/auth/v1/callback
```

   Google redirige a Supabase y Supabase vuelve a redirigir a tu aplicación.
   Las URLs de **tu app** (`/auth/callback`) **no van en Google**: se autorizan
   en **Supabase** (`Authentication → URL Configuration`, ver 4.2).

5. Guarda el **Client ID** y **Client Secret**.

### 4.2 Supabase

`Dashboard → Authentication → Providers → Google`:

- Activa el provider.
- Pega el **Client ID** y **Client Secret**.
- Guarda.

`Dashboard → Authentication → URL Configuration`:

- **Site URL**: `http://localhost:3000` (y luego tu dominio de Vercel).
- **Redirect URLs**: añade `http://localhost:3000/**` y `https://tu-dominio.vercel.app/**`.

> Aquí se autorizan las URLs de callback de **tu aplicación** (`/auth/callback`).
> Si falta el dominio, Supabase rechazará el `redirectTo` con el error
> *“redirect_uri is not allowed”*.

### 4.3 Cómo se captura el rol

Al primer inicio de sesión, el trigger `handle_new_user` (migración `0008`):

1. Busca invitaciones pendientes en `memberships` por el correo del usuario.
2. Si existe → asigna ese `role` y fija la empresa activa, activando además
   todas las membresías de ese correo.
3. Si no existe → busca en `user_invites` (bootstrap) y, si tampoco, crea al
   usuario como `DRIVER`. Sin empresa activa cae en el **onboarding**
   (`/onboarding`), donde puede aceptar invitaciones o registrar su empresa.

**Asignación libre de roles**

- Un usuario puede cambiar de rol entre las membresías activas que tenga
  (selector de empresa/rol en la cabecera).
- Un *platform admin* puede asignar cualquier rol desde `/admin`.

Para nombrar al primer administrador de la plataforma:

```sql
update public.users set is_platform_admin = true where email = 'tu-correo@gmail.com';
```

---

## 5. Correos (Resend) — OPCIONAL

**Puedes desplegar sin configurar Resend.** Si `RESEND_API_KEY` no está definida:

- Las invitaciones se aceptan **dentro de la app**: al iniciar sesión con el
  correo invitado, el usuario ve la invitación en `/onboarding`.
- Los reclamos y tickets aparecen en el panel de cada rol.
- No se envía ningún correo (los envíos son *best-effort* y quedan en logs `[ARCO]`).

Si quieres activar los correos:

1. Crea una API key en [resend.com/api-keys](https://resend.com/api-keys) y
   guárdala en `RESEND_API_KEY`.
2. Usa `RESEND_FROM_EMAIL="Innova ARCO <onboarding@resend.dev>"` para pruebas
   (**no requiere dominio propio**; con ese remitente Resend solo envía a tu
   propio correo), o verifica un dominio en **Domains** para producción.

---

## 5.bis Cron de borrado automático

El borrado vencido se ejecuta por dos vías complementarias:

1. **`pg_cron` en Supabase** (migración `0009`): job diario que llama a
   `public.process_due_deletions()`. No requiere configuración si `pg_cron`
   está disponible.
2. **Vercel Cron** → `GET /api/cron/process-deletions` (protegido por
   `CRON_SECRET`, se manda como `Authorization: Bearer …`). Además elimina el
   **archivo físico** de Supabase Storage.

`vercel.json` de ejemplo:

```json
{ "crons": [{ "path": "/api/cron/process-deletions", "schedule": "0 3 * * *" }] }
```

> Si no configuras ninguno, la minera puede forzar el borrado manualmente con el
> botón **Eliminar ahora** en `/mining/videos` y desde `/admin`.

---

## 6. Ejecutar en local

```bash
npm run dev
```

Abre <http://localhost:3000> e inicia sesión con Google.

**Enrutamiento por rol:** `/dashboard` redirige a cada usuario a su panel:

| Rol | Rutas |
| --- | --- |
| Sin empresa activa | `/onboarding` (aceptar invitación o registrar empresa) |
| DRIVER | `/driver` |
| PROVIDER | `/provider` · `/provider/deletions` · `/provider/relations` |
| MINING | `/mining` · `/mining/schedule` · `/mining/shifts` · `/mining/videos` · `/mining/members` · `/mining/providers` · `/mining/claims` · `/mining/access` · `/mining/settings` |
| Cualquiera (con sesión) | `/invitations` (aceptar invitaciones nuevas) · `/admin` (solo platform admin) |

---

## 7. Estructura del proyecto

```
Innova/
├─ app/
│  ├─ layout.tsx                  # ThemeProvider + Toaster + globals.css
│  ├─ page.tsx                    # landing pública
│  ├─ login/page.tsx              # inicio de sesión con Google
│  ├─ onboarding/page.tsx         # aceptar invitaciones / registrar empresa
│  ├─ dashboard/page.tsx          # router por rol
│  ├─ driver/                     # grabaciones asignadas + solicitar borrado
│  ├─ mining/                     # resumen · shifts · videos · members · providers · claims · settings
│  ├─ provider/                   # resumen · deletions (tickets) · relations
│  ├─ admin/                      # platform admin: asignación libre de roles
│  ├─ auth/callback/route.ts      # intercambio code → session (PKCE)
│  ├─ api/cron/process-deletions/route.ts  # borrado automático vencido
│  └─ api/recordings/[id]/route.ts         # streaming del video (URL nunca expuesta)
├─ actions/                       # Server Actions (auth, invitations, roles, shifts, videos, deletions, company)
├─ components/
│  ├─ ui/                         # primitivas shadcn/ui (Tailwind v4)
│  └─ *.tsx                       # tablas, formularios y botones de cada rol
├─ lib/
│  ├─ supabase/{client,server,proxy}.ts  # clientes browser / server / refresco de sesión
│  ├─ auth.ts                     # getSessionProfile · requireRole
│  ├─ email/{resend,templates}.ts # cliente Resend + plantilla HTML
│  ├─ format.ts                   # fechas (Intl, zona America/Santiago)
│  ├─ validation.ts               # esquemas Zod
│  └─ constants.ts                # etiquetas y rutas por rol
├─ types/{database,index,actions}.ts
├─ supabase/migrations/*.sql + seed.sql
├─ proxy.ts                       # Next 16 · refresco de sesión de Supabase
└─ .env.example
```

### Mutaciones (Server Actions)

Todas las escrituras pasan por Server Actions con validación Zod y `useActionState`:

| Acción | Archivo | Quién |
| --- | --- | --- |
| `signInWithGoogleAction` / `signOutAction` | `actions/auth.ts` | público |
| `createCompanyAction` | `actions/onboarding.ts` | cualquiera |
| `inviteDriverAction` / `inviteProviderAction` | `actions/invitations.ts` | MINING |
| `acceptInvitationAction` / `declineInvitationAction` / `acceptRelationAction` | `actions/invitations.ts` | invitado / PROVIDER |
| `revokeMembershipAction` | `actions/invitations.ts` | MINING |
| `setActiveCompanyAction` / `updateUserRoleAction` / `adminSetRoleAction` | `actions/roles.ts` | autenticado / admin |
| `createShiftAction` / `deleteShiftAction` | `actions/shifts.ts` | MINING |
| `createUploadUrlAction` / `createVideoMetadataAction` / `deleteRecordingNowAction` | `actions/videos.ts` | MINING |
| `requestDeletionAction` / `cancelDeletionRequestAction` | `actions/deletions.ts` | DRIVER |
| `declareProviderDeletionAction` | `actions/deletions.ts` | PROVIDER |
| `processDueDeletionsAction` | `actions/deletions.ts` | admin |
| `updateCompanySettingsAction` | `actions/company.ts` | MINING |

---

## 8. Seguridad: Row Level Security

Todas las tablas tienen RLS activado. Las políticas usan funciones
`SECURITY DEFINER` (`public.current_user_role()`, `public.current_company_id()`,
`public.is_member_of()`, `public.driver_can_view_video()`, …) para leer
`public.users`/`public.memberships` sin provocar el clásico error
*“infinite recursion detected in policy for relation users”*.

| Tabla | DRIVER | PROVIDER | MINING |
| --- | --- | --- | --- |
| `companies` | Lee las mineras/proveedoras visibles | Su empresa + mineras | Su empresa + proveedoras |
| `users` | Su propia fila | Su fila + conductores de sus tickets | Su fila + sus conductores |
| `memberships` | Sus filas / invitaciones a su correo | Filas de su empresa | Filas de su empresa (CRUD) |
| `company_relations` | — | Donde es `provider_id` | Sus relaciones (CRUD) |
| `shifts` | Donde `driver_user_id = auth.uid()` | Vía relaciones | CRUD de su empresa |
| `shift_templates` | Donde `driver_user_id = auth.uid()` | — | CRUD de su empresa |
| `video_metadata` | Asignados vía `shifts.matched_video_id` | Donde `provider_id = empresa` | CRUD de su empresa |
| `deletion_requests` | `driver_id = auth.uid()` (+ insert si está asignado) | Lectura + **update** solo de `provider_declared_*` | Lectura + update |
| `recording_access_log` | Sus accesos + los de sus grabaciones asignadas | — | Los accesos a sus grabaciones (+ admin) |
| `user_invites` | — | — | — (RLS sin políticas: solo `service_role`) |

Guardas y automatismos:

- `users.role` y `users.active_company_id` son **libres**; solo `is_platform_admin`
  queda controlado por el servidor.
- `video_metadata.shift_id` se fija **manualmente** en el formulario (la minera
  elige un **turno libre**, es decir con `matched_video_id is null`).
  `link_video_shift` copia el id al turno (`shifts.matched_video_id`) y un
  `UNIQUE(shift_id)` garantiza **1 grabación por turno**. Ya no existe *matching*
  automático por patente + hora.
- `deletion_requests` **BEFORE INSERT**: calcula `scheduled_deletion_at` según
  `companies.deletion_grace_days` y copia `provider_id`/`shift_id`.
- Una **proveedora** solo puede modificar `provider_declared_at`, `provider_declared_by`
  y `provider_note` (el resto lo conserva el trigger).
- `deletion_requests` tiene `UNIQUE(video_id)`: un video no puede tener dos reclamos.

> Para nombrar un administrador de plataforma:
> ```sql
> update public.users set is_platform_admin = true where email = '...';
> ```

---

## 8.bis Flujo de borrado y almacenamiento de video

**Almacenamiento:** las grabaciones (archivo + metadata) las sube la empresa
minera. El archivo va a un bucket **privado** de Supabase Storage (`recordings`)
mediante una *signed upload URL* (subida directa desde el navegador, evitando el
límite de tamaño de Vercel). La `storage_path` se guarda en
`video_metadata` y todas las lecturas/borrados se hacen en el servidor con
`service_role` (`lib/storage.ts`).

**Límites de tamaño (importante):**

- El archivo se sube **directo a Supabase** con una *signed upload URL*, por lo
  que **no** pasa por Vercel ni por un Server Action (no aplica el límite de
  1 MB de los Server Actions de Next.js, que solo afecta a la metadata).
- El tope lo pone **Supabase Storage**: *global file size limit* = **50 MB en el
  plan Free** (hasta 500 GB en Pro+). El bucket `recordings` se fija a 50 MB en la
  migración `0010`.
- La app valida el tamaño en el navegador y muestra un mensaje claro; el máximo
  se define con `DEFAULT_MAX_UPLOAD_MB` (`lib/constants.ts`) y se puede
  sobreescribir con la variable `STORAGE_MAX_UPLOAD_MB`.
- Para subir archivos mayores: sube el límite global en **Supabase → Storage →
  Settings**, ajusta el bucket (migración `0010`, en bytes) y define
  `STORAGE_MAX_UPLOAD_MB` en Vercel.

**Flujo del reclamo:**

1. El conductor pulsa **Solicitar borrado** sobre una grabación asignada a su
   turno → se crea `deletion_requests` (PENDING) y el trigger fija
   `scheduled_deletion_at = now() + companies.deletion_grace_days`.
2. La **proveedora** ve una fila en `/provider/deletions` para eliminar la
   grabación de sus propios sistemas y puede **declarar** el borrado
   (`provider_declared_at`).
3. Al cumplirse el plazo, el job (`pg_cron` y/o `/api/cron/process-deletions`)
   **elimina el archivo**, purga `extra_info` y el correo del conductor, y marca
   `shifts.video_deleted_at` («se eliminó la grabación» en el turno de esa fecha).
4. El conductor ve el estado y el campo «Proveedora declaró».

> **Modo demo:** en `/mining/settings` la minera puede fijar `deletion_grace_days = 0`
> (Instantáneo) para que el borrado ocurra en el momento.

---

## 8.ter Visualización de video y registro de accesos

El conductor y la empresa minera pueden **reproducir** las grabaciones desde la
propia app, **sin exponer la URL de Storage** y **sin facilitar la descarga**:

- La reproducción apunta a `GET /api/recordings/<id>` (proxy propio). El
  navegador **nunca ve** la URL de Supabase.
- El *route handler* **autoriza con RLS** (el conductor solo lo asignado a su
  turno; la minera solo lo suyo), firma una URL interna de 60 s, reenvía el
  header `Range` (para poder adelantar) y responde con
  `Content-Disposition: inline` y `Cache-Control: private, no-store`.
- El reproductor oculta la descarga (`controlsList="nodownload"`,
  `disablePictureInPicture`, sin menú contextual) y **no existe** endpoint de
  descarga.
  > Aclaración: es una medida de **fricción**, no DRM. El video debe llegar al
  > navegador para verse, así que un usuario decidido siempre podría capturarlo
  > (DevTools / grabación de pantalla).

**Registro de accesos (ARCO «derecho de acceso»):** cada reproducción se registra
en `recording_access_log` (una fila por reproducción, deduplicando los `Range`):

- La **minera** lo ve en `/mining/access` (fecha, grabación, usuario, empresa,
  acción).
- El **conductor** ve en `/driver` cuántas veces se accedió a cada una de sus
  grabaciones y **qué empresa** lo vio (por privacidad se muestra la empresa y la
  fecha, no el correo del empleado).

## 8.quater Horario semanal y turnos generados

El horario **no** se crea día a día: la empresa define un **horario semanal
recurrente** (conductor + patente + día + hora) y la app **genera** los turnos
con fecha a partir de él.

- **`/mining/schedule`** — tablero semanal (filas = conductores, columnas =
  Lunes…Domingo). Clic en un turno para editarlo; «Agregar» crea uno nuevo.
  Botón **«Generar turnos»** para poblar la ventana móvil (−7 / +28 días); un
  cron diario la extiende.
- **`/mining/shifts`** — los turnos **con fecha** ya generados, con el estado de
  la grabación asignada.

**Reglas de seguridad al editar el horario** (clave):

- Cambiar conductor / patente / hora / día **nunca** toca los turnos que ya
  tienen una grabación asignada (o cuya grabación fue borrada): esos turnos se
  **conservan tal cual**, con su conductor original. Solo se regeneran los turnos
  **futuros y libres**.
- **Pausar** un horario detiene la generación sin perder el histórico.
- **Eliminar** un horario conserva los turnos con grabación (el
  `deletion_requests.shift_id` y la bitácora de accesos quedan intactos).
- Un turno con grabación **no se puede eliminar** desde `/mining/shifts`.
- La migración `0013` hace un *backfill*: crea las plantillas desde los turnos
  existentes (agrupando conductor + patente + día de la semana + hora) y las
  enlaza, **sin modificar** ninguno de sus datos.

---

## 9. Despliegue en Vercel

1. En Supabase, ejecuta **todas** las migraciones (`0001`…`0009`) en el SQL Editor.
   La `0009` crea el bucket privado `recordings` y el job de borrado.
2. Sube el repositorio a GitHub.
3. En [vercel.com](https://vercel.com) → **Add New → Project** → importa el repo.
   Puedes usar el **dominio por defecto de Vercel** (no necesitas dominio propio).
4. Añade las variables de entorno del apartado 2 en
   **Settings → Environment Variables** (usa la URL de Vercel en
   `NEXT_PUBLIC_SITE_URL`). `RESEND_*` es opcional.
5. Deploy.
6. En **Supabase → Authentication → URL Configuration**, agrega el dominio de
   Vercel a **Site URL** y **Redirect URLs** (aquí **sí** van las URLs de tu app).
7. **Google Cloud no requiere cambios**: el *Authorized redirect URI* sigue
   siendo el de Supabase (`https://<tu-project-ref>.supabase.co/auth/v1/callback`).
8. *(Opcional)* Configura Vercel Cron apuntando a `/api/cron/process-deletions`
   (ver §5.bis) — recuerda `CRON_SECRET`.
9. Si cambiaste `NEXT_PUBLIC_SITE_URL`, **vuelve a desplegar**: esa variable se
   incrusta en el bundle durante el build.

> ✅ **Se puede desplegar sin Resend y sin dominio comprado**: los correos son
> opcionales y las invitaciones se aceptan dentro de la app.

> Atajo: revisa [`DEPLOY.md`](./DEPLOY.md) para el checklist completo y la
> solución a los problemas de autenticación con GitHub.

---

## 10. Checklist de pruebas

Con la app desplegada y tres cuentas de Google (una por rol):

**Empresa minera**
- [ ] Invito una proveedora en `/mining/providers`; al entrar con su correo ve la
      relación en `/provider/relations` y puede aceptarla.
- [ ] Invito un conductor en `/mining/members`; al entrar con su correo acepta la
      invitación en `/onboarding` y aparece como *Activo*.
- [ ] Creo un turno en `/mining/shifts` (conductor + patente + hora de inicio).
- [ ] Creo el **horario semanal** en `/mining/schedule` (conductor + patente + día
      + hora) y pulso **«Generar turnos»**.
- [ ] Los turnos aparecen con fecha en `/mining/shifts` y en el selector de
      `/mining/videos`.
- [ ] Subo una grabación eligiendo un **turno libre**: el turno pasa a
      *Grabación asignada*.
- [ ] Al cambiar el **conductor** del horario, el turno con grabación **no**
      cambia (se conserva) y solo se regeneran los futuros.
- [ ] En `/mining/settings` pongo **Instantáneo (demo)** y el borrado se ejecuta al
      instante; con **30 días** queda programado.
- [ ] En `/mining/videos` reproduzco una grabación con **Ver** y el acceso aparece
      en `/mining/access`.

**Conductor**
- [ ] En `/driver` veo las grabaciones asignadas a mis turnos.
- [ ] Reproduzco mi grabación con **Ver** y veo el nº de accesos y qué empresa la vio.
- [ ] Al pulsar **Solicitar borrado** aparece la fecha de borrado y el estado.
- [ ] Tras el borrado, veo *Eliminado* y si la proveedora declaró el borrado.

**Proveedora**
- [ ] En `/provider/deletions` veo el ticket y puedo **Declarar borrado**.
- [ ] No veo tickets de otras proveedoras.

**General**
- [ ] `/driver`, `/provider`, `/mining` y `/admin` redirigen a `/login` sin sesión.
- [ ] Un rol que entra a la sección de otro rol es redirigido a su panel.
- [ ] El selector de empresa cambia entre las empresas a las que pertenezco.
- [ ] El toggle de tema alterna claro/oscuro y persiste al recargar.

---

## 11. Notas y limitaciones del MVP

- **Borrado real:** al cumplirse el plazo se elimina el **archivo físico** de
  Supabase Storage, se purga `extra_info`, se borra el correo del conductor en
  `video_metadata` y se marca `shifts.video_deleted_at`. La fila de metadata
  queda como registro de auditoría (sin datos personales).
- **Zona horaria:** las fechas se interpretan y muestran en
  `America/Santiago` (`lib/format.ts`). Si el negocio opera en otra zona,
  cambia `APP_TIME_ZONE`.
- **Roles:** se asignan por invitación y son libres; un *platform admin* puede
  asignar cualquiera desde `/admin`.
- **Ingesta de video:** manual por ahora; el formulario simula la futura API de
  las cámaras. El turno se **selecciona manualmente** entre los turnos **libres
  generados** desde el horario semanal (no hay *matching* automático).
- **Correo opcional:** sin `RESEND_API_KEY` no se envían correos; todo el flujo
  funciona dentro de la app.
- **Sin dominio:** Google OAuth y Supabase funcionan con `localhost` y el dominio
  por defecto de Vercel.
- **Verificación aplicada:** `npm run typecheck` ✅ · `npm run lint` ✅ (0 avisos)
  · `npm run build` ✅ (19 rutas).



