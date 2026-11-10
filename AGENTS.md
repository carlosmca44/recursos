# AGENTS.md — Guía para Agentes de IA

## 📋 Información General del Proyecto

- **Nombre:** `{{PROJECT_NAME}}`
- **Descripción:** {{Breve descripción del propósito del proyecto, quién lo usa y qué problema resuelve.}}
- **Stack principal:** {{Next.js X.Y (App Router + Turbopack) · TypeScript X.Y · [UI library] · [Tailwind / CSS-in-JS / etc.]}}
- **Idiomas:** {{es, en, fr, … o "Solo español"}}
- **Cliente / Organización:** {{Cliente, institución o equipo responsable}}
- **Año:** {{2025-2026}}

---

## ⚠️ This is NOT the Next.js you know

> Este bloque debe conservarse **tal cual** en la parte superior del archivo. Lo añade y reescribe `next dev` automáticamente; si lo borras de un diff, se vuelve a crear como cambio no confirmado. Confirmarlo junto con tu trabajo mantiene el árbol limpio.

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

### 🧠 Regla general sobre herramientas y agentes

Antes de escribir código con una librería, framework o CLI, **investiga si esa herramienta ofrece mecanismos pensados para agentes de IA** (documentación "llms.txt", servidores MCP, archivos de reglas generados automáticamente, guías en `node_modules/<pkg>/docs/`, etc.). Ejemplos típicos:

- **Next.js** → `node_modules/next/dist/docs/`
- **Ant Design** → `https://ant.design/llms-full.txt` (ver sección siguiente)
- **Tu librería de UI / estado / validación** → busca `<pkg>/llms.txt`, `<pkg>/AGENTS.md`, `<pkg>/docs/agents/`

Si la herramienta expone guías de este tipo, **léelas primero** en lugar de basarte en memoria del modelo. Si no las expone, consulta la documentación oficial y las notas de migración de la versión instalada.

---

## 🎨 Ant Design (solo si se usa)

<!-- BEGIN:antd rules -->

## Ant Design

Read https://ant.design/llms-full.txt and understand Ant Design components. Use this knowledge when writing code with Ant Design.

<!-- END:antd rules -->

> **Notas propias de la versión instalada:**
> - Ant Design 6 difiere significativamente de v5 — usa la API de v6 (p. ej. `variant="borderless"` en `Card`).
> - Verifica `package.json` para la versión exacta antes de aplicar cambios.
> - Si el proyecto usa otra librería de UI (MUI, shadcn/ui, Chakra, Radix…), **sustituye esta sección** por la guía de esa librería y elimina la regla de Ant Design.

> Si **no** se usa Ant Design, borra este bloque completo del archivo.

---

## 🧱 Arquitectura / Estructura del Proyecto

```
src/
├── app/                          # App Router (Next.js)
│   ├── [lang]/                   # (si aplica) Ruta dinámica de idioma
│   │   ├── dictionaries/         # Traducciones JSON
│   │   ├── {{feature}}/          # Una carpeta por dominio funcional
│   │   └── ...
│   ├── api/                      # Route Handlers (proxy / BFF / endpoints internos)
│   │   ├── {{resource}}/
│   │   └── ...
│   ├── components/               # Componentes globales
│   └── layout.tsx                # Layout raíz
├── common/                       # Componentes compartidos
├── constants/                    # Constantes y configuración
├── context/                      # Contextos de React
├── lib/                          # Lógica de negocio, utilidades, clientes de API
│   ├── utils.ts
│   └── ...
├── models/                       # Interfaces y tipos TypeScript
├── types/                        # Tipos auxiliares
├── health/                       # (si aplica) Servicio de health check separado
│   ├── checks.mjs
│   └── server.mjs
└── proxy.ts                      # Middleware (auth, i18n, redirecciones…)
```

**Reglas de organización:**

- Los componentes específicos de una página viven en `<ruta>/components/`.
- Los componentes reutilizables van en `src/common/`.
- La lógica de negocio y el acceso a datos van en `src/lib/`, **no** en componentes.
- Los modelos TypeScript van en `src/models/` (una entrada por agregado de dominio).
- El middleware (`src/proxy.ts` o `src/middleware.ts`) es el **punto de entrada** para auth, i18n y redirecciones: cualquier cambio de rutas debe considerarlo.
- Los diccionarios de i18n deben mantenerse sincronizados entre idiomas.

> Ajusta el árbol a la estructura real del proyecto. Si no hay i18n, elimina `[lang]/` y `dictionaries/`.

---

## 🌐 Información general del proyecto

{{Esta sección concentra las decisiones transversales: API, autenticación, estado, lógica de negocio, etc. Adapta solo lo que aplique.}}

### 🔐 Autenticación y sesión

- **Mecanismo:** {{JWT en cookie httpOnly / OAuth / sesión server-side / API key / etc.}}
- **Dónde se gestiona:** {{`src/lib/auth.ts`, middleware, Route Handlers, Server Actions…}}
- **Reglas críticas:**
  - {{Ej.: nunca escribir cookies desde una Server Action que rotó tokens; ver `src/app/api/auth/session/swap/route.ts`.}}
  - {{Ej.: rutas protegidas bajo `/{lang}/request-visa` verifican `otp_token` en el middleware.}}
  - {{Ej.: expiración, algoritmo de firma, variables de entorno requeridas.}}

### 🌍 Internacionalización (si aplica)

- **Parámetro de ruta:** `[lang]` → {{en, es, fr}}
- **Middleware:** redirige rutas sin idioma a `/{lang}/home`.
- **Diccionarios:** `src/app/[lang]/dictionaries/{en,es,fr}.json` (cargados dinámicamente).
- **Contexto:** `LangContext` expone `dictionaries` y `lang`.
- **Idioma por defecto:** {{en}}.
- **Cabecera `Accept-Language`:** inyectada por el middleware; los fetch del cliente añaden `?lang=` explícito.

### 📦 Gestión de estado

- **Estado del formulario:** {{sessionStorage / React Hook Form + Zustand / Redux / URL params…}}
- **Claves relevantes de `sessionStorage` (si aplica):**

| Clave | Propósito |
|-------|-----------|
| `{{key1}}` | {{descripción}} |
| `{{key2}}` | {{descripción}} |

### 🔌 API — Backend externo (si aplica)

El proyecto **no** contiene la lógica de negocio del backend; consume un API externa documentada en `{{api.swagger.json | api.scalar.json | ...}}`.

**Reglas clave:**

- Las rutas `/api/*` de Next actúan como **proxy/BFF** hacia `API_BASE_URL`.
- **Errores de la API:** el detalle real viaja en `data` (validación) o `error` (lógica de negocio); `message` es un texto genérico del envoltorio. Usa siempre el helper `pickErrorDetail(payload)` (`src/lib/apiClient.ts`) para extraerlo: `data` → `error` → `message`.
- Toda **Server Action** que llame al API debe aceptar `lang: Locale` y propagarlo (cabecera `Accept-Language`), para que el backend responda errores en el idioma del usuario.
- En el cliente, obtén `lang` con `useLang()` (`src/context/LangContext.tsx`), sin pasarlo por props.
- **Retroalimentación de errores en formularios:** ante `success: false`, el cliente debe mostrar **siempre** `notification.error({...})` (vía `App.useApp()`) **y** el componente `FormErrorAlert` al inicio del card. **Nunca** limpiar el formulario en error: el usuario debe poder corregir y reintentar.

> Si el proyecto consume el backend directamente desde el cliente (sin proxy), ajusta esta sección en consecuencia.

### 🧠 Lógica de negocio destacada

{{Resume aquí las reglas de negocio que un agente debe conocer sí o sí para no romper el dominio: estados, transiciones, validaciones cruzadas, cálculos, permisos, etc. Por ejemplo:}}

- {{Regla 1: p. ej. ciertos tipos de servicio no admiten modalidad presencial.}}
- {{Regla 2: p. ej. un borrador antiguo puede no traer ciertos campos; normalizar antes de enviar.}}
- {{Regla 3: p. ej. los precios se re-consultan al backend antes de confirmar.}}

---

## 📖 Cómo consultar la documentación de la API backend (`api_references/`)

Cuando el frontend consume un backend documentado con OpenAPI (Swagger UI, Scalar, Redoc…), el proyecto incluye un script (`scripts/generate-api-refs.mjs`) que **divide el spec en archivos Markdown por controlador/tag** para que los agentes no tengan que recorrer un JSON de miles de líneas.

### Flujo de trabajo para agentes

1. **Fuente de verdad:** `{{api.swagger.json | api.scalar.json | openapi.json}}` (spec OpenAPI). **NO** lo leas completo para buscar algo puntual.
2. **Generar la referencia:**

   ```bash
   {{pnpm generate:api-refs}}
   ```

   El script genera `api_references/` con:
   - `README.md` — índice de secciones (controlador → archivo).
   - `<Tag>.md` — un archivo por controlador con endpoints, parámetros, request/response y DTOs.

3. **Leer solo lo necesario:** abre directamente el archivo de la sección relevante. Ejemplo:

   ```
   api_references/OTP Controller.md
   api_references/README.md
   ```

4. **Regenerar** tras cambios en el spec del backend. **No editar** los archivos generados manualmente.

### Estructura típica de cada archivo generado

- `# <Tag>` + descripción
- `## Endpoints (N)`
  - `#### METHOD /path` con parámetros, request body, respuestas y DTOs referenciados.
- `## DTOs referenciados` — tablas de campos/tipos/requeridos/descripción.

### Sugerencia de script (`scripts/generate-api-refs.mjs`)

{{Si no existe aún, incluye aquí una versión base o referencia al archivo `generate-api-refs.mjs` que has usado como plantilla en otros proyectos.}}

---

## ⚙️ Variables de Entorno

| Variable | Descripción | Default |
|----------|-------------|---------|
| `API_BASE_URL` | URL del backend | `{{...}}` |
| `JWT_SECRET` | Secreto de firma JWT | `{{...}}` |
| `NODE_ENV` | Entorno | `develop` |
| `NEXT_TELEMETRY_DISABLED` | Desactivar telemetría | `1` |
| `HEALTH_PORT` | (si aplica) Puerto del health check | `{{3001}}` |
| `APP_PORT` | (si aplica) Puerto del portal principal | `{{3000}}` |

> Nunca comitees el archivo `.env` con secretos reales. Usa `.env.example` como plantilla.

---

## 🩺 Health Check (opcional)

- **Proceso independiente** del servidor Next.js: corre en `HEALTH_PORT` (default `{{3001}}`), mientras Next sigue en `{{3000}}`.
- **Archivos:** `src/health/server.mjs` (servidor `node:http`) y `src/health/checks.mjs`.
- **Endpoint:** `GET /health` → `200` si `UP`, `503` si `DOWN`.
- **Sonda única:** `self` (probe `GET {APP_PORT||PORT||3000}/` al portal principal). Es crítica.
- **No se sondea ningún servicio externo** a propósito: el health del contenedor no debe generar tráfico continuo hacia el backend ni servicios de terceros. La disponibilidad de dependencias la resuelve el orquestador (LB / K8s).
- **Dev:** `pnpm dev:health` (usa un puerto distinto para no chocar con Next).
- **Despliegue:** el entrypoint arranca health + Next y maneja `SIGTERM` (`trap ... INT TERM` — en Debian/dash no uses `SIGTERM` porque falla).
- Mantén los checks como ESM (`.mjs`) y usando **solo built-ins de Node** (`node:http`, `node:net`), sin dependencias npm.

> Elimina esta sección si el proyecto no tiene health check dedicado.

---

## 🐳 Docker y Despliegue (opcional)

- **Dockerfile:** multi-stage (build con `pnpm` → runtime `node:*-bookworm-slim`).
- **docker-compose.yml:** servicio Next + reverse proxy (nginx / traefik).
- **Output:** `next.config.ts` con `output: "standalone"`.
- **Registro:** {{nexus, ghcr, ECR, Docker Hub…}}
- **Versionado:** `build-and-deploy.sh` lee `VERSION.txt` (raíz) y etiqueta la imagen como `{VERSION}.{TIMESTAMP}`; si no existe, aborta.
- **Subida de versión** (en cada release, mantener sincronizados):
  - `VERSION.txt` — versión usada por el build.
  - `package.json` — campo `version`.
  - `CHANGELOG.md` — entrada `## [X.Y.Z] - YYYY-MM-DD`.

---

## 🧰 Toolchain obligatorio

### Package manager

- **Usa `pnpm`**, nunca `npm` ni `yarn`.
- Versión fijada en `packageManager` de `package.json`: {{pnpm 11.21}}.
- **Nunca purgues ni reinstales `node_modules`**: usa siempre la carpeta existente del proyecto.
- Si pnpm intenta reinstalar módulos al ejecutar scripts, desactiva la verificación:

  ```bash
  corepack pnpm --config.verify-deps-before-run=false <comando>
  ```

### Node.js

- **Versión obligatoria:** {{v24.19.0}} (vía nvm).

### WSL (entorno Windows)

Este proyecto se desarrolla en **Windows + WSL**. Para ejecutar comandos Linux, **prepón `wsl`** a cada uno:

```bash
wsl <comando>
```

Antes de ejecutar `pnpm`, prepara el PATH de Node:

```bash
export PATH="$HOME/.nvm/versions/node/{{v24.19.0}}/bin:$PATH"
```

> **Nota WSL:** `eslint` sobre `/mnt/c` es muy lento y puede dar timeouts. Para verificar cambios puntuales prefiere `tsc`/`node` directo o lintea archivos específicos con timeout ampliado.

> Si desarrollas **nativamente en Linux/macOS**, elimina esta subsección y deja solo la nota de versión de Node.

---

## 🌿 Git — commits y flujo

### Mensajes de commit

- **Siempre en inglés.**
- **Formato:** [Conventional Commits](https://www.conventionalcommits.org/).
  - `feat:` nueva funcionalidad
  - `fix:` corrección de bug
  - `docs:` solo documentación
  - `style:` cambios que no alteran el significado del código (espacios, formato, punto y coma…)
  - `refactor:` cambio que no corrige bug ni añade funcionalidad
  - `perf:` mejora de rendimiento
  - `test:` añadir o corregir tests
  - `build:` cambios en sistema de build o dependencias externas
  - `ci:` cambios en CI/CD
  - `chore:` otros cambios que no tocan `src/` ni tests

Ejemplos:

```
feat(auth): add OTP email verification flow
fix(procedure): normalize inPerson on unfinished drafts
chore(release): bump version to 1.4.0
```

### Reglas

- **Solo crear commits y push cuando el usuario lo indique explícitamente.** No hagas commits automáticos.
- Los commits de release (`chore(release): bump version to X.Y.Z`) deben incluir `VERSION.txt`, `package.json` y `CHANGELOG.md` actualizados.

---

## 🔧 Convenciones y Patrones

### Nomenclatura de archivos

- **Componentes:** PascalCase (`InfoModal.tsx`, `UserInfoForm.tsx`)
- **Utilidades/libs:** camelCase (`doFetch`, `validateOtpJwt`)
- **Modelos:** camelCase (`apiResponse.ts`, `nomenclatures.ts`)
- **Rutas API (Route Handlers):** kebab-case (`verify-credentials`, `service-price`)

### Componentes

- **Server Components** por defecto (carga inicial de datos).
- **Client Components** marcados con `"use client"` (interactividad, formularios).
- **Server Actions** en `actions.ts` para operaciones específicas.
- Los layouts se componen vía `LayoutClientWrapper` (cliente) que envuelve el layout server-side.
- **Formularios:** {{Ant Design `Form` + `Form.useWatch` / React Hook Form + Zod / …}} para reactividad.
- **API calls:** `doFetch()` en servidor, `fetch()` directo en cliente.

### Manejo de archivos e imágenes

- {{Ej.: las imágenes se comprimen con canvas (< 512KB) y se guardan como base64 en `sessionStorage` hasta el envío final.}}
- {{Ej.: PDF con `jspdf` + `jspdf-autotable`; función `downloadProcedureDetailsAsPdf()` en `utils.ts`.}}

> Ajusta o elimina lo que no aplique.

### ⚠️ Notas importantes para agentes

1. **No modificar** `node_modules/`, `.next/`, `public/assets/` (salvo assets nuevos).
2. **Los diccionarios** (`en.json`, `es.json`, `fr.json`) deben mantenerse sincronizados.
3. **El middleware** es punto de entrada para rutas y autenticación — cualquier cambio ahí impacta todo.
4. **`next.config.ts`** tiene `ignoreBuildErrors: true` — los errores de TS **no** detienen el build, pero sí deben corregirse.
5. **El backend** es externo: para consultarlo usa `api_references/` (ver sección arriba), **no** leas el spec completo.
6. **{{Ant Design 6 / MUI / shadcn / …}}** — usa la API de la versión instalada, no la de memoria del modelo.
7. **El flujo de autenticación** es crítico: cualquier modificación debe mantener las invariantes de seguridad (cookies httpOnly, JWT firmado, expiraciones).
8. **Commits** en inglés y con Conventional Commits.
9. **Solo hacer commit/push** cuando el usuario lo indique explícitamente.

---

## 🚀 Comandos Útiles

```bash
pnpm dev              # Desarrollo con Turbopack
pnpm dev:health       # (si aplica) Health check en dev
pnpm build            # Build de producción
pnpm start            # Servidor de producción
pnpm lint             # ESLint
pnpm test             # Vitest
pnpm generate:api-refs # (si aplica) Regenerar api_references/ desde el spec OpenAPI
```

### Subida de versión (cada release)

| Archivo | Uso |
|---|---|
| `VERSION.txt` | Versión usada por `build-and-deploy.sh` (`{VERSION}.{TIMESTAMP}`). Sin él el build aborta. |
| `package.json` | Campo `version`. |
| `CHANGELOG.md` | Entrada `## [X.Y.Z] - YYYY-MM-DD` con los cambios. |

### Toolchain (WSL)

```bash
# Antes de cualquier comando pnpm:
export PATH="$HOME/.nvm/versions/node/{{v24.19.0}}/bin:$PATH"
corepack pnpm --config.verify-deps-before-run=false <comando>
```

---

## 📚 Referencias rápidas

| Concepto | Archivo clave |
|----------|--------------|
| Middleware (auth / i18n / redirecciones) | `src/proxy.ts` (o `src/middleware.ts`) |
| Layout raíz | `src/app/layout.tsx` |
| Layout por idioma | `src/app/[lang]/layout.tsx` |
| Diccionarios | `src/app/[lang]/dictionaries/*.json` |
| Lógica de formulario | `src/app/[lang]/{{feature}}/components/` |
| Modelos principales | `src/models/*.ts` |
| Utilidades (fetch, JWT) | `src/lib/utils.ts`, `src/lib/apiClient.ts` |
| Contexto de idioma | `src/context/LangContext.tsx` |
| Contexto de formulario | `src/context/ProceduresFormContext.tsx` |
| Constantes de API | `src/constants/endpoints.ts` |
| Referencia API generada | `api_references/` (vía `pnpm generate:api-refs`) |
| Variables de entorno | `.env` / `.env.example` |
| Health check | `src/health/*.mjs`, `scripts/health-entrypoint.sh` |
| Config Docker | `Dockerfile`, `docker-compose.yml`, `nginx.conf` |
| Estilos globales | `src/app/globals.css` |

---

## 🔍 Depuración y Logging

- **Server logs:** `console.error` (visible en terminal).
- **Client logs:** `console.warn` / `console.error` (consola del navegador).
- **Respuestas API:** loggear con `console.log(resp)` en componentes cliente.
- **Validación de formularios:** los errores se loggean como warning.
- **Errores de JWT / auth:** capturar en el helper correspondiente (`validateOtpJwt`, `pickErrorDetail`, etc.) y registrar.

---

*Última actualización: {{YYYY-MM-DD}}*
*Documentación generada para agentes de IA — mantener al día con cada cambio significativo.*

