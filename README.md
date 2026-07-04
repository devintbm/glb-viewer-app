# GLB Model Viewer

A full-stack web app for displaying and managing 3D models in GLB format.

- **Frontend**: React (Vite) + [react-three-fiber](https://docs.pmnd.rs/react-three-fiber) / three.js for rendering, React Router for pages.
- **Backend**: Node.js + Express REST API.
- **Database**: SQLite (via `better-sqlite3`) for model metadata.
- **File storage**: GLB binaries are stored on disk under `server/uploads/`, referenced by the database. This is standard practice — large binary blobs are kept out of the relational database itself (keeps it fast and easy to back up) while the DB tracks name, description, size, tags, and timestamps. In production you'd swap the local disk for S3/Cloud Storage without touching the rest of the app.

## Project structure

```
glb-viewer-app/
├── server/                 # Express API + SQLite DB
│   ├── index.js            # App entry point
│   ├── db.js                # SQLite schema/connection
│   ├── routes/models.js     # CRUD + file upload/streaming routes
│   └── uploads/              # Uploaded .glb files live here
└── frontend/                # React app (Vite)
    └── src/
        ├── components/
        │   ├── ModelViewer.jsx     # <canvas> 3D viewer (orbit controls, lighting)
        │   └── ModelGallery.jsx    # Grid of model cards
        ├── pages/
        │   ├── Home.jsx            # Public library/gallery
        │   ├── ModelDetail.jsx     # Full 3D viewer for one model
        │   └── Admin.jsx           # Upload/edit/delete dashboard
        ├── api.js            # Fetch wrapper for the backend
        └── App.jsx           # Routes + nav
```

## Getting started

Requires Node.js 18+.

### 1. Start the backend

```bash
cd server
npm install
npm start
```

This starts the API on `http://localhost:4000`, creates `models.db` (SQLite) on first run, and serves uploaded files from `server/uploads/`.

### 2. Start the frontend

In a second terminal:

```bash
cd frontend
npm install
npm run dev
```

This starts the Vite dev server on `http://localhost:5173` and proxies `/api` requests to the backend, so the two run independently. Open that URL in your browser.

### 3. Use it

- Go to **Admin** in the nav bar to upload your first `.glb` file (drag & drop or click to browse). Fill in a name, optional description, and optional tags.
- Go to **Library** to see the gallery of uploaded models — click any card to open the full 3D viewer (drag to rotate, scroll to zoom, right-click to pan).
- From the Admin page you can also preview, rename/edit the description of, or delete any model.

## API reference

| Method | Route                  | Description                                  |
|--------|-------------------------|-----------------------------------------------|
| GET    | `/api/models`           | List all models (metadata only)               |
| GET    | `/api/models/:id`       | Get metadata for one model                    |
| GET    | `/api/models/:id/file`  | Stream the raw `.glb` binary                  |
| POST   | `/api/models`           | Upload a model (multipart: `file`, `name`, `description`, `tags`) |
| PUT    | `/api/models/:id`       | Update name/description/tags                  |
| DELETE | `/api/models/:id`       | Delete a model and its file                   |

## Notes on scaling this up

- **Auth**: The admin dashboard currently has no login — anyone who can reach `/admin` can upload/delete. Add an auth middleware (e.g. a simple JWT/session check, or a proper provider like Auth0/Clerk) in front of the `POST`/`PUT`/`DELETE` routes before deploying publicly.
- **File size**: The upload limit is set to 200MB in `server/routes/models.js` (`multer` limits) — adjust to fit your models.
- **Storage**: For multi-server or serverless deployments, swap the disk storage in `models.js` for an S3-compatible bucket (the DB schema already only stores a filename reference, so this is a localized change).
- **Database**: SQLite is great for a single-server app or prototype. For higher concurrency/multi-region needs, swapping `better-sqlite3` for Postgres (e.g. via `pg` or an ORM like Prisma) is a straightforward migration since the schema is simple.
- **Thumbnails**: Currently the gallery shows a placeholder icon. You could generate real thumbnails by rendering each model to an offscreen canvas on upload and storing the resulting image (as a file, same pattern as the GLB itself).
