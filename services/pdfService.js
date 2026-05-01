const pdfParse = require('pdf-parse');

function cleanSpaces(str) {
  if (!str) return '';
  return str.replace(/[\s\xA0]+/g, ' ').replace(/\u00AD/g, '-').trim();
}

async function extraerDatosFactura(buffer) {
  const { text } = await pdfParse(buffer);

  if (!text || text.trim().length === 0) {
    throw new Error('El PDF no contiene texto extraíble. Puede ser un PDF escaneado (imagen).');
  }

  // RUC de la factura (El que aparece en la parte superior)
  const rucFacturaMatch = text.match(/(?:RUC|R\.U\.C\.)\s*:?\s*(20\d{9}|10\d{9})/i) || text.match(/(20\d{9}|10\d{9})/);
  
  // RUC del emisor (El que está entre Señor(es) y Dirección del Cliente)
  const rucEmisorMatch = text.match(/Señor\(es\)[\s\S]*?(?:RUC|R\.U\.C\.)\s*:?\s*(20\d{9}|10\d{9})[\s\S]*?Direcci[oó]n/i) || 
                         text.match(/Señor\(es\)[\s\S]*?(?:RUC|R\.U\.C\.)\s*:?\s*(20\d{9}|10\d{9})/i);

  // Razón social (priorizamos al Cliente "Señor(es)" o en su defecto "RAZON SOCIAL")
  const razonSocialMultiline = text.match(/Señor\(es\)\s*:\s*([\s\S]*?)(?:RUC|Dirección|Fecha)/i) ||
                               text.match(/(?:RAZ[OÓ]N\s+SOCIAL|EMISOR|VENDEDOR|SEÑOR(?:ES)?)\s*:?\s*([^\n\r]+)/i);

  // Fecha de emisión
  const fechaEmisionMatch = text.match(/(?:FECHA[\s\xA0]+DE[\s\xA0]+EMISI[OÓ]N|FECHA)\s*:?\s*([\d]{2}[\/\-][\d]{2}[\/\-][\d]{2,4})/i);

  // Fecha de vencimiento
  const fechaVencimientoMatch = text.match(/Fecha[\s\xA0]+de[\s\xA0]+Vencimiento\s*:([^\n\r]*)/i);

  // Tipo de moneda
  const tipoMonedaMatch = text.match(/Tipo[\s\xA0]+de[\s\xA0]+Moneda\s*:\s*([A-Za-z\s\xA0]+?)(?:\n|\r|$)/i) ||
                          text.match(/(?:MONEDA|TIPO DE MONEDA)\s*:?\s*([A-Za-z\s\xA0]+)(?:\n|\r|$)/i);

  // Monto neto
  const montoNetoMatch = text.match(/Importe[\s\xA0]+Total\s*:\s*(?:S\/\.?\s*|USD\s*|\$\s*)?([\d,\.]+)/i) ||
                         text.match(/(?:TOTAL\s+(?:A\s+PAGAR|GENERAL|IMPORTE)|IMPORTE\s+TOTAL|MONTO\s+TOTAL|TOTAL)\s*:?\s*(?:S\/\.?\s*|USD\s*|\$\s*)?([\d,\.]+)/i);

  return {
    ruc_emisor: rucEmisorMatch ? rucEmisorMatch[1].trim() : 'No encontrado',
    ruc_factura: rucFacturaMatch ? cleanSpaces(rucFacturaMatch[1]) : `FAC-${Date.now()}`,
    razon_social: razonSocialMultiline ? cleanSpaces(razonSocialMultiline[1]) : 'No encontrado',
    fecha_emision: fechaEmisionMatch ? fechaEmisionMatch[1].trim() : 'No encontrada',
    fecha_vencimiento: fechaVencimientoMatch ? (fechaVencimientoMatch[1].trim() || 'No especificada') : 'No encontrada',
    tipo_moneda: tipoMonedaMatch ? cleanSpaces(tipoMonedaMatch[1]) : 'No encontrada',
    monto_neto: montoNetoMatch ? montoNetoMatch[1].trim() : 'No encontrado'
  };
}

module.exports = { extraerDatosFactura };
