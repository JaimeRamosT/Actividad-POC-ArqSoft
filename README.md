# POC — Sistema de Factoring con Validación SUNAT
**Arquitectura de Software · Caso de Estudio #6 · UTEC 2026-I**

---

## 1. Requerimiento Core (Must-Have)

> **RF-CORE:** El vendedor de facturas puede cargar un PDF/XML de factura y recibir confirmación de validación SUNAT.

Este es el flujo más crítico del sistema de factoring: sin él no hay plataforma. Todos los demás flujos (inversión, pago BCR) dependen de que la factura esté cargada y validada.

---

## 2. Happy Path vs Critical Path

### Happy Path
```
Vendedor sube PDF
    → POST /factura/load
    → pdfService extrae [ID, monto, emisor]
    → dbService guarda factura en DB
    → POST /factura/validate
    → sunatService responde "validado"
    → Frontend muestra badge verde + datos extraídos
```

### Critical Path
```
Vendedor sube PDF
    → POST /factura/load
    → pdfService NO puede parsear el PDF  ← falla aquí
         └─ PDF escaneado (imagen), corrupto o cifrado
    → 500 Internal Server Error
    → Frontend muestra mensaje de error

    ── o ──

    → pdfService extrae datos
    → POST /factura/validate
    → sunatService NO responde (timeout / RUC inválido)  ← falla aquí
    → 422 Unprocessable Entity
    → Factura NO se guarda
    → Frontend muestra "No validado por SUNAT"
```

**Componentes que pueden generar retraso o fallo en el flujo principal:**
| Componente | Riesgo | Impacto |
|---|---|---|
| `pdfService` (pdf-parse) | PDF no parseable | Bloquea todo el flujo |
| `sunatService` | Timeout / API caída | Factura no puede validarse |
| `dbService` | Corrupción en memoria | Pérdida de datos en sesión |
| Multer (upload) | Archivo > límite de tamaño | Rechazo silencioso |

---

## 3. Tech Stack

### Decisión para el sistema real (producción)

| Decisión | Justificación |
|---|---|
| **Arquitectura: Serverless (AWS Lambda)** | Carga baja ~0.081 req/seg en pico. Solo se paga por invocación. Escala automáticamente ante spikes de upload en horario laboral. |
| **DB: NoSQL (DynamoDB)** | Facturas tienen esquemas variados según emisor. Sin particionamiento manual. Integración nativa con Lambda y API Gateway. |
| **API Gateway (AWS)** | Autenticación JWT, rate limiting, routing. Punto de entrada único para web y móvil. |
| **Object Storage (S3)** | PDFs y XMLs (~5 MB/factura) se guardan en S3. Las Lambdas leen/escriben directamente sin pasar por la DB. |

### Restricciones consideradas
- **Memoria:** Lambda tiene 128 MB–10 GB configurables. pdf-parse necesita ~50 MB en pico → sin problema.
- **Red:** API Gateway impone timeout de 29 seg. SUNAT debe responder antes de ese límite.
- **Disco:** No hay disco persistente en Lambda → los PDFs van directo a S3, no a /tmp.

### Decisión para el POC (local)

| Producción | POC equivalente | Por qué |
|---|---|---|
| AWS Lambda | Node.js + Express | Simula el handler de Lambda localmente |
| DynamoDB | LokiJS (in-memory) | Sin infraestructura, misma interfaz clave-valor |
| S3 | multer (memoryStorage) | El buffer del PDF queda en RAM durante el request |
| API Gateway | Express Router | Mismo contrato de endpoints |
| SUNAT real | Mock que retorna "validado" | Fuera del alcance del POC |

### Benchmarking (por qué Node.js y no Python/Java)

| Criterio | Node.js | Python (Flask) | Java (Spring) |
|---|---|---|---|
| Cold start Lambda | ~200 ms | ~300 ms | ~1–3 seg |
| Ecosistema PDF parsing | `pdf-parse` maduro | `pdfminer` similar | iText (pesado) |
| Setup POC local | `npm start` (1 cmd) | virtualenv + pip | Maven + JDK |
| Curva del equipo | Media-alta | Alta | Alta |
| **Ganador POC** | ✓ | — | — |

---

## 4. Estructura de Carpetas / Servicios

```
poc-arqsoft-facturas/
│
├── server.js                  ← Entry point. Express app. Sirve frontend + monta rutas.
│
├── routes/
│   └── factura.js             ← Controlador HTTP. Orquesta los 3 servicios.
│                                 Endpoints: /load  /validate  /list
│
├── services/
│   ├── pdfService.js          ← Extrae ID, monto y emisor del buffer PDF.
│   ├── dbService.js           ← CRUD sobre LokiJS (colección "facturas").
│   └── sunatService.js        ← Mock SUNAT. Siempre retorna { estado: "validado" }.
│
├── frontend/
│   ├── index.html             ← Form upload + sección resultado + tabla facturas.
│   ├── style.css              ← UI oscura, sin dependencias externas.
│   └── app.js                 ← fetch() al backend. Renderiza resultado y lista.
│
└── package.json               ← "start": "node server.js"
```

---

## 5. Flujograma de Clases y Funciones (Happy Path)

```
[Frontend: app.js]
    │
    │  FormData { pdf: File }
    ▼
[routes/factura.js → POST /factura/load]
    │
    ├─→ [services/pdfService.js]
    │       └── extraerDatosFactura(buffer)
    │               → pdfParse(buffer)          // extrae texto crudo
    │               → regex ID, monto, emisor   // parsea campos
    │               → return { id, monto, emisor }
    │
    ├─→ [services/sunatService.js]
    │       └── validarEnSunat({ id, monto, emisor })
    │               → return { estado: "validado", mensaje }
    │
    ├─→ [services/dbService.js]
    │       └── guardarFactura({ id, monto, emisor, validacion })
    │               → lokiCollection.insert(doc)
    │
    └─→ res.json({ datos, validacion, mensaje })
            │
            ▼
    [Frontend: app.js]
        └── mostrarResultado()   // badge verde + datos
        └── cargarFacturas()     // GET /factura/list → actualiza tabla

[routes/factura.js → GET /factura/list]
    └─→ [services/dbService.js]
            └── obtenerFacturas()
                    → lokiCollection.find()
                    → return [{ id, monto, emisor, validacion, fechaSubida }]
```

---

## 6. Endpoints del POC

| Método | Endpoint | Descripción | Respuesta |
|---|---|---|---|
| POST | `/factura/load` | Recibe PDF, extrae datos, valida con SUNAT mock y guarda | `{ datos, validacion, mensaje }` |
| POST | `/factura/validate` | Recibe datos JSON y consulta SUNAT mock | `{ estado, mensaje }` |
| GET | `/factura/list` | Lista todas las facturas guardadas en LokiJS | `[ ...facturas ]` |

---

## 7. Cómo ejecutar

```bash
# 1. Instalar dependencias (solo la primera vez)
npm install

# 2. Levantar el servidor
npm start
```

Abrir en el navegador: **http://localhost:3000**

### Librerías instaladas

| Librería | Rol en el sistema |
|---|---|
| `express` | Servidor HTTP / simulación de API Gateway |
| `cors` | Permite peticiones cross-origin desde el frontend |
| `multer` | Recibe el PDF en memoria (simula upload a S3) |
| `pdf-parse` | Extrae texto del PDF para obtener campos de la factura |
| `lokijs` | Base de datos embebida en memoria (simula DynamoDB) |

---

## 8. Próximos requerimientos core a implementar

Siguiendo la misma metodología (Happy Path → Critical Path → Tech → Estructura → Flujograma):

1. **RF: Publicar factura en el marketplace** (`POST /factura/sell`)
2. **RF: Invertir en una factura** (`POST /factura/invest`)
3. **RF: Procesar pago vía BCR** (`POST /payment`)
4. **RF: Autenticación con JWT** (`POST /login`)
