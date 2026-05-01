const API = 'http://localhost:3000/factura';

const pdfInput   = document.getElementById('pdfInput');
const dropZone   = document.getElementById('dropZone');
const browseBtn  = document.getElementById('browseBtn');
const fileName   = document.getElementById('fileName');
const submitBtn  = document.getElementById('submitBtn');
const uploadForm = document.getElementById('uploadForm');
const resultCard = document.getElementById('resultCard');
const estadoBadge    = document.getElementById('estadoBadge');
const mensajeSunat   = document.getElementById('mensajeSunat');
const datosExtraidos = document.getElementById('datosExtraidos');
const facturasTbody  = document.getElementById('facturasTbody');
const refreshBtn     = document.getElementById('refreshBtn');

// --- Drag & drop + browse ---
browseBtn.addEventListener('click', () => pdfInput.click());
dropZone.addEventListener('click', () => pdfInput.click());

dropZone.addEventListener('dragover', (e) => { e.preventDefault(); dropZone.classList.add('over'); });
dropZone.addEventListener('dragleave', () => dropZone.classList.remove('over'));
dropZone.addEventListener('drop', (e) => {
  e.preventDefault();
  dropZone.classList.remove('over');
  const file = e.dataTransfer.files[0];
  if (file && file.type === 'application/pdf') setFile(file);
});

pdfInput.addEventListener('change', () => {
  if (pdfInput.files[0]) setFile(pdfInput.files[0]);
});

function setFile(file) {
  pdfInput._file = file;
  fileName.textContent = `📎 ${file.name}`;
  submitBtn.disabled = false;
}

// --- Upload & validate ---
uploadForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const file = pdfInput._file || pdfInput.files[0];
  if (!file) return;

  if (file.type !== 'application/pdf') {
    mostrarError('Solo se aceptan archivos PDF.');
    return;
  }

  if (file.size > 5 * 1024 * 1024) {
    mostrarError('El archivo supera el límite de 5 MB.');
    return;
  }

  submitBtn.textContent = 'Procesando...';
  submitBtn.disabled = true;
  resultCard.hidden = true;

  const formData = new FormData();
  formData.append('pdf', file);

  try {
    const res = await fetch(`${API}/load`, { method: 'POST', body: formData });
    const json = await res.json();

    if (!res.ok) throw new Error(json.error || 'Error desconocido');

    mostrarResultado(json);
    cargarFacturas();
  } catch (err) {
    mostrarError(err.message);
  } finally {
    submitBtn.textContent = 'Enviar y Validar';
    submitBtn.disabled = false;
  }
});

function mostrarError(msg) {
  estadoBadge.className = 'badge error';
  estadoBadge.textContent = 'error';
  mensajeSunat.textContent = msg;
  datosExtraidos.innerHTML = '';
  resultCard.hidden = false;
}

function mostrarResultado({ datos, validacion, mensaje }) {
  estadoBadge.className = validacion === 'rechazado' ? 'badge error' : 'badge validado';
  estadoBadge.textContent = validacion;
  mensajeSunat.textContent = mensaje;

  datosExtraidos.innerHTML = `
    <div class="dato-item">
      <div class="dato-label">RUC Emisor</div>
      <div class="dato-valor">${datos.ruc_emisor}</div>
    </div>
    <div class="dato-item">
      <div class="dato-label">RUC Factura</div>
      <div class="dato-valor">${datos.ruc_factura}</div>
    </div>
    <div class="dato-item">
      <div class="dato-label">Razón Social</div>
      <div class="dato-valor">${datos.razon_social}</div>
    </div>
    <div class="dato-item">
      <div class="dato-label">Fecha Emisión</div>
      <div class="dato-valor">${datos.fecha_emision}</div>
    </div>
    <div class="dato-item">
      <div class="dato-label">Fecha Vencimiento</div>
      <div class="dato-valor">${datos.fecha_vencimiento}</div>
    </div>
    <div class="dato-item">
      <div class="dato-label">Moneda</div>
      <div class="dato-valor">${datos.tipo_moneda}</div>
    </div>
    <div class="dato-item">
      <div class="dato-label">Monto Neto</div>
      <div class="dato-valor">${datos.monto_neto}</div>
    </div>
  `;

  resultCard.hidden = false;
}

// --- Lista de facturas ---
async function cargarFacturas() {
  try {
    const res = await fetch(`${API}/list`);
    const facturas = await res.json();

    if (!facturas.length) {
      facturasTbody.innerHTML = `<tr><td colspan="8" class="empty">No hay facturas registradas aún.</td></tr>`;
      return;
    }

    facturasTbody.innerHTML = facturas.map(f => `
      <tr>
        <td>${f.ruc_factura}</td>
        <td>${f.ruc_emisor}</td>
        <td>${f.razon_social}</td>
        <td>${f.fecha_emision}</td>
        <td>${f.fecha_vencimiento}</td>
        <td>${f.tipo_moneda}</td>
        <td>${f.monto_neto}</td>
        <td><span class="status-pill ${f.validacion === 'rechazado' ? 'status-rechazado' : ''}">${f.validacion}</span></td>
      </tr>
    `).join('');
  } catch {
    facturasTbody.innerHTML = `<tr><td colspan="5" class="empty">Error al cargar facturas.</td></tr>`;
  }
}

refreshBtn.addEventListener('click', cargarFacturas);

cargarFacturas();
