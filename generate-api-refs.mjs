import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");
const SPEC_PATH = resolve(root, "api.scalar.json");
const OUT_DIR = resolve(root, "api_references");

const spec = JSON.parse(readFileSync(SPEC_PATH, "utf8"));
const paths = spec.paths ?? {};
const schemas = spec.components?.schemas ?? {};
const parameters = spec.components?.parameters ?? {};
const requestBodies = spec.components?.requestBodies ?? {};
const pathItems = spec.components?.pathItems ?? {};
const tagDefs = spec.tags ?? [];

const tagDescription = new Map(tagDefs.map((t) => [t.name, t.description ?? ""]));

function refName(ref) {
  if (!ref || typeof ref !== "string") return null;
  const i = ref.lastIndexOf("/");
  return ref.slice(i + 1);
}

function resolveRef(ref) {
  if (!ref || typeof ref !== "string") return null;
  if (ref.startsWith("#/components/schemas/")) {
    const name = refName(ref);
    return name ? schemas[name] : null;
  }
  if (ref.startsWith("#/components/parameters/")) {
    const name = refName(ref);
    return name ? parameters[name] : null;
  }
  if (ref.startsWith("#/components/requestBodies/")) {
    const name = refName(ref);
    return name ? requestBodies[name] : null;
  }
  if (ref.startsWith("#/components/pathItems/")) {
    const name = refName(ref);
    return name ? pathItems[name] : null;
  }
  return null;
}

function resolveParameter(param) {
  if (!param || typeof param !== "object") return null;
  if (param.$ref) {
    const resolved = resolveRef(param.$ref);
    return resolved || null;
  }
  return param;
}

function resolveRequestBody(rb) {
  if (!rb || typeof rb !== "object") return null;
  if (rb.$ref) {
    const resolved = resolveRef(rb.$ref);
    return resolved || null;
  }
  return rb;
}

function resolvePathItem(pathItem) {
  if (!pathItem || typeof pathItem !== "object") return null;
  if (pathItem.$ref) {
    const resolved = resolveRef(pathItem.$ref);
    if (!resolved) return null;
    // Merge overrides from the original path item (excluding $ref)
    const { $ref: _ignore, ...overrides } = pathItem;
    return { ...(resolved || {}), ...overrides };
  }
  return pathItem;
}

function typeStr(schema, depth = 0) {
  if (!schema) return "unknown";
  if (typeof schema !== "object") return String(schema);
  if (schema.$ref) return refName(schema.$ref);
  if (schema.enum) {
    const enumStr = schema.enum.map((e) => JSON.stringify(e)).join(" | ");
    const nullable = schema.nullable ? " | null" : "";
    return `enum: ${enumStr}${nullable}`;
  }
  if (schema.oneOf || schema.anyOf) {
    const parts = (schema.oneOf ?? schema.anyOf).map((s) => typeStr(s, depth + 1));
    const nullable = schema.nullable ? " | null" : "";
    return parts.join(" | ") + nullable;
  }
  if (schema.allOf) {
    // For display in type positions, show allOf members; merge details handled elsewhere
    const parts = schema.allOf.map((s) => typeStr(s, depth + 1));
    const nullable = schema.nullable ? " | null" : "";
    return parts.join(" & ") + nullable;
  }
  if (schema.type === "array") {
    const itemsType = typeStr(schema.items ?? {}, depth + 1);
    const nullable = schema.nullable ? " | null" : "";
    return `Array<${itemsType}>${nullable}`;
  }
  let t = schema.type;
  if (Array.isArray(t)) {
    const nonNull = t.filter((x) => x !== "null");
    if (nonNull.length === 1) {
      t = nonNull[0];
    } else if (nonNull.length > 1) {
      t = nonNull.join(" | ");
    } else {
      t = "unknown";
    }
  }
  if (!t) t = "object";
  if (schema.format) t += ` (${schema.format})`;
  if (schema.nullable === true && !(Array.isArray(schema.type) && schema.type.includes("null"))) {
    t += " | null";
  } else if (Array.isArray(schema.type) && schema.type.includes("null")) {
    // Already handled above if multiple types; ensure null noted
    if (!String(t).includes("null")) {
      // keep as is if already combined
    }
  }
  return t;
}

function collectRefs(node, acc) {
  if (!node || typeof node !== "object") return;
  if (Array.isArray(node)) {
    node.forEach((x) => collectRefs(x, acc));
    return;
  }
  if (typeof node.$ref === "string") {
    const n = refName(node.$ref);
    if (n && !acc.has(n)) {
      acc.add(n);
      if (schemas[n]) {
        collectRefs(schemas[n], acc);
      }
    }
    return;
  }
  for (const key of ["properties", "items", "allOf", "oneOf", "anyOf", "additionalProperties"]) {
    if (node[key]) {
      if (typeof node[key] === "object") {
        collectRefs(node[key], acc);
      }
    }
  }
  // also scan common locations
  if (node.content) {
    for (const c of Object.values(node.content)) {
      if (c && typeof c === "object" && c.schema) collectRefs(c.schema, acc);
    }
  }
}

function mergeAllOf(schema) {
  if (!schema || typeof schema !== "object") return schema;
  if (!schema.allOf || !Array.isArray(schema.allOf)) return schema;
  let mergedProps = {};
  let mergedRequired = new Set(schema.required ?? []);
  let merged = {};
  for (const part of schema.allOf) {
    let resolved = part;
    if (resolved && resolved.$ref) {
      const name = refName(resolved.$ref);
      if (name && schemas[name]) resolved = schemas[name];
    }
    // recursively merge if part also has allOf
    resolved = mergeAllOf(resolved);
    if (resolved && resolved.properties) {
      mergedProps = { ...mergedProps, ...resolved.properties };
    }
    if (resolved && Array.isArray(resolved.required)) {
      for (const r of resolved.required) mergedRequired.add(r);
    }
    // copy other fields from parts if useful
    for (const k of ["description", "title", "type", "format", "enum", "nullable"]) {
      if (resolved && resolved[k] !== undefined && merged[k] === undefined) {
        merged[k] = resolved[k];
      }
    }
  }
  // merge own properties/required too
  if (schema.properties) mergedProps = { ...mergedProps, ...schema.properties };
  if (Array.isArray(schema.required)) {
    for (const r of schema.required) mergedRequired.add(r);
  }
  for (const k of ["description", "title", "type", "format", "enum", "nullable"]) {
    if (schema[k] !== undefined && merged[k] === undefined) merged[k] = schema[k];
  }
  merged.properties = mergedProps;
  if (mergedRequired.size) merged.required = [...mergedRequired];
  // keep original allOf info not necessary
  return merged;
}

function renderSchema(name) {
  const schema = schemas[name];
  if (!schema) return "";
  let s = schema;
  if (s && s.$ref) {
    const n = refName(s.$ref);
    if (n && schemas[n]) s = schemas[n];
  }
  s = mergeAllOf(s);
  const props = s.properties ?? {};
  const required = new Set(s.required ?? []);
  let out = `### ${name}\n\n`;
  if (s.description) out += `${s.description}\n\n`;
  if (Object.keys(props).length === 0) {
    // check if it's just a ref/primitive/array
    out += `_Sin propiedades explícitas._\n\n`;
    if (s.additionalProperties) {
      const ap = s.additionalProperties;
      out += `additionalProperties: \`${typeStr(ap === true ? {} : ap)}\`\n\n`;
    }
    return out;
  }
  out += "| Campo | Tipo | Requerido | Descripción |\n";
  out += "| --- | --- | --- | --- |\n";
  for (const [field, def] of Object.entries(props)) {
    let d = def;
    if (d && d.$ref) {
      // keep ref name in typeStr
    }
    const isReq = required.has(field) ? "Sí" : "No";
    const desc = (d?.description ?? "").replace(/\n/g, " ");
    out += `| ${field} | \`${typeStr(d)}\` | ${isReq} | ${desc} |\n`;
  }
  if (s.additionalProperties) {
    const ap = s.additionalProperties;
    out += `| [key: string] | \`${typeStr(ap === true ? {} : ap)}\` | No | additionalProperties |\n`;
  }
  out += "\n";
  return out;
}

function collectAllRefs(op) {
  const refs = new Set();
  // parameters (maybe unresolved)
  for (const p of op.parameters ?? []) {
    const resolved = resolveParameter(p);
    if (resolved && resolved.schema) collectRefs(resolved.schema, refs);
    else if (p && p.schema) collectRefs(p.schema, refs);
    else if (p && p.$ref) {
      const n = refName(p.$ref);
      if (n && parameters[n]) {
        if (parameters[n].schema) collectRefs(parameters[n].schema, refs);
      }
    }
  }
  if (op.requestBody) {
    const rb = resolveRequestBody(op.requestBody);
    if (rb && rb.content) {
      for (const c of Object.values(rb.content)) {
        if (c && typeof c === "object" && c.schema) collectRefs(c.schema, refs);
      }
    } else if (op.requestBody.content) {
      for (const c of Object.values(op.requestBody.content)) {
        if (c && typeof c === "object" && c.schema) collectRefs(c.schema, refs);
      }
    }
  }
  for (const r of Object.values(op.responses ?? {})) {
    if (!r || typeof r !== "object") continue;
    if (r.content) {
      for (const c of Object.values(r.content)) {
        if (c && typeof c === "object" && c.schema) collectRefs(c.schema, refs);
      }
    }
  }
  return refs;
}

function renderOperation(method, path, op, pathItemParams = [], pathItemTags = []) {
  const lines = [];
  lines.push(`#### \`${method.toUpperCase()} ${path}\``);
  if (op.deprecated) {
    // mark deprecated
    lines[lines.length - 1] = `#### \`${method.toUpperCase()} ${path}\` _(deprecated)_`;
  }
  if (op.summary) lines.push(`**${op.summary}**`);
  if (op.description) {
    lines.push("");
    lines.push(op.description);
  } else if (op.summary && op.description === undefined) {
    // nothing extra
  }

  // combine params: pathItem first, then operation
  const allParamsRaw = [...(pathItemParams || []), ...(op.parameters ?? [])];
  const resolvedParams = [];
  for (const p of allParamsRaw) {
    const r = resolveParameter(p);
    if (r) resolvedParams.push(r);
  }
  if (resolvedParams.length) {
    lines.push("");
    lines.push("**Parámetros**");
    lines.push("");
    lines.push("| Nombre | En | Tipo | Requerido | Descripción |");
    lines.push("| --- | --- | --- | --- | --- |");
    for (const p of resolvedParams) {
      const req = p.required ? "Sí" : "No";
      const desc = (p.description ?? "").replace(/\n/g, " ");
      const schema = p.schema ?? {};
      lines.push(`| ${p.name ?? "-"} | ${p.in ?? "-"} | \`${typeStr(schema)}\` | ${req} | ${desc} |`);
    }
  }

  const rbRaw = op.requestBody;
  const rb = resolveRequestBody(rbRaw);
  if (rb) {
    lines.push("");
    lines.push(`**Request Body**${rb.required ? " (requerido)" : ""}`);
    const content = rb.content ?? {};
    if (Object.keys(content).length === 0) {
      // nothing
    } else if (Object.keys(content).length === 1) {
      const [ct, ctObj] = Object.entries(content)[0];
      const jsonSchema = ctObj?.schema;
      if (jsonSchema) {
        const refs = new Set();
        collectRefs(jsonSchema, refs);
        lines.push("");
        lines.push(`Content-Type: \`${ct}\``);
        lines.push(`Tipo: \`${typeStr(jsonSchema)}\``);
        if (refs.size) lines.push(`DTOs: ${[...refs].map((r) => `\`${r}\``).join(", ")}`);
      }
    } else {
      // multiple content types
      lines.push("");
      for (const [ct, ctObj] of Object.entries(content)) {
        const jsonSchema = ctObj?.schema;
        lines.push(`- Content-Type: \`${ct}\``);
        if (jsonSchema) {
          lines.push(`  - Tipo: \`${typeStr(jsonSchema)}\``);
          const refs = new Set();
          collectRefs(jsonSchema, refs);
          if (refs.size) lines.push(`  - DTOs: ${[...refs].map((r) => `\`${r}\``).join(", ")}`);
        }
      }
    }
  }

  const responses = op.responses ?? {};
  if (Object.keys(responses).length) {
    lines.push("");
    lines.push("**Respuestas**");
    lines.push("");
    lines.push("| Código | Descripción | Cuerpo |");
    lines.push("| --- | --- | --- |");
    const refs = new Set();
    for (const [code, resp] of Object.entries(responses)) {
      if (!resp || typeof resp !== "object") {
        lines.push(`| ${code} | — | — |`);
        continue;
      }
      const content = resp.content ?? {};
      let body = "—";
      if (Object.keys(content).length > 0) {
        // pick application/json if present else first
        const jsonKey = Object.keys(content).find((k) => k.includes("json")) || Object.keys(content)[0];
        const sch = content[jsonKey]?.schema;
        if (sch) {
          collectRefs(sch, refs);
          body = `\`${typeStr(sch)}\``;
        } else {
          body = `(${jsonKey})`;
        }
      }
      const desc = (resp.description ?? "").replace(/\n/g, " ");
      lines.push(`| ${code} | ${desc} | ${body} |`);
    }
    if (refs.size) {
      lines.push("");
      lines.push(`DTOs de respuesta: ${[...refs].map((r) => `\`${r}\``).join(", ")}`);
    }
  }

  lines.push("");
  lines.push("---");
  lines.push("");
  return { markdown: lines.join("\n"), refs: collectAllRefs(op) };
}

function sanitizeTagName(tag) {
  if (!tag || typeof tag !== "string") return "_Untagged";
  // replace unsafe chars
  let safe = tag.replace(/[^A-Za-z0-9._-]+/g, "-");
  safe = safe.replace(/-+/g, "-");
  safe = safe.replace(/^-|-$/g, "");
  if (!safe) return "_Untagged";
  return safe;
}

mkdirSync(OUT_DIR, { recursive: true });

const byTag = new Map();
for (const [path, pathEntry] of Object.entries(paths)) {
  if (!pathEntry || typeof pathEntry !== "object") continue;
  let resolvedPathItem = resolvePathItem(pathEntry);
  if (!resolvedPathItem) resolvedPathItem = pathEntry;
  // get path-level params and tags
  const pathLevelParamsRaw = resolvedPathItem.parameters ?? [];
  const pathLevelTags = resolvedPathItem.tags ?? [];

  // iterate methods
  const methods = ["get", "put", "post", "delete", "options", "head", "patch", "trace"];
  for (const method of methods) {
    const op = resolvedPathItem[method];
    if (typeof op !== "object" || Array.isArray(op)) continue;
    const tags = op.tags && op.tags.length ? op.tags : (pathLevelTags.length ? pathLevelTags : ["_Untagged"]);
    for (const tag of tags) {
      if (!byTag.has(tag)) byTag.set(tag, []);
      byTag.get(tag).push({ method, path, op, pathLevelParamsRaw });
    }
  }
  // also handle if operations are not in known methods but present? OpenAPI methods are standard
}

const indexRows = [];
const tagNames = [...byTag.keys()].sort((a, b) =>
  a === "_Untagged" ? 1 : b === "_Untagged" ? -1 : a.localeCompare(b)
);

for (const tag of tagNames) {
  const entries = byTag.get(tag);
  const safeFile = `${sanitizeTagName(tag)}.md`;
  const allRefs = new Set();
  const opSections = entries.map(({ method, path, op, pathLevelParamsRaw }) => {
    const { markdown, refs } = renderOperation(method, path, op, pathLevelParamsRaw);
    refs.forEach((r) => allRefs.add(r));
    return markdown;
  });

  let doc = `# ${tag}\n\n`;
  const desc = tagDescription.get(tag);
  if (desc) doc += `${desc}\n\n`;
  doc += `> Generado desde \`api.scalar.json\`. No editar manualmente: ejecuta \`pnpm generate:api-refs\`.\n\n`;
  doc += `## Endpoints (${entries.length})\n\n`;
  doc += opSections.join("\n");

  if (allRefs.size) {
    doc += `## DTOs referenciados\n\n`;
    for (const name of [...allRefs].sort()) {
      if (schemas[name]) {
        doc += renderSchema(name);
      }
    }
  }

  writeFileSync(resolve(OUT_DIR, safeFile), doc, "utf8");

  const summary = desc
    ? desc.split("\n")[0].slice(0, 80)
    : entries.map((e) => e.path).slice(0, 3).join(", ");
  indexRows.push(`| ${tag} | [${safeFile}](./${safeFile}) | ${entries.length} | ${summary} |`);
}

const readme = `# API References\n\n` +
  `Referencia de la API \`${spec.info?.title ?? "api"}\` (v${spec.info?.version ?? "?"}) generada desde \`api.scalar.json\`.\n\n` +
  `> Fuente de verdad: \`api.scalar.json\`. Regenerar con \`pnpm generate:api-refs\` tras cambios en el backend. ` +
  `Para consultas de API, lee solo el archivo del controlador/sección relevante en lugar del spec completo.\n\n` +
  `## Índice por controlador\n\n` +
  `| Sección | Archivo | Endpoints | Descripción |\n` +
  `| --- | --- | --- | --- |\n` +
  indexRows.join("\n") + "\n";

writeFileSync(resolve(OUT_DIR, "README.md"), readme, "utf8");

console.log(`Generado: ${tagNames.length} secciones en ${OUT_DIR}`);
console.log(tagNames.join(", "));
