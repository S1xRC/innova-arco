# Innova ARCO

Plataforma SaaS para gestionar los **derechos ARCO** (Acceso, Rectificación,
Cancelación y Oposición) de los conductores de camiones mineros cuyos datos
—incluida biometría sensible— son capturados por cámaras de seguridad.

El sistema conecta a **tres actores**:

| Rol | Qué hace |
| --- | --- |
| **Conductor (DRIVER)** | Ve todos los registros de video asociados a su correo (de cualquier proveedor) y solicita el borrado en un clic. |
| **Proveedor de cámaras (PROVIDER)** | Sube metadatos de las grabaciones y resuelve los reclamos de borrado en su bandeja. |
| **Empresa minera (MINING)** | Portal de auditoría de solo lectura para verificar que los proveedores respeten los derechos de sus trabajadores. |

---

## Stack

- **Next.js 16** (App Router, Server Actions, Turbopack) + **TypeScript 5.9**
- **React 19** · **Tailwind CSS v4** · **shadcn/ui** (Radix UI)
- **Supabase** (PostgreSQL + Auth con Google OAuth + Row Level Security)
- **Resend** (notificaciones por correo)
- **Zod** (validación) · **next-themes** (modo claro/oscuro) · **sonner** (toasts)
- Despliegue: **Vercel** (app) + **Supabase** (base de datos)

> Nota: en Next.js 16 el archivo `middleware.ts` se renombró a **`proxy.ts`**
> (función `proxy()`, runtime Node.js). Este proyecto ya usa la convención nueva.

---

## Requisitos previos

- **Node.js ≥ 20.9** (se desarrolló y verificó con **Node 24.21.0**)
- Una cuenta de **Supabase** (gratuita)
- Una cuenta de **Resend** (gratuita)
- Credenciales de **Google Cloud** para el OAuth

### ⚠️ Nota para usuarios de Windows

Si el proyecto está en una **ruta de red** o en el filesystem de una distribución
de **WSL** accedido por UNC (por ejemplo `\\wsl.localhost\...`), ejecuta siempre
`npm install` y los demás scripts de npm **desde el entorno Linux** (WSL, Git
Bash, etc.). El `cmd.exe` de Windows no admite rutas UNC como directorio de
trabajo, por lo que los scripts `postinstall` fallan con
`Cannot find module 'C:\Windows\postinstall.js'`.

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
| `SUPABASE_SERVICE_ROLE_KEY` | ➖ | Clave `service_role`. **Solo servidor.** Para scripts administrativos. |
| `NEXT_PUBLIC_SITE_URL` | ✅ | URL base pública (`http://localhost:3000` en local). Se usa para los enlaces de los correos y el `redirectTo` de OAuth. |
| `RESEND_API_KEY` | ✅ | API key de Resend. Si falta, la app funciona pero no envía correos (queda registrado en logs). |
| `RESEND_FROM_EMAIL` | ➖ | Remitente. Requiere dominio verificado en Resend. Para pruebas: `"Innova ARCO <onboarding@resend.dev>"`. |
| `NOTIFY_WEBHOOK_SECRET` | ➖ | Secreto compartido que protege `POST /api/notify-provider`. Si se define, el header `x-webhook-secret` es obligatorio. |

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
| `0001_schema.sql` | Enums (`company_type`, `user_role`, `deletion_status`), tablas e índices. |
| `0002_functions.sql` | Funciones `SECURITY DEFINER` que evitan la recursión de RLS. |
| `0003_policies.sql` | Políticas de Row Level Security para los tres roles. |
| `0004_triggers.sql` | Provisionamiento de usuarios, `resolved_at` automático y guardas de perfil. |

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
companies ──┬──< users            (company_id, NULL para conductores sin onboarding)
            └──< video_metadata   (provider_id)
                     │
users ─────────────< deletion_requests >─── video_metadata
user_invites  (email → role + company, solo service_role)
```

---

## 4. Configurar Google OAuth

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

Al primer inicio de sesión, el trigger `handle_new_user` (migración `0004`):

1. Busca el email en `user_invites`.
2. Si existe → asigna ese `role` y `company_id` (PROVIDER / MINING).
3. Si no existe → crea el usuario como `DRIVER` con `company_id = NULL`, lo que
   dispara el **onboarding** para elegir su empresa minera.

---

## 5. Configurar Resend (correos)

1. Crea una API key en [resend.com/api-keys](https://resend.com/api-keys) y
   guárdala en `RESEND_API_KEY`.
2. Verifica un dominio en **Domains** y usa una dirección de ese dominio en
   `RESEND_FROM_EMAIL`.
   - Para pruebas rápidas puedes usar
     `RESEND_FROM_EMAIL="Innova ARCO <onboarding@resend.dev>"` (Resend solo
     permite enviar a tu propio correo con ese remitente).

Cuando un conductor solicita el borrado:

1. Se inserta la fila en `deletion_requests` (estado `PENDING`).
2. Se envía un correo HTML al `support_email` del proveedor.
3. El correo es **best-effort**: si Resend falla, la solicitud igual se guarda
   (el error queda en `console.error` con el prefijo `[ARCO]`).

### Endpoint alternativo / webhook

```
POST /api/notify-provider
Headers: { "x-webhook-secret": "<NOTIFY_WEBHOOK_SECRET>", "Content-Type": "application/json" }
Body:    { "requestId": "<uuid>" }        // o el payload de Supabase: { "record": { "id": "<uuid>" } }
```

Útil para conectar un **Database Webhook** de Supabase sobre el `INSERT` de
`deletion_requests` (`Dashboard → Database → Webhooks`). El endpoint devuelve
`200` si el correo se envió, `502` si falló el envío y `401`/`404`/`422` para
errores de autorización o datos.

---

## 6. Ejecutar en local

```bash
npm run dev
```

Abre <http://localhost:3000> e inicia sesión con Google.

**Enrutamiento por rol:** `/dashboard` redirige a cada usuario a su panel:

| Rol | Ruta |
| --- | --- |
| DRIVER | `/driver` (si aún no tiene empresa → `/onboarding`) |
| PROVIDER | `/provider` · `/provider/upload` · `/provider/claims` |
| MINING | `/mining` |

---

## 7. Estructura del proyecto

```
Innova/
├─ app/
│  ├─ layout.tsx                  # ThemeProvider + Toaster + globals.css
│  ├─ page.tsx                    # landing pública
│  ├─ login/page.tsx              # inicio de sesión con Google
│  ├─ onboarding/page.tsx         # conductor elige empresa minera
│  ├─ dashboard/page.tsx          # router por rol
│  ├─ driver/                     # tabla de registros + solicitar borrado
│  ├─ provider/                   # resumen · upload · claims (bandeja)
│  ├─ mining/                     # portal de auditoría (solo lectura)
│  ├─ auth/callback/route.ts      # intercambio code → session (PKCE)
│  └─ api/notify-provider/route.ts# envío de correo vía Resend
├─ actions/                       # Server Actions (auth, onboarding, driver, provider)
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
| `selectMiningCompanyAction` | `actions/onboarding.ts` | DRIVER (una vez) |
| `requestDeletionAction` | `actions/driver.ts` | DRIVER |
| `createVideoMetadataAction` | `actions/provider.ts` | PROVIDER |
| `resolveDeletionRequestAction` | `actions/provider.ts` | PROVIDER |

---

## 8. Seguridad: Row Level Security

Todas las tablas tienen RLS activado. Las políticas usan funciones
`SECURITY DEFINER` (`public.current_user_role()`, `public.current_company_id()`,
`public.is_provider_of_video()`, …) para leer `public.users` sin provocar el
clásico error *“infinite recursion detected in policy for relation users”*.

| Tabla | DRIVER | PROVIDER | MINING |
| --- | --- | --- | --- |
| `companies` | Solo `type = 'MINING'` (para el desplegable) + los proveedores que tienen sus videos | Su propia empresa | Su propia empresa |
| `users` | Solo su propia fila (`id = auth.uid()`) | Solo su propia fila | Solo su propia fila |
| `video_metadata` | `lower(driver_email) = lower(auth.jwt()->>'email')` | `provider_id = company_id` (lectura + **insert**) | Solo videos con una solicitud de un conductor de su empresa |
| `deletion_requests` | `driver_id = auth.uid()` (lectura + **insert**) | Solicitudes de sus videos (lectura + **update** a `DELETED`) | Solicitudes de conductores de su empresa (solo lectura) |
| `user_invites` | — | — | — (RLS sin políticas: solo `service_role`) |

Guardas adicionales (migración `0004`):

- `users.role` **no puede** modificarse desde la aplicación.
- `users.company_id` solo puede asignarse **una vez** (onboarding del conductor).
- `deletion_requests.resolved_at` se rellena automáticamente al pasar a `DELETED`.
- `deletion_requests` tiene `UNIQUE(video_id)`: un video no puede tener dos reclamos.

> Para cambiar un rol manualmente:
> ```sql
> alter table public.users disable trigger users_profile_guards;
> update public.users set role = 'PROVIDER', company_id = '<uuid>' where email = '...';
> alter table public.users enable trigger users_profile_guards;
> ```

---

## 9. Despliegue en Vercel

1. Sube el repositorio a GitHub.
2. En [vercel.com](https://vercel.com) → **Add New → Project** → importa el repo.
3. Añade las variables de entorno del apartado 2 en
   **Settings → Environment Variables** (usa la URL real en `NEXT_PUBLIC_SITE_URL`).
4. Deploy.
5. En **Supabase → Authentication → URL Configuration**, agrega el dominio de
   Vercel a **Site URL** y **Redirect URLs** (aquí **sí** van las URLs de tu app).
6. **Google Cloud no requiere cambios**: el *Authorized redirect URI* sigue
   siendo el de Supabase (`https://<tu-project-ref>.supabase.co/auth/v1/callback`).
7. Si cambiaste `NEXT_PUBLIC_SITE_URL`, **vuelve a desplegar**: esa variable se
   incrusta en el bundle durante el build.

> Atajo: revisa [`DEPLOY.md`](./DEPLOY.md) para el checklist completo y la
> solución a los problemas de autenticación con GitHub.

---

## 10. Checklist de pruebas

Con el seed cargado y tres cuentas de Google (una por rol):

**Conductor**
- [ ] Al entrar por primera vez, aparece `/onboarding` y puedo elegir una minera.
- [ ] Veo solo los videos asociados a mi correo, de **ambos** proveedores.
- [ ] Al pulsar **Solicitar borrado**, la fila pasa a *Solicitud pendiente* y el
      botón desaparece.
- [ ] Volver a solicitar el mismo video muestra *“Ya existe una solicitud…”*.

**Proveedor**
- [ ] El formulario de `/provider/upload` crea un registro visible para el conductor.
- [ ] El proveedor **A** no ve en `/provider/claims` reclamos de videos del proveedor **B**.
- [ ] Al marcar *Marcar como eliminado*, el estado pasa a `DELETED`.
- [ ] Con `RESEND_API_KEY` configurada, llega el correo al `support_email`.

**Empresa minera**
- [ ] `/mining` muestra solo solicitudes de conductores que declararon su empresa.
- [ ] El estado Pendiente/Resuelto y el % de cumplimiento se actualizan.
- [ ] No existe ningún botón de escritura (portal de solo lectura).

**General**
- [ ] `/driver`, `/provider` y `/mining` redirigen a `/login` sin sesión.
- [ ] Un proveedor que entra a `/driver` es redirigido a `/provider`.
- [ ] El toggle de tema alterna claro/oscuro y persiste al recargar.

---

## 11. Notas y limitaciones del MVP

- **Borrado lógico:** marcar como `DELETED` cambia el estado, no elimina el
  registro físico. Para un borrado real, añade una política `DELETE` para el
  proveedor y elimina la fila de `video_metadata`.
- **Zona horaria:** las fechas se interpretan y muestran en
  `America/Santiago` (`lib/format.ts`). Si el negocio opera en otra zona,
  cambia `APP_TIME_ZONE`.
- **Provisionamiento de roles:** manejado por `user_invites` (opción elegida).
  Los usuarios no pueden auto-asignarse rol `PROVIDER` / `MINING`.
- **Ingesta de video:** manual por ahora; el formulario simula la futura API de
  las cámaras.
- **Notificaciones:** el correo es best-effort (no bloquea la solicitud). Si
  Resend falla, el reclamo igual llega a la bandeja y el error queda en logs.
- **Verificación aplicada:** `npm run typecheck` ✅ · `npm run lint` ✅ (0 errores)
  · `npm run build` ✅ · smoke test del servidor de desarrollo ✅.



