import express from 'express';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import ordersRouter from './routes/orders.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(join(__dirname, '..', 'public')));

app.use('/api/orders', ordersRouter);

app.get('/health', (req, res) => res.json({ status: 'ok' }));

app.use((req, res) => res.status(404).json({ error: 'Risorsa non trovata.' }));

app.listen(PORT, () => {
  console.log(`Gestionale ordini in ascolto su http://localhost:${PORT}`);
});
