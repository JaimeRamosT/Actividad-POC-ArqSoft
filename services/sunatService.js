async function validarEnSunat(datosFactura) {
  // Mock SUNAT — siempre responde "validado"
  return {
    estado: 'validado',
    mensaje: `Factura ${datosFactura.ruc_factura} validada correctamente por SUNAT`,
  };
}

module.exports = { validarEnSunat };
