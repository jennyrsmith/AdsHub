# AdsHub UI

## Wiring (Batch 2)
- Env: `.env.local` with `VITE_API_BASE`, `VITE_SYNC_API_KEY`
- Dev:

```
npm start      # backend on :3000
npm run ui     # frontend on :5173/5174
```

- Endpoints used: `/api/last-sync`, `/api/sync`, `/api/summary`, `/api/rows`, `/api/export.csv`
- Filters persist in URL; CSV export mirrors current filters.
