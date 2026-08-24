# Gestionale Ordini

Gestionale minimale per la raccolta e il tracciamento degli ordini di una piccola attività.
Backend REST in Node.js/Express, frontend in HTML/CSS/JavaScript senza framework, persistenza su file JSON.

## Funzionalità

- Inserimento ordini con cliente, email, note e righe ordine (prodotto, quantità, prezzo)
- Calcolo automatico del totale per ordine
- Stati di avanzamento: `nuovo` → `in lavorazione` → `spedito` → `completato` (oppure `annullato`)
- Ricerca per cliente, prodotto o numero ordine e filtro per stato
- Riepilogo con numero ordini, valore complessivo e ordini da lavorare

## Requisiti

- Node.js 18 o superiore

## Avvio

```bash
npm install
npm start
```

L'applicazione è disponibile su `http://localhost:3000`.
Per lo sviluppo con ricaricamento automatico:

```bash
npm run dev
```

## API

| Metodo   | Endpoint                | Descrizione                                  |
| -------- | ----------------------- | -------------------------------------------- |
| `GET`    | `/api/orders`           | Elenco ordini (`?status=`, `?search=`)       |
| `GET`    | `/api/orders/:id`       | Dettaglio di un ordine                       |
| `GET`    | `/api/orders/stats`     | Riepilogo: conteggi per stato e valore totale |
| `GET`    | `/api/orders/statuses`  | Elenco degli stati disponibili               |
| `POST`   | `/api/orders`           | Crea un nuovo ordine                         |
| `PATCH`  | `/api/orders/:id`       | Aggiorna stato, dati cliente o righe ordine  |
| `DELETE` | `/api/orders/:id`       | Elimina un ordine                            |

### Esempio: creazione ordine

```bash
curl -X POST http://localhost:3000/api/orders \
  -H "Content-Type: application/json" \
  -d '{
    "customer": "Mario Rossi",
    "email": "mario@esempio.it",
    "note": "Consegna entro venerdì",
    "items": [
      { "product": "Caffè 1kg", "quantity": 2, "price": 18.50 },
      { "product": "Cialde box", "quantity": 1, "price": 24.00 }
    ]
  }'
```

Risposta:

```json
{
  "id": 1,
  "customer": "Mario Rossi",
  "email": "mario@esempio.it",
  "note": "Consegna entro venerdì",
  "items": [
    { "product": "Caffè 1kg", "quantity": 2, "price": 18.5 },
    { "product": "Cialde box", "quantity": 1, "price": 24 }
  ],
  "total": 61,
  "status": "nuovo",
  "createdAt": "2026-08-24T10:00:00.000Z",
  "updatedAt": "2026-08-24T10:00:00.000Z"
}
```

### Esempio: avanzamento di stato

```bash
curl -X PATCH http://localhost:3000/api/orders/1 \
  -H "Content-Type: application/json" \
  -d '{ "status": "spedito" }'
```

## Struttura del progetto

```
src/
  server.js          avvio del server e middleware
  db.js              persistenza su file JSON e logica dei totali
  routes/orders.js   endpoint REST e validazione input
public/
  index.html         interfaccia web
  style.css          stili
  app.js             logica lato client
data/
  orders.json        archivio ordini (generato al primo salvataggio)
```

## Note

I dati sono salvati in `data/orders.json`, escluso dal versionamento.
Per un utilizzo con più utenti in concorrenza è consigliabile sostituire la persistenza
su file con un database (SQLite o PostgreSQL) mantenendo la stessa interfaccia di `src/db.js`.

## Licenza

MIT
