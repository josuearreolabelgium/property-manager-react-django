Property Manager

A full stack CRUD application for managing commercial real estate listings. The frontend is built with React, TypeScript and TanStack Query, and the backend is a Django REST Framework API. Both sides are covered by automated tests.

Property Manager screenshot

Features

List properties with server side pagination
Filter by city
Create, update and delete properties
Toggle a property's status between available and leased with one click
Sort table columns on the client
Loading, empty and error states in the UI
Input validation on the backend (for example, size must be greater than zero)

Tech stack

Layer	    Technologies
Frontend	React 19, TypeScript, Vite, TanStack Query, TanStack Table
Backend	    Python, Django, Django REST Framework, django-filter
Database	SQLite (development)
Testing	    pytest + pytest-django (API), Vitest + React Testing Library + MSW (UI)

How it works

Backend. A single ModelViewSet exposes the full CRUD API, registered with a DRF router. The serializer converts models to JSON and validates incoming data, combining the field rules generated from the model with a custom validator for business rules. Pagination and filtering are configured globally in the DRF settings.

Frontend. All HTTP calls live in src/api.ts, and all server state is managed with TanStack Query hooks in src/hooks.ts:

    useQuery reads the list. The city and page are part of the query key, so each filter combination is cached separately and refetched automatically when a filter changes.

    useMutation handles create, update and delete. On success, each mutation invalidates the ["properties"] queries so the table stays in sync with the server.

    keepPreviousData keeps the current page visible while the next one loads.

API
Method	    Endpoint	            Description
GET	        /api/properties/	    List properties (?page=, ?city=, ?status=)
POST	    /api/properties/	    Create a property
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
python manage.py seed        # loads sample properties
python manage.py runserver

Frontend (http://localhost:5173)

bash
cd frontend
npm install
npm run dev

Running the tests

bash
# Backend: CRUD, validation and filtering
cd backend
pytest -v

# Frontend: rendering, error handling and creating a property
cd frontend
npm test

Project structure

backend/
  core/                  Django settings and root URLs
  properties/
    models.py            Property model
    serializers.py       JSON conversion and validation
    views.py             ModelViewSet (CRUD)
    urls.py              DRF router
    tests/               pytest API tests
frontend/
  src/
    api.ts               HTTP calls
    hooks.ts             TanStack Query hooks
    App.tsx              Page layout, filters and pagination
    components/          Form and table components
    App.test.tsx         UI tests with MSW

Next steps
    Optimistic updates for status changes
    Edit form for all fields
    Authentication and per user permissions
    Filters stored in the URL with TanStack Router
    Docker setup and CI pipeline