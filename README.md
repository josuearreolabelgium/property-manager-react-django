Property Manager

A full stack CRUD application for managing commercial real estate listings. The frontend is built with React, TypeScript and TanStack Query, and the backend is a Django REST Framework API. Both sides are covered by automated tests.

Property Manager screenshot

Features

Add properties from the "+ New property" form (or POST /api/properties/), or load them in bulk from a CSV file (backend/data/edificios_renta.csv)
Search by name, address, city or postal code; filter by city, type and rent/sale
Card view with a map of the selected building, or a table view
Sort by date, size or name on the server; sort table columns on the client
Show rents in MXN, EUR or USD with daily exchange rates
Toggle a property's status between available and leased with one click, and delete properties
Loading, empty and error states in the UI
Validation on the backend and in the CSV import (for example, size must be greater than zero)

Tech stack

Layer	    Technologies
Frontend	React 19, TypeScript, Vite, TanStack Query, TanStack Table
Backend	    Python, Django, Django REST Framework, django-filter
Database	SQLite (development)
Testing	    pytest + pytest-django (API), Vitest + React Testing Library + MSW (UI)

How it works

Backend. A single ModelViewSet exposes the create, read, update and delete API (PUT is disabled; use PATCH), registered with a DRF router. The serializer converts models to JSON and validates incoming data, combining the field rules generated from the model with a custom validator for business rules. Pagination and filtering are configured globally in the DRF settings.

Frontend. All HTTP calls live in src/api.ts, and all server state is managed with TanStack Query hooks in src/hooks.ts:

    useQuery reads the list. The city and page are part of the query key, so each filter combination is cached separately and refetched automatically when a filter changes.

    useMutation handles update and delete. On success, each mutation invalidates the ["properties"] queries so the table stays in sync with the server.

    keepPreviousData keeps the current page visible while the next one loads.

API
Method	    Endpoint	            Description
GET	        /api/properties/	    List properties (?page=, ?city=, ?status=, ?property_type=, ?operation=, ?search=, ?ordering=)
GET	        /api/properties/cities/	Distinct cities
POST	    /api/properties/	    Create a property (JSON body; name must be unique)
GET	        /api/properties/<id>/	Retrieve a property
PATCH	    /api/properties/<id>/	Partially update a property
DELETE	    /api/properties/<id>/	Delete a property

Running locally

Requirements: Python 3.11+ and Node.js 20+.

Backend (http://localhost:8000)

bash
cd backend
python -m venv venv
venv\Scripts\activate        # Windows
# source venv/bin/activate   # macOS / Linux
pip install -r requirements.txt
python manage.py migrate
python manage.py import_properties data/edificios_renta.csv   # loads the buildings (re-running updates them, no duplicates)
python manage.py seed        # optional: adds 5 sample properties, keeps everything else
python manage.py runserver

Frontend (http://localhost:5173)

bash
cd frontend
npm install
npm run dev

Running the tests

bash
# Backend: API, validation, filtering, sorting and the CSV import
cd backend
pytest -v

# Frontend: rendering, filters, search, maps and error handling
cd frontend
npm test

Project structure

backend/
  core/                  Django settings and root URLs
  properties/
    models.py            Property model
    serializers.py       JSON conversion and validation
    views.py             ModelViewSet (create, read, update, delete)
    urls.py              DRF router
    tests/               pytest API tests
frontend/
  src/
    api.ts               HTTP calls
    hooks.ts             TanStack Query hooks
    App.tsx              Page layout, filters and pagination
    components/          Card, table, map pop-up and modal components
    App.test.tsx         UI tests with MSW

Next steps
    Optimistic updates for status changes
    Edit form for all fields
    Authentication and per user permissions
    Filters stored in the URL with TanStack Router
    Docker setup and CI pipeline