const loki = require('lokijs');

const db = new loki('facturas.db');
const facturas = db.addCollection('facturas');

function guardarFactura(datos) {
  return facturas.insert({ ...datos, fechaSubida: new Date().toISOString() });
}

function obtenerFacturas() {
  return facturas.find().map(({ id, monto, emisor, validacion, fechaSubida }) => ({
    id,
    monto,
    emisor,
    validacion,
    fechaSubida,
  }));
}

module.exports = { guardarFactura, obtenerFacturas };
