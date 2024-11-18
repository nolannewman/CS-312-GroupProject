### 1. Clone the Repository
```bash
git clone https://github.com/nolannewman/cs-312-groupproject
```

### 2. Set up PostgreSQL
Run the songs.sql file to populate the 'music_player' database with songs table, songs metadata, and filepaths.

### 3. Configure Environment Variables
```bash
DATABASE_URL=postgresql://<username>:<password>@localhost:5432/music_player
PORT=3000
```

### 4. Install Dependencies
```bash
npm install
```

### 5. Start the Server
```bash
node server.js
```

### 6. Open in Browser
Go to http://localhost:3000 in your browser
