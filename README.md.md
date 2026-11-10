## Cómo usar la plantilla [[Taller AI DATYS/Recursos/recursos-repo/AGENTS.md]]

1. **Copia el bloque de arriba** a un archivo `AGENTS.md` en la raíz del nuevo repo.
2. **Reemplaza** los `{{...}}` y elimina lo que no aplique:
   - Sin i18n → borra `[lang]/`, `dictionaries/` y la sección de internacionalización.
   - Sin Ant Design → borra el bloque `BEGIN/END:antd rules`.
   - Sin health check → borra la sección `🩺 Health Check`.
   - Sin Docker → borra `🐳 Docker y Despliegue`.
   - Sin backend externo → borra las secciones de `api_references` y `API — Backend externo`.
3. **Conserva siempre** el bloque `<!-- BEGIN:nextjs-agent-rules -->` tal cual: Next.js lo regenera en cada `next dev`.
4. **Añade la sección de negocio** con las reglas específicas del dominio (estados, validaciones cruzadas, permisos). Es la parte que más valor aporta y la que no se puede generalizar.
5. **Regenera `api_references/`** con `pnpm generate:api-refs` cada vez que cambie el spec OpenAPI del backend, y referencia el comando en la sección correspondiente.

La clave del template es que obliga a los agentes a **investigar primero** las guías específicas de cada herramienta (Next.js, Ant Design, etc.) en lugar de fiarse de la memoria del modelo, y a consultar la documentación del API de forma **granular** (`api_references/`) en lugar de leer specs de miles de líneas.

## Cómo configurar y emplear `generate-api-refs.mjs`

### 1. Colocación del script

Coloca el archivo `generate-api-refs.mjs` dentro de una carpeta `scripts/` en la **raíz del proyecto**:

```
{{PROJECT_ROOT}}/
├── scripts/
│   └── generate-api-refs.mjs
├── api.scalar.json          # spec OpenAPI (Swagger/Scalar) del backend
├── api_references/          # salida generada (no editar a mano)
├── package.json
└── ...
```

> El script resuelve rutas relativas a su propia ubicación (`__dirname/..`), por lo que `api.scalar.json` y `api_references/` se esperan en la raíz del repo, no dentro de `scripts/`. Si el spec tiene otro nombre (`api.swagger.json`, `openapi.json`…), ajusta la constante `SPEC_PATH` al inicio del archivo.

### 2. Registro en `package.json`

Añade el comando en la sección `scripts` de `package.json`:

```json
{
  "scripts": {
    "generate:api-refs": "node scripts/generate-api-refs.mjs"
  }
}
```

### 3. Uso

Genera la referencia una vez y **regenérala** cada vez que cambie el spec del backend:

```bash
pnpm generate:api-refs
```

Salida esperada:

- `api_references/README.md` — índice por controlador/tag.
- `api_references/<Tag>.md` — un archivo por sección con endpoints, parámetros, request/response y DTOs.

### 4. Reglas para agentes

- **No leer** el spec completo (`api.scalar.json` / `api.swagger.json`) — puede superar las 4000 líneas.
- **Sí leer** directamente el archivo relevante en `api_references/` (p. ej. `api_references/OTP Controller.md`).
- **No editar** manualmente los archivos de `api_references/`: son generados. Cambia el spec y regenera.
- Si el backend actualiza su spec, **regenéralo primero** antes de implementar o corregir endpoints en el frontend.