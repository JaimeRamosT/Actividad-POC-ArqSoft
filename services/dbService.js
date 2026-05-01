const loki = require('lokijs');

const db = new loki('facturas.db');
const facturas = db.addCollection('facturas');

function guardarFactura(datos) {
  return facturas.insert({ ...datos, fechaSubida: new Date().toISOString() });
}

function obtenerFacturas() {
  return facturas.find().map(({ ruc_emisor, ruc_factura, razon_social, fecha_emision, fecha_vencimiento, tipo_moneda, monto_neto, validacion, fechaSubida }) => ({
    ruc_emisor,
    ruc_factura,
    razon_social,
    fecha_emision,
    fecha_vencimiento,
    tipo_moneda,
    monto_neto,
    validacion,
    fechaSubida,
  }));
}

module.exports = { guardarFactura, obtenerFacturas };
