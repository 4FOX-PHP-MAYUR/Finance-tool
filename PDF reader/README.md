# Invoice PDF Extractor (Full Stack)

This project contains:

- `backend`: Node.js + Express API to upload and parse invoice PDFs.
- `frontend`: React + Vite app with Tailwind CSS UI for file upload and extracted data display.

## Features

- Upload invoice PDFs using `multer`
- Parse PDF text with `pdf-parse`
- Extract:
  - GST Number (Indian GST regex)
  - Client Name (`Client Name: ...`)
  - Scope of Work (`Scope of Work: ...`)
- Handles missing values with `Not Found` in UI
- Drag-and-drop upload + selected filename preview
- Loading and error states

## Folder Structure

```txt
backend/
  .env.example
  src/
    extractors/
      invoiceExtractor.js
    server.js
deploy/
  nginx.example.conf
frontend/
  .env.example
  src/
    App.jsx
    index.css
ecosystem.config.cjs
README.md
```

## Setup and Run

### 1) Backend

```bash
cd backend
npm install
npm run dev
```

Backend runs on `http://117.254.196.100:6000`.

### 2) Frontend

Open another terminal:

```bash
cd frontend
npm install
npm run dev
```

Frontend runs on `http://117.254.196.100:5174`.

## Deploy on server (`117.254.196.100`)

Ports: **API `6000`**, **UI `5174`** (or **port 80** with Nginx below).

### Environment

- **Backend** — copy `backend/.env.example` to `backend/.env` if you use a process manager; defaults are `PORT=6000`, `HOST=0.0.0.0` (listen on all interfaces).
- **Frontend** — `frontend/.env` / `frontend/.env.production` should set `VITE_API_BASE_URL=http://117.254.196.100:6000` when the browser talks to the API on that host. If you put the app behind Nginx on one hostname and proxy `/upload` to the API, **remove** `VITE_API_BASE_URL` and run `npm run build` again so the app uses relative `/upload`.

### Option A — PM2 (backend + Vite preview)

From the project root (same folder as `ecosystem.config.cjs`):

```bash
cd backend && npm ci && cd ..
cd frontend && npm ci && npm run build && cd ..
pm2 start ecosystem.config.cjs
pm2 save
pm2 startup
```

- UI: `http://117.254.196.100:5174`
- API: `http://117.254.196.100:6000`
- Check API: `curl http://127.0.0.1:6000/health`

### Option B — Nginx (recommended for production)

Build the frontend, then point Nginx at `frontend/dist` and proxy `/upload` and `/health` to `127.0.0.1:6000`. See `deploy/nginx.example.conf`. Run the backend with PM2 or `node src/server.js` on port 6000.

### Firewall (if using UFW)

```bash
sudo ufw allow 22
sudo ufw allow 80
sudo ufw allow 6000/tcp
sudo ufw allow 5174/tcp
sudo ufw enable
```

If you use only Nginx on port 80, you can omit opening `5174` and `6000` to the public internet.

## API

### `POST /upload`

- Content type: `multipart/form-data`
- File field name: `invoice`
- Accepted file type: PDF

Example success response:

```json
{
  "gstNumber": "27ABCDE1234F1Z5",
  "clientName": "XYZ Pvt Ltd",
  "scopeOfWork": "Website redesign and deployment support"
}
```

If a value is not found, backend returns `null` for that field.

## Notes

- Max upload size is 10MB.
- If non-PDF is uploaded, API returns an error message.
