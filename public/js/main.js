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
