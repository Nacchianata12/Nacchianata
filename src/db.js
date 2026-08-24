import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = join(__dirname, '..', 'data');
const DB_FILE = join(DATA_DIR, 'orders.json');

/**
 * Persistenza su file JSON: nessun database esterno da installare,
 * sufficiente per il volume di ordini di una piccola attivita'.
 */
function load() {
  if (!existsSync(DB_FILE)) return { orders: [], nextId: 1 };
  try {
    return JSON.parse(readFileSync(DB_FILE, 'utf8'));
  } catch {
    // File corrotto o troncato: si riparte da vuoto invece di bloccare il server.
    return { orders: [], nextId: 1 };
  }
}

function save(state) {
  if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });
  writeFileSync(DB_FILE, JSON.stringify(state, null, 2), 'utf8');
}

let state = load();

export const STATUSES = ['nuovo', 'in lavorazione', 'spedito', 'completato', 'annullato'];

export function listOrders({ status, search } = {}) {
  let result = [...state.orders];
  if (status) result = result.filter((o) => o.status === status);
  if (search) {
    const q = search.toLowerCase();
    result = result.filter(
      (o) =>
        o.customer.toLowerCase().includes(q) ||
        String(o.id).includes(q) ||
        o.items.some((i) => i.product.toLowerCase().includes(q))
    );
  }
  return result.sort((a, b) => b.id - a.id);
}

export function getOrder(id) {
  return state.orders.find((o) => o.id === Number(id));
}

export function createOrder({ customer, email, note, items }) {
  const order = {
    id: state.nextId++,
    customer,
    email: email || '',
    note: note || '',
    items,
    total: computeTotal(items),
    status: 'nuovo',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  state.orders.push(order);
  save(state);
  return order;
}

export function updateOrder(id, patch) {
  const order = getOrder(id);
  if (!order) return null;
  if (patch.customer !== undefined) order.customer = patch.customer;
  if (patch.email !== undefined) order.email = patch.email;
  if (patch.note !== undefined) order.note = patch.note;
  if (patch.status !== undefined) order.status = patch.status;
  if (patch.items !== undefined) {
    order.items = patch.items;
    order.total = computeTotal(patch.items);
  }
  order.updatedAt = new Date().toISOString();
  save(state);
  return order;
}

export function deleteOrder(id) {
  const index = state.orders.findIndex((o) => o.id === Number(id));
  if (index === -1) return false;
  state.orders.splice(index, 1);
  save(state);
  return true;
}

export function stats() {
  const byStatus = Object.fromEntries(STATUSES.map((s) => [s, 0]));
  let revenue = 0;
  for (const order of state.orders) {
    byStatus[order.status] = (byStatus[order.status] || 0) + 1;
    if (order.status !== 'annullato') revenue += order.total;
  }
  return { count: state.orders.length, revenue: round2(revenue), byStatus };
}

export function computeTotal(items) {
  return round2(items.reduce((sum, i) => sum + i.quantity * i.price, 0));
}

function round2(n) {
  return Math.round(n * 100) / 100;
}
