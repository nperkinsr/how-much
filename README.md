# How Much?

A small browser-based multiplayer guessing game. Players connect through PeerJS, see the same product each round, and guess the real price.

## Multiplayer Check

1. Open the app in one browser tab and host a game.
2. Copy the host ID.
3. Open another tab or browser, enter a different player name, and join with that host ID.
4. Start the game from the host tab and verify both screens stay in sync.


## Notes

- PeerJS requires network access to its broker service unless you configure your own PeerJS server.
- Product and avatar images live in `images/`.
- The QA checklist in `QA_checklist.txt` covers the main manual flows.
