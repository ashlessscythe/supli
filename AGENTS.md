# AGENTS.md

## Cursor Cloud specific instructions

Supli Mart is a single Next.js 14 (App Router) app backed by Prisma + PostgreSQL. Standard commands live in `README.md` and `package.json` scripts (`dev`, `lint`, `typecheck`, `test`, `db:seed`). Notes below cover only the non-obvious cloud gotchas.

### PostgreSQL: use the npm-provided embedded server (apt is blocked)

`apt-get`/`archive.ubuntu.com` is unreachable in this environment (connection reset), so you cannot `apt install postgresql`. Instead a real PostgreSQL server is provided via the `embedded-postgres` npm package installed under `~/pgtool` (outside the repo, so it is not affected by `git pull`). The binaries are at `~/pgtool/node_modules/@embedded-postgres/linux-x64/native/bin` (only `initdb`, `pg_ctl`, `postgres` — there is no `psql`; use a small Node `pg` script for SQL/admin, e.g. creating databases).

If `~/pgtool` or `~/pgdata` is missing (fresh VM without the snapshot), recreate them:

```bash
mkdir -p ~/pgtool && cd ~/pgtool && npm init -y && npm install embedded-postgres pg
PGBIN=~/pgtool/node_modules/@embedded-postgres/linux-x64/native/bin
echo postgres > /tmp/pgpw
$PGBIN/initdb -D ~/pgdata -U postgres --auth=trust --pwfile=/tmp/pgpw
```

Start the server (needed every session — the update script does NOT start services):

```bash
PGBIN=~/pgtool/node_modules/@embedded-postgres/linux-x64/native/bin
$PGBIN/pg_ctl -D ~/pgdata -l ~/pgdata/logfile -o "-p 5432" start
```

Create the two databases if they don't exist yet (no `psql`, so use Node):

```bash
cd ~/pgtool && node -e "const{Client}=require('pg');(async()=>{const c=new Client({host:'localhost',port:5432,user:'postgres',password:'postgres',database:'postgres'});await c.connect();for(const d of ['supli','supli_test']){const r=await c.query('SELECT 1 FROM pg_database WHERE datname=\$1',[d]);if(!r.rowCount)await c.query('CREATE DATABASE '+d);}await c.end();})()"
```

### .env (gitignored — recreate if missing)

The app needs `/workspace/.env` (not committed). Recreate with:

```
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/supli?sslmode=disable"
DATABASE_TEST_URL="postgresql://postgres:postgres@localhost:5432/supli_test?sslmode=disable"
NEXTAUTH_SECRET="local-development-secret-minimum-32-characters-long"
NEXTAUTH_URL="http://localhost:3000"
```

### Bringing the app up

After Postgres is running and `.env` exists: `npx prisma migrate deploy` then `npm run db:seed`, then `npm run dev` (http://localhost:3000). Seed demo logins are in `README.md` (`walter`/`admin123` is an admin).

### Tests

`npm test` runs unit + integration projects. Integration tests only run when `DATABASE_TEST_URL` is set and reachable (they auto-`migrate deploy` the `supli_test` DB on the global setup); otherwise they are silently skipped. Admins land on `/admin` after login; the `/dashboard/*` paths in the README redirect there for admin users.
