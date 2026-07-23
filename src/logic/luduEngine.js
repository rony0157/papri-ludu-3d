// Core 2-Player Ludo Game Logic Engine

export class LuduEngine {
  constructor() {
    this.reset();
  }

  reset() {
    this.turn = 0; // 0: Papri, 1: Partner
    this.diceValue = 0;
    this.diceRolled = false;
    this.winner = null;
    this.hasExtraTurn = false;

    // Tokens state for 2 players (4 tokens each)
    this.players = {
      0: { name: 'Papri ❤️', color: 'red', startIdx: 0, homeEntryStep: 51, tokens: [] },
      1: { name: 'My Love 💖', color: 'green', startIdx: 26, homeEntryStep: 51, tokens: [] }
    };

    // Initialize tokens
    [0, 1].forEach(p => {
      this.players[p].tokens = Array(4).fill(null).map((_, id) => ({
        id,
        status: 'HOME_BASE', // 'HOME_BASE' | 'IN_TRACK' | 'IN_HOME_PATH' | 'FINISHED'
        stepCount: 0        // 0: Base, 1..51: Track steps, 52..56: Home path, 57: Finished
      }));
    });
  }

  rollDice() {
    if (this.diceRolled || this.winner !== null) return null;
    this.diceValue = Math.floor(Math.random() * 6) + 1;
    this.diceRolled = true;
    
    if (this.diceValue === 6) {
      this.hasExtraTurn = true;
    }

    return this.diceValue;
  }

  // Get list of moveable token IDs for current player based on diceValue
  getValidTokenMoves() {
    if (!this.diceRolled || this.winner !== null) return [];

    const player = this.players[this.turn];
    const valid = [];

    player.tokens.forEach(t => {
      if (t.status === 'FINISHED') return;

      if (t.status === 'HOME_BASE') {
        if (this.diceValue === 6) valid.push(t.id);
      } else {
        if (t.stepCount + this.diceValue <= 57) {
          valid.push(t.id);
        }
      }
    });

    return valid;
  }

  // Map stepCount (1..57) to global 3D cell coordinate index / home path index
  getGlobalPosition(playerIdx, stepCount) {
    if (stepCount === 0) return { type: 'BASE' };
    if (stepCount >= 57) return { type: 'FINISHED' };

    if (stepCount <= 51) {
      const startTrackIdx = this.players[playerIdx].startIdx;
      const trackIdx = (startTrackIdx + (stepCount - 1)) % 52;
      return { type: 'TRACK', idx: trackIdx };
    } else {
      // Home path step (52..56 -> idx 0..4)
      const homePathIdx = stepCount - 52;
      return { type: 'HOME_PATH', idx: homePathIdx };
    }
  }

  // Move a token and return step-by-step positions for animation & capture result
  moveToken(tokenId) {
    if (!this.diceRolled || this.winner !== null) return null;

    const validMoves = this.getValidTokenMoves();
    if (!validMoves.includes(tokenId)) return null;

    const player = this.players[this.turn];
    const token = player.tokens[tokenId];

    const pathTrajectory = [];
    let capturedToken = null;

    if (token.status === 'HOME_BASE') {
      token.status = 'IN_TRACK';
      token.stepCount = 1;
      pathTrajectory.push(this.getGlobalPosition(this.turn, 1));
    } else {
      const startStep = token.stepCount;
      const endStep = startStep + this.diceValue;

      for (let s = startStep + 1; s <= endStep; s++) {
        pathTrajectory.push(this.getGlobalPosition(this.turn, s));
      }

      token.stepCount = endStep;
      if (token.stepCount === 57) {
        token.status = 'FINISHED';
      } else if (token.stepCount > 51) {
        token.status = 'IN_HOME_PATH';
      }
    }

    // Check Capture on final position
    const finalPos = this.getGlobalPosition(this.turn, token.stepCount);
    const safeIndices = [0, 8, 13, 21, 26, 34, 39, 47];

    if (finalPos.type === 'TRACK' && !safeIndices.includes(finalPos.idx)) {
      const opponentIdx = this.turn === 0 ? 1 : 0;
      const opponent = this.players[opponentIdx];

      opponent.tokens.forEach(opToken => {
        if (opToken.status === 'IN_TRACK') {
          const opPos = this.getGlobalPosition(opponentIdx, opToken.stepCount);
          if (opPos.type === 'TRACK' && opPos.idx === finalPos.idx) {
            // Captured! Send back to base
            opToken.status = 'HOME_BASE';
            opToken.stepCount = 0;
            capturedToken = { playerIdx: opponentIdx, tokenId: opToken.id };
            this.hasExtraTurn = true; // Extra turn for capturing!
          }
        }
      });
    }

    // Check Win
    const allFinished = player.tokens.every(t => t.status === 'FINISHED');
    if (allFinished) {
      this.winner = this.turn;
    }

    // Prepare Turn Transition
    const grantedExtraTurn = this.hasExtraTurn;
    this.diceRolled = false;
    this.hasExtraTurn = false;

    if (!grantedExtraTurn && this.winner === null) {
      this.turn = this.turn === 0 ? 1 : 0;
    }

    return {
      playerIdx: this.turn,
      tokenId,
      trajectory: pathTrajectory,
      capturedToken,
      nextTurn: this.turn,
      grantedExtraTurn,
      winner: this.winner
    };
  }

  // Pass turn if no valid moves available after rolling
  passTurn() {
    this.diceRolled = false;
    this.hasExtraTurn = false;
    this.turn = this.turn === 0 ? 1 : 0;
    return this.turn;
  }
}
