# Sadhixapp

Node.js (Express) backend + MySQL, deployed via Jenkins + PM2 behind an nginx reverse proxy.

## Architecture

```
Client -> DNS (pharmaecon.com) -> Nginx (reverse proxy) -> Node.js app (this repo, port 3000) -> MySQL
```

Deployment: GitHub -> Jenkins pipeline -> rsync to app server -> npm install -> pm2 start/reload.

## Project structure

```
sadhixapp/
├── server.js           # entry point (what PM2 runs)
├── config/
│   └── db.js            # MySQL connection pool (reads from .env)
├── routes/
│   ├── health.js         # GET /health - app + DB status check
│   └── items.js           # example CRUD resource - copy this pattern for new features
├── public/
│   └── index.html          # static placeholder page
├── schema.sql              # sample DB schema (run once on the DB server)
├── .env.example             # template for required environment variables
└── package.json
```

## Local setup

```bash
git clone <your-repo-url>
cd sadhixapp
npm install
cp .env.example .env      # then fill in real DB_HOST, DB_PASSWORD, etc.
npm run dev                # runs with nodemon, auto-restarts on changes
```

## First-time DB setup

On the DB server:

```bash
mysql -u root -p < schema.sql
```

(This matches the `GRANT ALL PRIVILEGES ... 'root'@'<appserver-private-ip>'` step already done on the DB server.)

## Production run (what Jenkins/PM2 does)

```bash
npm install --production
npx pm2 start npm --name sadhixapp -- start
npx pm2 save
```

To reload after a new deploy without downtime:

```bash
npx pm2 reload sadhixapp
```

## How to upgrade / extend this app later

- **New API resource** (e.g. "users"): copy `routes/items.js` -> `routes/users.js`, adjust the SQL, then add
  `app.use('/api/users', require('./routes/users'));` in `server.js`.
- **New env variable**: add it to `.env.example` (documentation) and to `.env` on the server (real value) —
  never commit `.env` itself.
- **New npm package**: `npm install <package>` locally, commit the updated `package.json` and
  `package-lock.json`. Jenkins will run `npm install --production` on deploy automatically.
- **Frontend**: drop static files into `public/` — they're served automatically at the root path.
- **Schema changes**: add new `.sql` files (e.g. `migrations/002_add_users.sql`) rather than editing
  `schema.sql` in place, so you keep a history of changes.

## Endpoints

| Method | Path          | Description              |
|--------|---------------|---------------------------|
| GET    | `/`           | Login / signup page         |
| GET    | `/health`     | App + DB connectivity check |
| POST   | `/api/auth/signup` | Create account (`{ "email", "password" }`) |
| POST   | `/api/auth/login`  | Log in (`{ "email", "password" }`) |
| POST   | `/api/auth/logout` | Log out (clears session cookie) |
| GET    | `/api/auth/me`      | Check who's currently logged in |
| GET    | `/api/items`  | List items                  |
| GET    | `/api/items/:id` | Get one item              |
| POST   | `/api/items`  | Create item (`{ "name": "..." }`) |
| PUT    | `/api/items/:id` | Update item              |
| DELETE | `/api/items/:id` | Delete item              |

## Login / signup page

Visiting `/` shows a login/signup screen (`public/login.html`):
- **New users** click "Create Account", enter email + password (min 6 chars) — a row is added to the `users` table with a bcrypt-hashed password, and they're logged in automatically.
- **Existing users** log in with the same email/password — the server checks the hash and, if it matches, issues a session (stored in an httpOnly cookie, so JavaScript on the page can't read it directly).
- Wrong password → "Incorrect password". Email not found → "No account found... Please create one." Signing up with an email that's already used → told to log in instead.
- Once logged in, the page auto-detects the session on reload via `/api/auth/me` and shows a "Welcome back" screen with a logout button instead of the forms.

To protect any future route so only logged-in users can use it, import and use the `requireAuth` middleware from `routes/auth.js`:
```js
const { requireAuth } = require('./routes/auth');
app.get('/api/something-private', requireAuth, (req, res) => {
  // req.user.id and req.user.email are available here
});
```

## Deployment (Jenkins)

This repo is built to be deployed by the Jenkins pipeline you already set up
(checkout -> rsync to app server -> `npm install --production` -> pm2 start/reload).
No changes needed to the Jenkinsfile for this repo structure to work.
