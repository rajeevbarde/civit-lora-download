# Refactored Server Structure

This document describes the new modular structure of the server after refactoring from a single large `server.js` file.

## Directory Structure

```
backend/
├── config/                 # Configuration files
│   ├── database.js        # Database connection and configuration
│   ├── agents.js          # HTTP/HTTPS agents for downloads
│   └── constants.js       # Application constants and settings
├── services/              # Business logic services
│   ├── databaseService.js # Database operations
│   ├── fileService.js     # File operations (scan, validate, hash)
│   ├── downloadService.js # Download operations
│   ├── pathService.js     # Path management
│   └── downloadQueue.js   # Download queue management
├── routes/                # Express route handlers
│   ├── models.js          # Model-related routes
│   ├── paths.js           # Path management routes
│   ├── files.js           # File operation routes
│   └── downloads.js       # Download routes
├── utils/                 # Utility functions (future use)
├── middleware/            # Custom middleware (future use)
├── server.js              # Original monolithic server (backup)
├── server-refactored.js   # New modular server
└── README-REFACTOR.md     # This file
```

## Key Improvements

### 1. Separation of Concerns
- Configuration: All settings centralized in config/ directory
- Business Logic: Moved to services/ directory with clear responsibilities
- Routes: Organized by functionality in routes/ directory
- Database: Centralized database connection and operations

### 2. Modularity
- Each service handles a specific domain (files, downloads, database, paths)
- Routes are grouped by functionality
- Easy to add new features or modify existing ones

### 3. Code Quality
- Async/Await: Consistent use of modern JavaScript patterns
- Error Handling: Proper error handling throughout
- Logging: Structured logging for better debugging
- Type Safety: Better parameter validation

### 4. Maintainability
- Smaller, focused files instead of one large file
- Clear dependencies between modules
- Easy to test individual components
- Better code organization

## Services Overview

### DatabaseService
Handles all database operations:
- Model queries with pagination and filtering
- Summary matrix generation
- File status updates
- Batch operations

### FileService
Manages file operations:
- Directory scanning
- File validation
- Hash computation
- File renaming and fixing

### DownloadService
Handles file downloads:
- Download with progress tracking
- Error handling
- Database updates

### PathService
Manages saved directory paths:
- Reading/writing path configuration
- Path validation
- CRUD operations

### DownloadQueue
Manages concurrent downloads:
- Queue management
- Concurrency control
- Status tracking

## Route Structure

### Models Routes (/api/models)
- GET / - Get models with pagination and filters
- GET /detail/:id - Get model detail by ID
- GET /basemodels - Get all base models
- GET /summary-matrix - Get summary matrix
- GET /summary-matrix-downloaded - Get downloaded summary matrix

### Paths Routes (/api/paths)
- POST /save - Save a new directory path
- GET /saved - Get all saved paths
- DELETE /delete - Delete a saved path

### Files Routes (/api/files)
- POST /start-scan - Start file scanning
- POST /check-files-in-db - Check files against database
- POST /mark-downloaded - Mark files as downloaded
- POST /validate-downloaded-files - Validate downloaded files
- POST /find-missing-files - Find files not in database
- POST /compute-file-hash - Compute file hash
- POST /fix-file - Fix file by renaming

### Downloads Routes (/api/downloads)
- POST /model-file - Download model file
- GET /status - Get download queue status

## Migration Guide

### From Old to New Server

1. Backup your current server.js:
   cp server.js server-backup.js

2. Test the new server:
   node server-refactored.js

3. Update your frontend (if needed):
   - All existing API endpoints are maintained for backward compatibility
   - New endpoints are available under the new structure

4. Switch to new server:
   mv server.js server-old.js
   mv server-refactored.js server.js

### Backward Compatibility

The refactored server maintains full backward compatibility with existing API endpoints:
- All original /api/* endpoints work exactly as before
- No changes needed in frontend code
- New modular endpoints are available as alternatives

## Benefits

- Maintainability: Easier to maintain and modify
- Testability: Individual components can be tested
- Scalability: Easy to add new features
- Readability: Clear code organization
- Reusability: Services can be reused across different routes
- Debugging: Easier to locate and fix issues 