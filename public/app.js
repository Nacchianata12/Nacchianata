const api = {
  async get(path) {
    const res = await fetch(path);
    if (!res.ok) throw new Error((await res.json()).error || 'Errore di rete');
    return res.json();
  },
  async send(path, method, body) {
    const res = await fetch(path, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: body ? JSON.stringify(body) : undefined
    });
    if (res.status === 204) return null;
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Errore di rete');
    return data;
  }
};

const euro = (n) => '€ ' + n.toFixed(2);

const itemsEl = document.getElementById('items');
const formEl = document.getElementById('order-form');
const errorEl = document.getElementById('form-error');
const totalEl = document.getElementById('form-total');
const ordersEl = document.getElementById('orders');
const statsEl = document.getElementById('stats');
const statusFilter = document.getElementById('status-filter');
const searchInput = document.getElementById('search');

let statuses = [];

function addItemRow() {
  const row = document.createElement('div');
  row.className = 'item-row';
  row.innerHTML = `
    <input class="product" placeholder="Prodotto" required />
    <input class="quantity" type="number" min="1" step="1" value="1" required />
    <input class="price" type="number" min="0" step="0.01" placeholder="Prezzo" required />
    <button type="button" class="icon" title="Rimuovi riga">&times;</button>
  `;
  row.querySelector('button').addEventListener('click', () => {
    row.remove();
    if (!itemsEl.children.length) addItemRow();
    refreshFormTotal();
  });
  row.addEventListener('input', refreshFormTotal);
  itemsEl.appendChild(row);
}

function readItems() {
  return [...itemsEl.querySelectorAll('.item-row')].map((row) => ({
    product: row.querySelector('.product').value.trim(),
    quantity: Number(row.querySelector('.quantity').value),
    price: Number(row.querySelector('.price').value)
  }));
}

function refreshFormTotal() {
  const total = readItems().reduce(
    (sum, i) => sum + (Number.isFinite(i.quantity) ? i.quantity : 0) * (Number.isFinite(i.price) ? i.price : 0),
    0
  );
  totalEl.textContent = 'Totale: ' + euro(total);
}

formEl.addEventListener('submit', async (event) => {
  event.preventDefault();
  errorEl.textContent = '';
  const data = new FormData(formEl);
  try {
    await api.send('/api/orders', 'POST', {
      customer: data.get('customer'),
      email: data.get('email'),
      note: data.get('note'),
      items: readItems()
    });
    formEl.reset();
    itemsEl.innerHTML = '';
    addItemRow();
    refreshFormTotal();
    await refresh();
  } catch (err) {
    errorEl.textContent = err.message;
  }
});

document.getElementById('add-item').addEventListener('click', addItemRow);

function renderStats(data) {
  const cards = [
    { label: 'Ordini totali', value: data.count },
    { label: 'Valore ordini', value: euro(data.revenue) },
    { label: 'Da lavorare', value: data.byStatus['nuovo'] + data.byStatus['in lavorazione'] },
    { label: 'Completati', value: data.byStatus['completato'] }
  ];
  statsEl.innerHTML = cards
    .map((c) => `<div class="stat"><div class="value">${c.value}</div><div class="label">${c.label}</div></div>`)
    .join('');
}

function renderOrders(orders) {
  if (!orders.length) {
    ordersEl.innerHTML = '<p class="empty">Nessun ordine da mostrare.</p>';
    return;
  }
  ordersEl.innerHTML = orders
    .map(
      (o) => `
      <article class="order" data-id="${o.id}">
        <div class="order-top">
          <div>
            <div class="order-title">#${o.id} — ${escapeHtml(o.customer)}</div>
            <div class="order-meta">
              ${new Date(o.createdAt).toLocaleString('it-IT')}
              ${o.email ? ' · ' + escapeHtml(o.email) : ''}
            </div>
          </div>
          <div class="order-actions">
            <span class="badge" data-status="${o.status}">${o.status}</span>
            <strong>${euro(o.total)}</strong>
            <select class="status-select">
              ${statuses
                .map((s) => `<option value="${s}" ${s === o.status ? 'selected' : ''}>${s}</option>`)
                .join('')}
            </select>
            <button type="button" class="icon delete" title="Elimina ordine">&times;</button>
          </div>
        </div>
        <ul>
          ${o.items
            .map((i) => `<li>${escapeHtml(i.product)} — ${i.quantity} × ${euro(i.price)}</li>`)
            .join('')}
        </ul>
        ${o.note ? `<p class="order-meta">Note: ${escapeHtml(o.note)}</p>` : ''}
      </article>`
    )
    .join('');

  ordersEl.querySelectorAll('.status-select').forEach((select) => {
    select.addEventListener('change', async (event) => {
      const id = event.target.closest('.order').dataset.id;
      await api.send(`/api/orders/${id}`, 'PATCH', { status: event.target.value });
      await refresh();
    });
  });

  ordersEl.querySelectorAll('.delete').forEach((button) => {
    button.addEventListener('click', async (event) => {
      const id = event.target.closest('.order').dataset.id;
      if (!confirm(`Eliminare l'ordine #${id}?`)) return;
      await api.send(`/api/orders/${id}`, 'DELETE');
      await refresh();
    });
  });
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  })[c]);
}

async function refresh() {
  const params = new URLSearchParams();
  if (statusFilter.value) params.set('status', statusFilter.value);
  if (searchInput.value.trim()) params.set('search', searchInput.value.trim());
  const [orders, data] = await Promise.all([
    api.get('/api/orders?' + params.toString()),
    api.get('/api/orders/stats')
  ]);
  renderOrders(orders);
  renderStats(data);
}

async function init() {
  statuses = await api.get('/api/orders/statuses');
  statusFilter.innerHTML =
    '<option value="">Tutti gli stati</option>' +
    statuses.map((s) => `<option value="${s}">${s}</option>`).join('');
  statusFilter.addEventListener('change', refresh);
  searchInput.addEventListener('input', debounce(refresh, 250));
  addItemRow();
  refreshFormTotal();
  await refresh();
}

function debounce(fn, ms) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), ms);
  };
}

init();
