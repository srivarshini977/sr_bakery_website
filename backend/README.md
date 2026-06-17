# SR Bakery Backend

## Default Login Details

### Admin
- Email: `admin@srbakery.com`
- Password: `Admin@123`

### Staff
All staff accounts use password `Staff@123`.

- Chef 1: `chef1@srbakery.com`
- Chef 2: `chef2@srbakery.com`
- Tea Master 1: `teamaster1@srbakery.com`
- Tea Master 2: `teamaster2@srbakery.com`
- Cashier 1: `cashier1@srbakery.com`
- Waiter 1: `waiter1@srbakery.com`

Each staff login only sees orders assigned to that staff page. There is no shared default customer account.

## Run Backend

```bash
npm install
npm run start
```

The backend runs on:

```text
http://localhost:5000
```

Health check:

```text
http://localhost:5000/api/health
```

## Useful Scripts

Reset default admin and staff accounts:

```bash
node scripts/reset_default_users.js
```

Sync exact SR Bakery menu items:

```bash
node scripts/sync_menu.js
```

Sync inventory items:

```bash
node scripts/sync_inventory.js
```
