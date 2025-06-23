# civit-lora-download

civit-lora-download is a Node.js-based application for managing and interacting with a SQLite database of model data (ALLCivitData). It provides both backend and frontend components, enabling users to fetch, view, and manage model information through a web interface. Setup involves downloading a pre-existing SQLite database, running a provided SQL script to prepare the required table, and launching both servers via a single batch file for streamlined operation.

## Prerequisites
- Node.js v20 must be installed on your system. [Download Node.js here](https://nodejs.org/en/download)


## Database Setup

The table used for this project is named `ALLCivitData`.

### Steps to Set Up the Database:
1. Download the SQLite database from [this Google Drive link](https://drive.google.com/drive/folders/1jMbwb3HUcDNB2H6n1GXt2WKK-COpbdrQ).
2. Once downloaded, execute the SQL script found in `civitalldata.sql` against the downloaded database. This will generate the `ALLCivitData` table from the existing database.

Make sure you have SQLite installed to run the SQL script.

## Starting the Application

To start both the frontend and backend servers simultaneously, simply run the `start_servers.bat` file (double-click it or run it from the command line):

```
start_servers.bat
```

This will open two new command windows: one for the backend server and one for the frontend server. Each will automatically install dependencies if needed and start the respective server.
