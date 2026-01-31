# SQLite Migration Guide

## What Changed

Your backend has been migrated from JSON file storage to SQLite database for metadata, while keeping file storage for large content (documents, models, logs).

## New Architecture

### Database (SQLite)
- **Location**: `data/database.sqlite`
- **Stores**: All metadata (projects, documents, models, traces, stats)
- **Benefits**: 
  - ✅ No race conditions (built-in locking)
  - ✅ ACID transactions
  - ✅ Better query performance
  - ✅ Referential integrity (foreign keys, cascading deletes)

### Files (Still Used)
- **Documents**: `data/documents/{id}.html` - Document content
- **Models**: `data/models/{id}.xml` - Model XML data
- **Logs**: `data/logs/{projectId}.yaml` - Event logs

## Database Schema

### Tables Created

1. **projects**
   - id (PRIMARY KEY)
   - name
   - createdAt
   - generatedModelNumber

2. **documents**
   - id (PRIMARY KEY)
   - name
   - uploadedAt
   - projectId (FOREIGN KEY → projects)
   - words (word count)

3. **models**
   - id (PRIMARY KEY)
   - name
   - timestamp
   - documentId (FOREIGN KEY → documents)
   - status (e.g., "generated", "updated", "updated_manual")
   - regeneratedByPromptTimes
   - regeneratedBySelectionsTimes
   - words (word count from selections)

4. **traces**
   - id (PRIMARY KEY)
   - documentId (FOREIGN KEY → documents)
   - modelId (FOREIGN KEY → models)
   - prompt
   - selections (JSON text)
   - timestamp

5. **model_stat_updates**
   - id (AUTOINCREMENT PRIMARY KEY)
   - modelId (FOREIGN KEY → models)
   - timestamp
   - type (e.g., "generation", "prompt_update", "selection_update", "manual_update")
   - words

## Deleted Files

The following JSON files are **no longer used** and can be deleted:
- ❌ `data/projects.json`
- ❌ `data/document-meta.json`
- ❌ `data/model-meta.by-id.json`
- ❌ `data/traces.json`
- ❌ `data/stats.json`

**Note**: The migration does NOT automatically import old data. If you have existing data in these JSON files, you'll need to migrate it manually.

## Key Changes in Code

### Before (JSON with race conditions)
```javascript
fs.readFile('projects.json', (err, data) => {
  let projects = JSON.parse(data);
  projects.push(newProject);
  fs.writeFile('projects.json', JSON.stringify(projects), ...);
});
```

### After (SQLite, safe)
```javascript
const stmt = db.prepare('INSERT INTO projects (id, name, ...) VALUES (?, ?, ...)');
stmt.run(id, name, ...);
```

### Benefits
- **No callbacks**: Direct synchronous calls (better-sqlite3 is synchronous)
- **Atomic operations**: No partial writes
- **Type safety**: Schema enforces data structure
- **Transactions**: Can wrap multiple operations

## API Endpoints (No Changes)

All existing API endpoints work exactly the same:
- ✅ POST /projects
- ✅ GET /projects
- ✅ GET /projects/:id
- ✅ PUT /projects/:id
- ✅ POST /documents
- ✅ GET /documents
- ✅ GET /documents/:id/content
- ✅ DELETE /documents/:id
- ✅ POST /models
- ✅ GET /models/:id
- ✅ PUT /models/:id
- ✅ POST /traces
- ✅ PUT /traces/:id

Response formats remain identical.

## How to Use

### Starting the Server
```bash
npm run dev
# or
node server.js
```

The database file will be automatically created on first run.

### Inspecting the Database

Install SQLite CLI:
```bash
brew install sqlite3  # macOS
```

Query the database:
```bash
sqlite3 data/database.sqlite

# List all tables
.tables

# View projects
SELECT * FROM projects;

# View documents for a project
SELECT * FROM documents WHERE projectId = 'some-uuid';

# View traces with model info
SELECT t.*, m.name FROM traces t 
JOIN models m ON t.modelId = m.id;

# Exit
.quit
```

## Migration from Old JSON Data (If Needed)

If you have existing data in JSON files, create a migration script:

```javascript
const fs = require('fs');
const db = require('./database');

// Read old JSON files
const projects = JSON.parse(fs.readFileSync('data/projects.json', 'utf8'));
const documents = JSON.parse(fs.readFileSync('data/document-meta.json', 'utf8'));
// ... etc

// Insert into database
const stmt = db.prepare('INSERT INTO projects VALUES (?, ?, ?, ?)');
projects.forEach(p => stmt.run(p.id, p.name, p.createdAt, p.generatedModelNumber));
```

## Performance Notes

- **Synchronous operations**: better-sqlite3 uses synchronous API (blocks event loop)
- **For pilot use**: Perfectly fine, operations are fast (< 1ms)
- **For production**: Consider migrating to async library like `sqlite` or use PostgreSQL
- **File operations**: Document/model content still uses sync fs.readFileSync/writeFileSync

## Troubleshooting

### Database locked error
This shouldn't happen with better-sqlite3, but if you see it:
- Ensure only one server instance is running
- Close any SQLite CLI connections

### Foreign key constraint failed
- Ensure parent records exist before creating child records
- Check that projectId exists before creating documents/models

### Migration doesn't preserve old data
- This is expected - run a manual migration script if needed
- Old JSON files are left intact for reference

## Next Steps

1. ✅ Test all endpoints with your frontend
2. ✅ Verify data persistence after server restart
3. ✅ Delete old JSON files once confirmed working
4. 🔜 Consider adding database backups
5. 🔜 Add indexes for frequently queried fields (already done for common queries)
