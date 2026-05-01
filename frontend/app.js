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
  estadoBadge.className = 'badge validado';
  estadoBadge.textContent = validacion;
  mensajeSunat.textContent = mensaje;

  datosExtraidos.innerHTML = `
    <div class="dato-item">
      <div class="dato-label">ID Factura</div>
      <div class="dato-valor">${datos.id}</div>
    </div>
    <div class="dato-item">
      <div class="dato-label">Monto</div>
      <div class="dato-valor">S/ ${datos.monto}</div>
    </div>
    <div class="dato-item">
      <div class="dato-label">Emisor</div>
      <div class="dato-valor">${datos.emisor}</div>
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
      facturasTbody.innerHTML = `<tr><td colspan="5" class="empty">No hay facturas registradas aún.</td></tr>`;
      return;
    }

    facturasTbody.innerHTML = facturas.map(f => `
      <tr>
        <td>${f.id}</td>
        <td>${f.emisor}</td>
        <td>S/ ${f.monto}</td>
        <td><span class="status-pill">${f.validacion}</span></td>
        <td>${new Date(f.fechaSubida).toLocaleString('es-PE')}</td>
      </tr>
    `).join('');
  } catch {
    facturasTbody.innerHTML = `<tr><td colspan="5" class="empty">Error al cargar facturas.</td></tr>`;
  }
}

refreshBtn.addEventListener('click', cargarFacturas);

cargarFacturas();
