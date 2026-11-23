# Fill in the blanks: Property Manager

The same project you already ran, with the key parts removed. Every missing piece has a `TODO` comment with hints. The tests already exist and tell you when you got it right.

## Rules
1. **Type everything yourself.** No copy and paste from the original project.
2. **Use the hints and the docs links first.** Only look at your original `jll-practice` project when you're stuck for more than 10 minutes, then close it and keep going.
3. **Run the tests after each exercise.** Red means not yet, green means done.

## Setup (once)

Backend terminal:
```
cd backend
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
python manage.py migrate
python manage.py seed
```

Frontend terminal:
```
cd frontend
npm install
```

## Part 1: Backend (exercises 1 to 3)

| # | File | What you build |
|---|---|---|
| 1 | `backend/properties/serializers.py` | Serializer + validation |
| 2 | `backend/properties/views.py` | ViewSet (the whole CRUD) |
| 3 | `backend/properties/urls.py` | Router |

Check your work:
```
pytest -v
```
Goal: **6 passed**. Then run `python manage.py runserver` and open http://127.0.0.1:8000/api/properties/

## Part 2: Frontend (exercises 4 and 5)

| # | File | What you build |
|---|---|---|
| 4 | `frontend/src/api.ts` | `fetchProperties` and `createProperty` |
| 5 | `frontend/src/hooks.ts` | `useProperties`, `useCreateProperty`, `useDeleteProperty` |

Note: until you finish exercise 5, VS Code will show red errors in `App.tsx`. That's expected, they go away once your hooks return the right thing.

Check your work:
```
npm test
```
Goal: **3 passed**. Then run `npm run dev` (with the backend running) and open http://localhost:5173

## After you finish
Explain each exercise out loud in English, as if an interviewer asked "walk me through this code". For example:

> "The serializer converts model instances to JSON and validates incoming data. I added a field level validator so the size must be greater than zero, which returns a 400 if it fails."

## Next rounds
* **Round 2:** delete your solutions and do it again, faster.
* **Round 3:** also delete `models.py` (keep the field list in mind) and `PropertyForm.tsx`.
* **Round 4:** start a brand new project from zero with only the docs.
