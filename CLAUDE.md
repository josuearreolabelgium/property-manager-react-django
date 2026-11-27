# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

Property Manager: a Django REST Framework API (`backend/`) plus a React 19 + TypeScript + Vite single-page app (`frontend/`) for commercial real estate listings (Mexican buildings for rent or sale).

## Commands

Backend (run from `backend/`, with the venv in `backend/venv` activated: `venv\Scripts\activate` on Windows):

```bash
python manage.py migrate
python manage.py import_properties data/edificios_renta.csv   # bulk load / update buildings from CSV (idempotent, matched by name)
python manage.py seed                                         # optional: upserts 5 sample rows, never deletes
python manage.py runserver                                    # http://localhost:8000
pytest -v                                                     # all API tests (pytest.ini sets DJANGO_SETTINGS_MODULE)
pytest properties/tests/test_api.py::test_name                # single test
pytest -k import                                              # tests matching a keyword
```

Frontend (run from `frontend/`):

```bash
npm run dev                       # http://localhost:5173
npm test                          # vitest run (jsdom + MSW)
npx vitest run -t "part of name"  # single test by name
npm run lint                      # oxlint
npm run build                     # tsc -b && vite build (also the type check)
```

## Architecture

### Backend (`backend/properties/`)

- One model, `Property`. `name` is unique. `monthly_rent` is nullable: null means "price on request" (shown as "a consultar"). Despite its name, it also holds the sale price when `operation == "sale"`. `size_max_m2` is optional; when present, the size is a range `size_m2`–`size_max_m2`.
- `PropertyViewSet` (a ModelViewSet) restricts `http_method_names`, so **PUT returns 405**. Updates are PATCH only.
- The view sets its own `filter_backends`, which override the global DRF defaults in `core/settings.py`. Among them, `StableOrderingFilter` adds an `id` tiebreak in the same direction as the main sort, so pagination stays stable when values tie. Keep that tiebreak if you change ordering.
- There is also a `cities` list action at `/api/properties/cities/`, which drives the city dropdown.
- Pagination is global: `PageNumberPagination` with `PAGE_SIZE` 10. A page past the end returns 404, and the frontend relies on that (see below).
- `PropertySerializer` holds all validation, including the cross-field rule `size_max_m2 >= size_m2`. On PATCH that rule falls back to the instance's values, and the error is reported under whichever field was sent.
- `management/commands/import_properties.py` maps the Spanish CSV columns (`nombre, tipo, operacion, direccion, ciudad, codigo_postal, superficie_min_m2, superficie_max_m2, precio`) onto model fields. It validates every row through `PropertySerializer` inside one `transaction.atomic`, so one bad row aborts the whole import with a `CommandError` that names the CSV line. Prices look like `$123,456 MXN`, or `A consultar (USD)` for on request. New CSV formats need parsing changes there, not in the model.
- Migration `0003` renames duplicate names before adding the unique constraint. Tests cover it.

### Frontend (`frontend/src/`)

- `api.ts` holds every HTTP call and the shared types:
  - `Property`, `NewProperty`, `PropertyChanges`, and the label maps.
  - `API_URL` is hard-coded to `http://localhost:8000/api/properties/`. CORS allows only `http://localhost:5173`.
  - Failed responses throw `ApiError`, which carries `status` and `body`. `fieldErrors()` turns a DRF 400 body into `{field: firstMessage}`; `PropertyForm` uses it to show errors next to each input.
- `hooks.ts` wraps the API in TanStack Query:
  - The list query key is `["properties", filters]` and uses `keepPreviousData`.
  - Every mutation (create, update, delete) invalidates the whole `["properties"]` prefix, which also refreshes the cities list.
- `App.tsx` owns all UI state:
  - Filters: city, type, operation, ordering, page, and search (debounced 300 ms).
  - Display state: currency, view mode (cards or table), and which modals are open.
  - Any filter change resets to page 1.
  - If the current page 404s (for example, after deleting the last item on the last page), it steps back a page by calling `setPage` during render, not in an effect. This is deliberate, because an effect version triggered a lint warning.
- Currency conversion uses daily rates from frankfurter.dev (`RATES_URL`, base MXN) and runs on the client in `convert()` / `format.ts`. If the rates fail to load, prices stay in their stored currency, and the table's Price column sorts those rows last.
- Maps are Google Maps embed iframes (`mapUrl` in `format.ts`); there is no API key. `Modal.tsx` wraps a native `<dialog>` and handles focus return, Escape, and backdrop clicks. A click only closes the dialog when the press also started on the backdrop, so dragging out of the dialog doesn't close it.

### Tests

- Backend: `properties/tests/test_api.py` uses DRF's APIClient through pytest-django. It covers the API, validation, filtering, ordering stability, the CSV import, `seed`, and the migration.
- Frontend: `App.test.tsx` renders the whole app against MSW handlers in `src/test/server.ts`, which contain the mock properties and a mock rates endpoint. `setup.ts` uses `onUnhandledRequest: "error"`, so any new request the app makes needs an MSW handler. jsdom has no `<dialog>.showModal()`/`close()`, so `setup.ts` polyfills both; a modal behaving differently in tests than in the browser may come from that polyfill. When a label appears more than once (for example "USD" in both the filter and the form), scope queries with `within(...)`.

## Notes

- UI text is in English, while the data (cities, addresses, CSV headers) is in Spanish.
- `backend/db.sqlite3` is gitignored. A fresh clone needs `migrate` + `import_properties` before the UI shows data.
