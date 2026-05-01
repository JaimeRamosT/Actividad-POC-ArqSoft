const express = require('express');
const cors = require('cors');
const path = require('path');
const facturaRoutes = require('./routes/factura');

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'frontend')));

app.use('/factura', facturaRoutes);

app.listen(PORT, () => {
  console.log(`\n✓ Servidor corriendo en http://localhost:${PORT}\n`);
});
