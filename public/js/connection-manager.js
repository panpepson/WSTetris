class ConnectionManager {
    constructor(tetrisManager) {
        this.conn = null;
        this.peers = new Map;
        this.tetrisManager = tetrisManager;
        this.localTetris = this.tetrisManager.instances[0];
    }

    connect(address) {
        return new Promise((resolve, reject) => {
            // Upewnij się że używamy protokołu ws lub wss
            const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
            const wsAddress = `${protocol}//${window.location.hostname}:3000`;

            this.conn = new WebSocket(wsAddress);

            this.conn.onopen = () => {
                console.log('Connection established');
                this.initSession();
                this.watchEvents();
                resolve();
            };

            this.conn.onerror = (err) => {
                console.error('WebSocket error:', err);
                reject(err);
            };

            this.conn.onclose = () => {
                console.log('Connection closed');
                // Możesz tutaj dodać logikę ponownego połączenia
            };

            this.conn.onmessage = (event) => {
                console.log('Received message', event.data);
                this.receive(event.data);
            };
        });
    }

    // ... reszta metod pozostaje bez zmian
}

window.ConnectionManager = ConnectionManager;

// Użycie w main.js:
const tetrisManager = new TetrisManager(document);
const tetrisLocal = tetrisManager.createPlayer();
tetrisLocal.element.classList.add('local');

const connectionManager = new ConnectionManager(tetrisManager);

connectionManager.connect()
    .then(() => {
        console.log('Successfully connected to server');
        tetrisLocal.run();
    })
    .catch(err => {
        console.error('Failed to connect:', err);
        // Możesz tutaj dodać obsługę błędów dla użytkownika
        alert('Nie udało się połączyć z serwerem. Spróbuj ponownie później.');
    });
