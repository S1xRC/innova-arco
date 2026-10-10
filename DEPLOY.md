# Guía de despliegue — Innova ARCO

Checklist operativo para llevar el MVP a producción:
**GitHub → Vercel** (app) **+ Supabase** (Postgres/Auth) **+ Resend** (correos).
Para el detalle de cada servicio, ver el [README](./README.md).

---

## 0. Autenticación con GitHub (si `git push` te pide usuario y contraseña)

GitHub **eliminó la autenticación por contraseña** para operaciones Git en
agosto de 2021. Hoy solo acepta **token (PAT)**, **SSH** o **GitHub CLI**.

### Opción A · GitHub CLI (recomendada)

```bash
gh auth status        # verifica que estés logueado
gh auth setup-git     # registra `gh` como credential helper de Git
git push              # ya no vuelve a pedir credenciales
```

### Opción B · Token personal (PAT)

1. https://github.com/settings/tokens → *Generate new token (classic)* → scope `repo`.
2. Cuando Git pida credenciales:
   - **Usuario**: tu nombre de usuario de GitHub
   - **Contraseña**: pega el **token** (no tu contraseña real).
3. Para no repetirlo:
   ```bash
   git config --global credential.helper store   # guarda en ~/.git-credentials (texto plano)
   ```

### Opción C · Clave SSH

```bash
ssh-keygen -t ed25519 -C "tu-correo@ejemplo.cl"   # solo si aún no tienes una clave
gh ssh-key add ~/.ssh/id_ed25519.pub --title "Equipo de desarrollo"
# (o manualmente en https://github.com/settings/keys)
git remote set-url origin git@github.com:<tu-usuario>/<tu-repo>.git
ssh -T git@github.com   # debe responder: "Hi <tu-usuario>! You've successfully authenticated..."
```

> Si tu clave SSH tiene **passphrase**, Git la pedirá en cada operación a menos
> que tengas un agente activo (`eval "$(ssh-agent -s)"` y luego
> `ssh-add ~/.ssh/id_ed25519`). Si prefieres evitarlo, usa la Opción A.

---

## 1. Preparación local (una sola vez)

```bash
git status                 # confirmar que NO aparece .env.local
npm install
npm run typecheck && npm run lint && npm run build
```

- [ ] `.env.local` **no** está en el commit (está en `.gitignore`).
- [ ] Build local en verde.

---

## 2. Supabase (producción)

- [ ] Crear proyecto en https://supabase.com/dashboard
- [ ] SQL Editor → ejecutar **en orden**: `0001_schema.sql`, `0002_functions.sql`, `0003_policies.sql`, `0004_triggers.sql`
- [ ] Editar `supabase/seed.sql` con **tus correos reales** y ejecutarlo
- [ ] Anotar `Project URL` y `anon/publishable key`
- [ ] Authentication → URL Configuration → *Site URL*: `http://localhost:3000` (se actualiza en el paso 5)

> Si omites las migraciones, el primer login falla con
> *“No se encontró tu perfil en la plataforma”* (falta el trigger `handle_new_user`).

---

## 3. Google OAuth

- [ ] Google Cloud → crear proyecto
- [ ] *OAuth consent screen* (External) + scopes `openid`, `userinfo.email`, `userinfo.profile`
- [ ] *Credentials → OAuth client ID → Web application*
- [ ] **Authorized redirect URIs** → **solo**:
      `https://<tu-project-ref>.supabase.co/auth/v1/callback`
- [ ] Guardar **Client ID** / **Client Secret**
- [ ] Supabase → Authentication → Providers → Google → activar y pegar credenciales
- [ ] Agregar tu correo en *Test users* (mientras la app esté en modo Testing)

---

## 4. Vercel

- [ ] https://vercel.com → **Add New → Project** → importar el repo
- [ ] Framework: **Next.js** (auto) · Root Directory: `.` · Build: `next build`
- [ ] **Environment Variables** (Production + Preview):

| Variable | Valor |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | `https://<ref>.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | clave anon/publishable |
| `NEXT_PUBLIC_SITE_URL` | `https://<tu-dominio>.vercel.app` |
| `RESEND_API_KEY` | `re_...` |
| `RESEND_FROM_EMAIL` | `Innova ARCO <notificaciones@tudominio.cl>` |
| `NOTIFY_WEBHOOK_SECRET` | string largo aleatorio |
| `SUPABASE_SERVICE_ROLE_KEY` | *(opcional)* |

- [ ] **Deploy**

> ⚠️ `NEXT_PUBLIC_SITE_URL` se **incrusta en el bundle durante el build**.
> Si la cambias, hay que **volver a desplegar**.

---

## 5. Cerrar el círculo de URLs

- [ ] Supabase → URL Configuration → *Site URL* = `https://<tu-dominio>.vercel.app`
- [ ] Supabase → URL Configuration → *Redirect URLs*: `https://<tu-dominio>.vercel.app/**` y `http://localhost:3000/**`
- [ ] Vercel → confirmar `NEXT_PUBLIC_SITE_URL` → **Redeploy**
- [ ] Google Cloud: **sin cambios** (el callback sigue siendo el de Supabase)

---

## 6. Verificación post-despliegue

- [ ] `GET /` → 200 (landing)
- [ ] `GET /driver` sin sesión → redirige a `/login`
- [ ] Login con Google → cae en el panel de su rol
- [ ] Conductor: **Solicitar borrado** → estado *Pendiente*
- [ ] Proveedor: llega el correo a `support_email` **y** ve el reclamo en `/provider/claims`
- [ ] Proveedor: **Marcar como eliminado** → estado *Resuelto*
- [ ] Minera: `/mining` refleja el reclamo y el % de cumplimiento
- [ ] Vercel → Runtime Logs: sin errores con prefijo `[ARCO]`

---

## 7. Problemas frecuentes

| Síntoma | Causa / solución |
| --- | --- |
| `Permission denied (publickey)` al hacer push | Clave SSH no registrada → Opción A o C del paso 0. |
| `git push` pide usuario y contraseña | Usa un **token**, no la contraseña → Opción B. |
| *“No se encontró tu perfil”* al entrar | Faltan las migraciones (trigger `handle_new_user`). |
| *“redirect_uri is not allowed”* | Domino faltante en Supabase → URL Configuration (paso 5). |
| No llegan correos | `RESEND_API_KEY` vacía, dominio sin verificar, o `support_email` del proveedor sin configurar. Revisa logs `[ARCO]`. |
| Se ve la URL de `localhost` en los correos | `NEXT_PUBLIC_SITE_URL` incorrecta → corrige y **redeploy**. |
| Usuario entra con rol equivocado | Su email no está en `user_invites` al momento del primer login. |
