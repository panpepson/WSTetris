
// --- events

class Events
{
    constructor()
    {
        this._listeners = new Set;
    }
    listen(name, callback)
    {
        this._listeners.add({
            name,
            callback,
        });
    }
    emit(name, ...data)
    {
        this._listeners.forEach(listener => {
            if (listener.name === name) {
                listener.callback(...data);
            }
        });
    }
}

// --------------arena 

class Arena
{
    constructor(w, h)
    {
        const matrix = [];
        while (h--) {
            matrix.push(new Array(w).fill(0));
        }
        this.matrix = matrix;

        this.events = new Events;
    }

    clear()
    {
        this.matrix.forEach(row => row.fill(0));
        this.events.emit('matrix', this.matrix);
    }

    collide(player)
    {
        const [m, o] = [player.matrix, player.pos];
        for (let y = 0; y < m.length; ++y) {
            for (let x = 0; x < m[y].length; ++x) {
                if (m[y][x] !== 0 &&
                    (this.matrix[y + o.y] &&
                    this.matrix[y + o.y][x + o.x]) !== 0) {
                    return true;
                }
            }
        }
        return false;
    }

    merge(player)
    {
        player.matrix.forEach((row, y) => {
            row.forEach((value, x) => {
                if (value !== 0) {
                    this.matrix[y + player.pos.y][x + player.pos.x] = value;
                }
            });
        });
        this.events.emit('matrix', this.matrix);
    }

    sweep()
    {
        let rowCount = 1;
        let score = 0;
        outer: for (let y = this.matrix.length - 1; y > 0; --y) {
            for (let x = 0; x < this.matrix[y].length; ++x) {
                if (this.matrix[y][x] === 0) {
                    continue outer;
                }
            }

            const row = this.matrix.splice(y, 1)[0].fill(0);
            this.matrix.unshift(row);
            ++y;

            score += rowCount * 10;
            rowCount *= 2;
        }
        this.events.emit('matrix', this.matrix);
        return score;
    }
}


// ------ pleyer 


class Player
{
    constructor(tetris)
    {
        this.DROP_SLOW = 1000;
        this.DROP_FAST = 50;

        this.events = new Events;

        this.tetris = tetris;
        this.arena = tetris.arena;

        this.dropCounter = 0;
        this.dropInterval = this.DROP_SLOW;

        this.pos = {x: 0, y: 0};
        this.matrix = null;
        this.score = 0;

        this.reset();
    }

    createPiece(type)
    {
        if (type === 'T') {
            return [
                [0, 0, 0],
                [1, 1, 1],
                [0, 1, 0],
            ];
        } else if (type === 'O') {
            return [
                [2, 2],
                [2, 2],
            ];
        } else if (type === 'L') {
            return [
                [0, 3, 0],
                [0, 3, 0],
                [0, 3, 3],
            ];
        } else if (type === 'J') {
            return [
                [0, 4, 0],
                [0, 4, 0],
                [4, 4, 0],
            ];
        } else if (type === 'I') {
            return [
                [0, 5, 0, 0],
                [0, 5, 0, 0],
                [0, 5, 0, 0],
                [0, 5, 0, 0],
            ];
        } else if (type === 'S') {
            return [
                [0, 6, 6],
                [6, 6, 0],
                [0, 0, 0],
            ];
        } else if (type === 'Z') {
            return [
                [7, 7, 0],
                [0, 7, 7],
                [0, 0, 0],
            ];
        }
    }

    drop()
    {
        this.pos.y++;
        this.dropCounter = 0;
        if (this.arena.collide(this)) {
            this.pos.y--;
            this.arena.merge(this);
            this.reset();
            this.score += this.arena.sweep();
            this.events.emit('score', this.score);
            return;
        }
        this.events.emit('pos', this.pos);
    }

    move(dir)
    {
        this.pos.x += dir;
        if (this.arena.collide(this)) {
            this.pos.x -= dir;
            return;
        }
        this.events.emit('pos', this.pos);
    }

    reset()
    {
        const pieces = 'ILJOTSZ';
        this.matrix = this.createPiece(pieces[pieces.length * Math.random() | 0]);
        this.pos.y = 0;
        this.pos.x = (this.arena.matrix[0].length / 2 | 0) -
                     (this.matrix[0].length / 2 | 0);
        if (this.arena.collide(this)) {
            this.arena.clear();
            this.score = 0;
            this.events.emit('score', this.score);
        }

        this.events.emit('pos', this.pos);
        this.events.emit('matrix', this.matrix);
    }

    rotate(dir)
    {
        const pos = this.pos.x;
        let offset = 1;
        this._rotateMatrix(this.matrix, dir);
        while (this.arena.collide(this)) {
            this.pos.x += offset;
            offset = -(offset + (offset > 0 ? 1 : -1));
            if (offset > this.matrix[0].length) {
                this._rotateMatrix(this.matrix, -dir);
                this.pos.x = pos;
                return;
            }
        }
        this.events.emit('matrix', this.matrix);
    }

    _rotateMatrix(matrix, dir)
    {
        for (let y = 0; y < matrix.length; ++y) {
            for (let x = 0; x < y; ++x) {
                [
                    matrix[x][y],
                    matrix[y][x],
                ] = [
                    matrix[y][x],
                    matrix[x][y],
                ];
            }
        }

        if (dir > 0) {
            matrix.forEach(row => row.reverse());
        } else {
            matrix.reverse();
        }
    }

    update(deltaTime)
    {
        this.dropCounter += deltaTime;
        if (this.dropCounter > this.dropInterval) {
            this.drop();
        }
    }
}

// ---------- tetris

class Tetris
{
    constructor(element)
    {
        this.element = element;
        this.canvas = element.querySelector('canvas');
        this.context = this.canvas.getContext('2d');
        this.context.scale(20, 20);

        this.arena = new Arena(12, 20);
        this.player = new Player(this);
        this.player.events.listen('score', score => {
        this.updateScore(score);
        });

        this.colors = [
            null,
            '#FF0D72',
            '#0DC2FF',
            '#0DFF72',
            '#F538FF',
            '#FF8E0D',
            '#FFE138',
            '#3877FF',
        ];

        let lastTime = 0;
        this._update = (time = 0) => {
            const deltaTime = time - lastTime;
            lastTime = time;

            this.player.update(deltaTime);

            this.draw();
            requestAnimationFrame(this._update);
        };

        this.updateScore(0);
    }

    draw()
    {
        this.context.fillStyle = '#000';
        this.context.fillRect(0, 0, this.canvas.width, this.canvas.height);

        this.drawMatrix(this.arena.matrix, {x: 0, y: 0});
        this.drawMatrix(this.player.matrix, this.player.pos);
    }

    drawMatrix(matrix, offset)
    {
        matrix.forEach((row, y) => {
            row.forEach((value, x) => {
                if (value !== 0) {
                    this.context.fillStyle = this.colors[value];
                    this.context.fillRect(x + offset.x,
                                     y + offset.y,
                                     1, 1);
                }
            });
        });
    }

    run()
    {
        this._update();
    }

    serialize()
    {
        return {
            arena: {
                matrix: this.arena.matrix,
            },
            player: {
                matrix: this.player.matrix,
                pos: this.player.pos,
                score: this.player.score,
            },
        };
    }

    unserialize(state)
    {
        this.arena = Object.assign(state.arena);
        this.player = Object.assign(state.player);
        this.updateScore(this.player.score);
        this.draw();
    }

updateScore(score) {
    const scoreElement = this.element.querySelector('#scores'); // Poprawne odwołanie do id
    if (scoreElement) {
        scoreElement.innerText = `Gracz: ${score}`; // Aktualizacja wyniku
    } else {
        console.warn('Element z id="scores" nie został znaleziony w DOM.');
    }
}



}


// ----- t - menager 

class TetrisManager
{
    constructor(document)
    {
        this.document = document;
        this.template = this.document.querySelector('#player-template');

        this.instances = [];
    }

    createPlayer()
    {
        const element = document
            .importNode(this.template.content, true)
            .children[0];

        const tetris = new Tetris(element);

        this.document.body.appendChild(tetris.element);

        this.instances.push(tetris);

        return tetris;
    }

    removePlayer(tetris)
    {
        this.document.body.removeChild(tetris.element);
        this.instances = this.instances.filter(instance => instance !== tetris);
    }

    sortPlayers(tetri)
    {
        tetri.forEach(tetris => {
            this.document.body.appendChild(tetris.element);
        });
    }
}


// ----  conect 




class ConnectionManager {
    constructor(tetrisManager) {
        this.conn = null;
        this.peers = new Map();
        this.tetrisManager = tetrisManager;
        this.localTetris = this.tetrisManager.instances[0];
    }

    connect(address) {
        return new Promise((resolve, reject) => {
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

    initSession() {
        const session = {
            type: 'join',
            state: this.localTetris.serialize(),
        };
        this.send(session);
    }

    watchEvents() {
        const local = this.localTetris;
        const player = local.player;


['pos', 'matrix', 'score'].forEach(event => {
    player.events.listen(event, () => {
        this.send({
            type: 'state',
            id: this.localTetris.id, // Dodaj identyfikator gracza
            state: local.serialize(),
        });
    });
});



        local.arena.events.listen('matrix', () => {
            this.send({
                type: 'state',
                state: local.serialize(),
            });
        });
    }




    receive(data) {
        const message = JSON.parse(data);
        if (message.type === 'join') {
            this.receiveJoin(message);
        } else if (message.type === 'state') {
            this.receiveState(message);
        }
    }


receiveJoin(message) {
    const tetris = this.tetrisManager.createPlayer();
    this.peers.set(message.id, tetris);
    tetris.unserialize(message.state);

    // Tworzenie elementu dla wyniku przeciwnika
    const scoresContainer = document.getElementById('scores');
    const opponentScore = document.createElement('div');
    opponentScore.id = `opponent-score-${message.id}`;
    opponentScore.textContent = `Przeciwnik: 0`;
    scoresContainer.appendChild(opponentScore);
}




receiveState(message) {
    if (!this.peers.has(message.id)) {
        console.warn('Unknown peer state', message);
        return;
    }

    const tetris = this.peers.get(message.id);
    tetris.unserialize(message.state);

    // Wyświetlenie wyniku przeciwnika
    const scoreElement = document.getElementById(`opponent-score-${message.id}`);
    if (scoreElement) {
        scoreElement.textContent = `Przeciwnik: ${tetris.player.score}`;
    } else {
        console.warn(`Nie znaleziono elementu dla wyniku przeciwnika: ${message.id}`);
    }
}


    send(data) {
        const json = JSON.stringify(data);
        console.log('Sending message', json);
        this.conn.send(json);
    }
}




// --- main 

// Czekamy na załadowanie dokumentu
document.addEventListener('DOMContentLoaded', () => {
    const tetrisManager = new TetrisManager(document);
    const tetrisLocal = tetrisManager.createPlayer();
    tetrisLocal.element.classList.add('local');

    // Inicjalizacja połączenia
    const connectionManager = new ConnectionManager(tetrisManager);
    connectionManager.connect(`ws://${window.location.hostname}:3000`)
        .then(() => {
            console.log('Successfully connected to server');
            tetrisLocal.run();
        })
        .catch(err => {
            console.error('Failed to connect:', err);
            // Uruchamiamy grę nawet bez połączenia
            tetrisLocal.run();
        });



const keyListener = (event) => {
    [
        //[65, 68, 81, 69, 83],
        [37,39, 38,40, 32],
    ].forEach((key, index) => {
        const player = tetrisLocal.player;
        if (event.type === 'keydown') {
            if (event.keyCode === key[0]) {
                player.move(-1);
            } else if (event.keyCode === key[1]) {
                player.move(1);
            } else if (event.keyCode === key[2]) {
                player.rotate(-1);
            } else if (event.keyCode === key[3]) {
                player.rotate(1);
            }
        }

        if (event.keyCode === key[4]) {
            if (event.type === 'keydown') {
                if (player.dropInterval !== player.DROP_FAST) {
                    player.drop();
                    player.dropInterval = player.DROP_FAST;
                }
            } else {
                player.dropInterval = player.DROP_SLOW;
            }
        }
    });
};

document.addEventListener('keydown', keyListener);
document.addEventListener('keyup', keyListener);

});


