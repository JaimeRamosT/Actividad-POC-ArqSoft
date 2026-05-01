async function validarEnSunat(datosFactura) {
  // Mock SUNAT — siempre responde "validado"
  return {
    estado: 'validado',
    mensaje: `Factura ${datosFactura.id} validada correctamente por SUNAT`,
  };
}

module.exports = { validarEnSunat };
