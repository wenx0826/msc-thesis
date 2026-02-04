# Backend Architecture

## Overview

This backend follows a clean, layered architecture with separation of concerns:

```
backend/
├── server.js                    # Application entry point (~60 lines)
├── database.js                  # Database initialization
├── routes/                      # HTTP route handlers
│   ├── logs.js                  # POST /logs
│   ├── projects.js              # /projects endpoints
│   ├── documents.js             # /documents endpoints
│   ├── models.js                # /models endpoints
│   ├── traces.js                # /traces endpoints
│   └── stats.js                 # /stats endpoints
├── repositories/                # Data access layer
│   ├── projectRepository.js     # Project CRUD operations
│   ├── documentRepository.js    # Document CRUD operations
│   ├── modelRepository.js       # Model CRUD operations
│   └── traceRepository.js       # Trace CRUD operations
└── utils/                       # Shared utilities
    ├── logger.js                # Event logging
    └── fileHelper.js            # File I/O operations
```

## Architecture Layers

### 1. Routes Layer (`routes/`)
- **Responsibility**: Handle HTTP requests/responses, validate input
- **Dependencies**: Repositories, Utils
- **Pattern**: Express Router modules
- **Example**: `routes/projects.js` handles all `/projects/*` endpoints

### 2. Repository Layer (`repositories/`)
- **Responsibility**: Database operations, data persistence
- **Dependencies**: Database only
- **Pattern**: Singleton classes with methods for each operation
- **Benefits**:
  - Centralizes all SQL queries
  - Easy to test (can mock repositories)
  - DRY - reusable database operations
  - Single source of truth for data access

### 3. Utilities Layer (`utils/`)
- **Responsibility**: Shared helper functions
- **Files**:
  - `logger.js` - YAML logging, ISO dates
  - `fileHelper.js` - Read/write documents and models

### 4. Entry Point (`server.js`)
- **Responsibility**: Application setup and wiring
- **Tasks**:
  - Configure Express middleware
  - Register route modules
  - Start HTTP server
- **Size**: ~60 lines (was 757 lines)

## Design Principles

### 1. **Separation of Concerns**
Each layer has a single, well-defined responsibility:
- Routes handle HTTP
- Repositories handle data
- Utils provide shared functionality

### 2. **Single Responsibility Principle**
Each file/class has one reason to change:
- `projectRepository.js` changes only when project data logic changes
- `projects.js` changes only when project API contract changes

### 3. **Dependency Injection**
Modules import what they need:
```javascript
const projectRepo = require("../repositories/projectRepository");
const { logEvent } = require("../utils/logger");
```

### 4. **DRY (Don't Repeat Yourself)**
Common operations are centralized:
- Database queries → Repositories
- File operations → fileHelper
- Logging → logger

## Benefits of This Architecture

### For Development
- ✅ **Easy to find code** - Clear file organization
- ✅ **Easy to test** - Each layer can be tested independently
- ✅ **Easy to modify** - Changes are localized to specific files
- ✅ **Reusable code** - Repository methods used by multiple routes

### For Maintenance
- ✅ **Readable** - Each file is 40-150 lines instead of 757
- ✅ **Scalable** - Easy to add new routes/repositories
- ✅ **Debuggable** - Clear stack traces point to specific layers

### For Software Engineering Practice
- ✅ **Industry standard** - MVC-like pattern
- ✅ **Professional** - Shows architectural thinking
- ✅ **Portfolio-ready** - Demonstrates best practices

## Example Data Flow

**Request**: `POST /projects`

1. **Route** (`routes/projects.js`)
   ```javascript
   router.post("/", (req, res) => {
     const { name } = req.body;
     const projectId = crypto.randomUUID();
     // Validate input
     projectRepo.create(projectId, name, ...);
     logEvent(projectId, "project_created", ...);
     res.json({ id: projectId });
   });
   ```

2. **Repository** (`repositories/projectRepository.js`)
   ```javascript
   create(projectId, name, createdAt) {
     const stmt = db.prepare("INSERT INTO projects ...");
     stmt.run(projectId, name, createdAt, 0);
     return { id: projectId, name, ... };
   }
   ```

3. **Utility** (`utils/logger.js`)
   ```javascript
   logEvent(projectId, event, data) {
     fs.appendFile(`${projectId}.yaml`, yamlEntry);
   }
   ```

## Migration Notes

### What Changed
- ✅ **Old**: 757-line `server.js` with everything mixed together
- ✅ **New**: Clean separation across 15+ focused files

### What Stayed the Same
- ✅ API endpoints (no breaking changes)
- ✅ Database schema
- ✅ Business logic
- ✅ File structure (data/, frontend/)

### Backup
- Original code saved as `server.old.js`
- Can revert with: `mv server.old.js server.js`

## Testing Strategy

### Unit Testing Repositories
```javascript
// Mock database, test repository methods
const projectRepo = require("./repositories/projectRepository");
// Test projectRepo.create(), findAll(), etc.
```

### Integration Testing Routes
```javascript
// Use supertest to test HTTP endpoints
const request = require("supertest");
const app = require("./server");
// Test POST /projects returns 200
```

### Manual Testing
Server logs show all requests being handled correctly:
```
Fetching project list...
Fetching documents for project: bbcc88b4-...
Fetching model content for ID: a2607151-...
```

## Future Improvements

1. **Add middleware layer** for authentication, validation
2. **Add service layer** for complex business logic
3. **Add DTOs** (Data Transfer Objects) for request/response
4. **Add error handling middleware**
5. **Add request logging middleware**
6. **Add API documentation** (Swagger/OpenAPI)

## Best Practices Applied

- ✅ **Layered architecture** - Clear separation of concerns
- ✅ **Repository pattern** - Centralized data access
- ✅ **Modular routes** - One file per resource
- ✅ **Utility functions** - Reusable helpers
- ✅ **Error handling** - Try-catch in all routes
- ✅ **Input validation** - Check required fields
- ✅ **Logging** - Track important events
- ✅ **Clean code** - Readable, maintainable, well-organized
