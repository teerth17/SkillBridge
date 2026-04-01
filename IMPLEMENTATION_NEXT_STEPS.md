# SkillBridge Full Implementation – Sprint 1 Starter

This package is a **drop-in upgrade** of your current demo to start the “full implementation”.

Sprint 1 goals:
- Keep the system runnable end-to-end
- Replace **in-memory users** with a real **PostgreSQL** database
- Establish a clean compose + env pattern that we’ll reuse for all services

## What’s included

### Backend
- `backend/docker-compose.full.yaml`
  - Adds a Postgres container
  - Wires `DATABASE_URL` + `JWT_SECRET` into services
- `backend/db/init.sql`
  - Creates the `users` table (Auth base schema)
- `backend/services/user-service`
  - Migrated from in-memory array to Postgres via the `pg` driver

## How to run (Sprint 1)

From the `backend/` folder:

```bash
docker compose -f docker-compose.full.yaml up --build
```

Then test:
- `POST http://localhost:4000/users/signup`
- `POST http://localhost:4000/users/signin`
- `GET  http://localhost:4000/users/profile` (Bearer token)

## Next Sprint plan (Sprint 2)

1) Add tables: `user_skills`, `badges`, `user_badges`
2) Create **Profile Service (4001)** and move profile/skills responsibilities there
3) Add `Connection` + `Session` tables and migrate `session-service` from in-memory to Postgres
4) Split Socket.IO chat out of `session-service` into a new **Communication Service (4004)**
