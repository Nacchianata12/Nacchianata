import { Router } from 'express';
import {
  STATUSES,
  listOrders,
  getOrder,
  createOrder,
  updateOrder,
  deleteOrder,
  stats
} from '../db.js';

const router = Router();

function validateItems(items) {
  if (!Array.isArray(items) || items.length === 0) {
    return 'Serve almeno una riga ordine.';
  }
  for (const item of items) {
    if (!item.product || typeof item.product !== 'string') {
      return 'Ogni riga deve avere un prodotto.';
    }
    if (!Number.isFinite(item.quantity) || item.quantity <= 0) {
      return `Quantita' non valida per "${item.product}".`;
    }
    if (!Number.isFinite(item.price) || item.price < 0) {
      return `Prezzo non valido per "${item.product}".`;
    }
  }
  return null;
}

router.get('/stats', (req, res) => {
  res.json(stats());
});

router.get('/statuses', (req, res) => {
  res.json(STATUSES);
});

router.get('/', (req, res) => {
  const { status, search } = req.query;
  if (status && !STATUSES.includes(status)) {
    return res.status(400).json({ error: 'Stato non valido.' });
  }
  res.json(listOrders({ status, search }));
});

router.get('/:id', (req, res) => {
  const order = getOrder(req.params.id);
  if (!order) return res.status(404).json({ error: 'Ordine non trovato.' });
  res.json(order);
});

router.post('/', (req, res) => {
  const { customer, email, note, items } = req.body || {};
  if (!customer || typeof customer !== 'string') {
    return res.status(400).json({ error: 'Il nome cliente e\' obbligatorio.' });
  }
  const itemsError = validateItems(items);
  if (itemsError) return res.status(400).json({ error: itemsError });

  const order = createOrder({ customer: customer.trim(), email, note, items });
  res.status(201).json(order);
});

router.patch('/:id', (req, res) => {
  const { status, items, customer, email, note } = req.body || {};
  if (status !== undefined && !STATUSES.includes(status)) {
    return res.status(400).json({ error: 'Stato non valido.' });
  }
  if (items !== undefined) {
    const itemsError = validateItems(items);
    if (itemsError) return res.status(400).json({ error: itemsError });
  }
  const order = updateOrder(req.params.id, { status, items, customer, email, note });
  if (!order) return res.status(404).json({ error: 'Ordine non trovato.' });
  res.json(order);
});

router.delete('/:id', (req, res) => {
  if (!deleteOrder(req.params.id)) {
    return res.status(404).json({ error: 'Ordine non trovato.' });
  }
  res.status(204).end();
});

export default router;
