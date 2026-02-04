# Deployment Instructions for Cloud Server

## Important: better-sqlite3 Deployment

This application now uses **better-sqlite3**, which requires native compilation. When deploying to your cloud server, follow these steps:

### On Cloud Server (Linux)

After uploading your code, run:

```bash
cd /srv/gruppe/students/ga94hor/public_html/dbpm/backend
npm install
```

If you get an "invalid ELF header" error, rebuild the native module:

```bash
npm rebuild better-sqlite3
```

Or reinstall from source:

```bash
npm install --build-from-source
```

### Important Notes

1. **Never commit `node_modules/`** - It contains platform-specific binaries
2. **Always run `npm install` on the target server** - This ensures binaries match the server's architecture
3. The `.gitignore` already excludes `node_modules/`

### Alternative: If Compilation Fails

If you cannot compile better-sqlite3 on the cloud server (missing build tools), you have two options:

1. **Ask server admin to install build tools:**
   ```bash
   # They need: gcc, g++, make, python3
   ```

2. **Switch back to sql.js** (no compilation needed):
   - See MIGRATION_GUIDE.md for reverting steps
   - sql.js works everywhere but is slower

### Verifying Deployment

After installation, test the server:

```bash
node server.js
```

You should see:
```
Server running on http://localhost:3000
Database initialized successfully
```

### Common Errors

- **"invalid ELF header"** → Run `npm rebuild better-sqlite3`
- **"Cannot find module 'better-sqlite3'"** → Run `npm install`
- **"gyp ERR!"** → Missing build tools, contact server admin
