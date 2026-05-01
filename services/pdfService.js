const pdfParse = require('pdf-parse');

async function extraerDatosFactura(buffer) {
  const { text } = await pdfParse(buffer);

  if (!text || text.trim().length === 0) {
    throw new Error('El PDF no contiene texto extraíble. Puede ser un PDF escaneado (imagen).');
  }

  const idMatch =
    text.match(/(?:N[°º]?\.?\s*(?:Factura|Comprobante|Invoice)|F-|FAC)\s*:?\s*([A-Z0-9\-\/]+)/i) ||
    text.match(/([A-Z]{1,3}-\d{3,}-\d+)/);

  const montoMatch =
    text.match(/(?:TOTAL\s+(?:A\s+PAGAR|GENERAL|IMPORTE)|IMPORTE\s+TOTAL|MONTO\s+TOTAL)\s*:?\s*(?:S\/\.?\s*)?([\d,\.]+)/i) ||
    text.match(/(?:TOTAL|Total)\s*:?\s*(?:S\/\.?\s*)?([\d,\.]+)/i);

  const emisorMatch =
    text.match(/(?:RAZ[OÓ]N\s+SOCIAL|EMISOR|VENDEDOR)\s*:?\s*([^\n\r]+)/i) ||
    text.match(/^([A-Z][A-Z\s&.,]+(S\.A\.C?\.?|S\.R\.L\.?|E\.I\.R\.L\.?|SAC|SRL))/m);

  return {
    id: idMatch ? idMatch[1].trim() : `FAC-${Date.now()}`,
    monto: montoMatch ? montoMatch[1].trim() : 'No especificado',
    emisor: emisorMatch ? emisorMatch[1].trim() : 'No especificado',
  };
}

module.exports = { extraerDatosFactura };
