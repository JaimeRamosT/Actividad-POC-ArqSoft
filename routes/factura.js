const express = require('express');
const multer = require('multer');
const { extraerDatosFactura } = require('../services/pdfService');
const { guardarFactura, obtenerFacturas } = require('../services/dbService');
const { validarEnSunat } = require('../services/sunatService');

// Node 18+ tiene fetch nativo; si fuera Node 16 se necesitaría node-fetch

const router = express.Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype !== 'application/pdf') {
      return cb(new Error('Solo se aceptan archivos PDF.'));
    }
    cb(null, true);
  },
});

router.post('/load', upload.single('pdf'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No se recibió ningún archivo PDF.' });
    }

    const datos = await extraerDatosFactura(req.file.buffer);

    const validateRes = await fetch('http://localhost:3000/factura/validate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ datos }),
    });
    const { estado, mensaje } = await validateRes.json();

    guardarFactura({ ...datos, validacion: estado });

    res.json({ datos, validacion: estado, mensaje });
  } catch (err) {
    const status = err.message.includes('Solo se aceptan') ? 400 : 500;
    res.status(status).json({ error: err.message });
  }
});

router.post('/validate', async (req, res) => {
  try {
    const { datos } = req.body;
    if (!datos) {
      return res.status(400).json({ error: 'Se requiere el campo "datos" en el body.' });
    }
    const resultado = await validarEnSunat(datos);
    res.json(resultado);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/list', (req, res) => {
  res.json(obtenerFacturas());
});

module.exports = router;
