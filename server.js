const WebSocket = require('ws');
const http = require('http');
const express = require('express');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// Obsługa plików statycznych
app.use(express.static('public'));

const sessions = new Map();

function createId(length = 6) {
    return Math.random().toString(36).substr(2, length);
}

function createClient(conn, id = createId()) {
    return {
        conn,
        id,
        session: null,
        state: null,
    };
}

function createSession(id = createId()) {
    return {
        id,
        clients: new Set,
    };
}

wss.on('connection', (ws, req) => {
    const client = createClient(ws);
    console.log('Client connected');

    ws.on('message', (message) => {
        try {
            const data = JSON.parse(message);
            handleMessage(client, data);
        } catch (e) {
            console.error('Failed to process message:', e);
        }
    });

    ws.on('close', () => {
        handleDisconnect(client);
    });
});

function handleMessage(client, data) {
    const {type} = data;
    
    if (type === 'create-session') {
        const session = createSession();
        session.clients.add(client);
        client.session = session;
        client.state = data.state;
        sessions.set(session.id, session);

        client.conn.send(JSON.stringify({
            type: 'session-created',
            id: session.id,
        }));
    }
    // ... reszta obsługi wiadomości pozostaje taka sama
}

function handleDisconnect(client) {
    const session = client.session;
    if (session) {
        session.clients.delete(client);
        if (session.clients.size === 0) {
            sessions.delete(session.id);
        } else {
            broadcastSession(session);
        }
    }
}

// Port nasłuchiwania
const port = process.env.PORT || 3000;
server.listen(port, () => {
    console.log(`Server running on port ${port}`);
});
