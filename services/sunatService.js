function parseDateStr(dateStr) {
  if (!dateStr || typeof dateStr !== 'string') return null;
  const parts = dateStr.split(/[\/\-]/);
  if (parts.length !== 3) return null;
  const day = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10) - 1;
  let year = parseInt(parts[2], 10);
  if (year < 100) year += 2000;
  return new Date(year, month, day);
}

async function validarEnSunat(datosFactura) {
  // 1. Validar completitud de campos
  const camposRequeridos = ['ruc_emisor', 'ruc_factura', 'razon_social', 'fecha_emision', 'fecha_vencimiento', 'tipo_moneda', 'monto_neto'];
  
  for (const campo of camposRequeridos) {
    const valor = datosFactura[campo];
    if (!valor || valor.includes('No encontrado') || valor.includes('No encontrada') || valor.includes('No especificada')) {
      return {
        estado: 'rechazado',
        mensaje: `Validación fallida: El campo '${campo}' está incompleto o falta en el documento.`,
      };
    }
  }

  // 2. Validar fechas
  const fechaEmision = parseDateStr(datosFactura.fecha_emision);
  const fechaVencimiento = parseDateStr(datosFactura.fecha_vencimiento);
  const ahora = new Date();

  // Ignorar la hora para comparar puramente los días
  ahora.setHours(0, 0, 0, 0);

  if (!fechaEmision || !fechaVencimiento) {
    return {
      estado: 'rechazado',
      mensaje: 'Validación fallida: Formato de fecha inválido.',
    };
  }

  if (fechaEmision > ahora) {
    return {
      estado: 'rechazado',
      mensaje: 'Validación fallida: La fecha de emisión no puede ser futura.',
    };
  }

  if (fechaVencimiento < ahora) {
    return {
      estado: 'rechazado',
      mensaje: 'Validación fallida: La fecha de vencimiento debe ser posterior a la actual.',
    };
  }

  return {
    estado: 'validado',
    mensaje: `Factura ${datosFactura.ruc_factura} validada correctamente. Completa y coherente.`,
  };
}

module.exports = { validarEnSunat };
