// Core 2-Player Ludo Game Logic Engine

export class LuduEngine {
  constructor() {
    this.reset();
  }

  reset() {
    this.turn = 0; // 0: Papri (Red), 1: Partner (Green)
    this.diceValue = 0;
    this.diceRolled = false;
    this.winner = null;
    this.hasExtraTurn = false;

    this.players = {
      0: { name: 'Papri ❤️', color: 'red', startIdx: 0, homeEntryStep: 51, tokens: [] },
      1: { name: 'My Love 💖', color: 'green', startIdx: 26, homeEntryStep: 51, tokens: [] }
    };

    [0, 1].forEach(p => {
      this.players[p].tokens = Array(4).fill(null).map((_, id) => ({
        id,
        status: 'HOME_BASE', // 'HOME_BASE' | 'IN_TRACK' | 'IN_HOME_PATH' | 'FINISHED'
        stepCount: 0
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

  getGlobalPosition(playerIdx, stepCount) {
    if (stepCount === 0) return { type: 'BASE' };
    if (stepCount >= 57) return { type: 'FINISHED' };

    if (stepCount <= 51) {
      const startTrackIdx = this.players[playerIdx].startIdx;
      const trackIdx = (startTrackIdx + (stepCount - 1)) % 52;
      return { type: 'TRACK', idx: trackIdx };
    } else {
      const homePathIdx = stepCount - 52;
      return { type: 'HOME_PATH', idx: homePathIdx };
    }
  }

  moveToken(tokenId) {
    if (!this.diceRolled || this.winner !== null) return null;

    const movingPlayerIdx = this.turn; // Record moving player index before updating turn
    const validMoves = this.getValidTokenMoves();
    if (!validMoves.includes(tokenId)) return null;

    const player = this.players[movingPlayerIdx];
    const token = player.tokens[tokenId];

    const pathTrajectory = [];
    let capturedToken = null;

    if (token.status === 'HOME_BASE') {
      token.status = 'IN_TRACK';
      token.stepCount = 1;
      pathTrajectory.push(this.getGlobalPosition(movingPlayerIdx, 1));
    } else {
      const startStep = token.stepCount;
      const endStep = startStep + this.diceValue;

      for (let s = startStep + 1; s <= endStep; s++) {
        pathTrajectory.push(this.getGlobalPosition(movingPlayerIdx, s));
      }

      token.stepCount = endStep;
      if (token.stepCount === 57) {
        token.status = 'FINISHED';
      } else if (token.stepCount > 51) {
        token.status = 'IN_HOME_PATH';
      }
    }

    // Check Capture on final position
    const finalPos = this.getGlobalPosition(movingPlayerIdx, token.stepCount);
    const safeIndices = [0, 8, 13, 21, 26, 34, 39, 47];

    if (finalPos.type === 'TRACK' && !safeIndices.includes(finalPos.idx)) {
      const opponentIdx = movingPlayerIdx === 0 ? 1 : 0;
      const opponent = this.players[opponentIdx];

      opponent.tokens.forEach(opToken => {
        if (opToken.status === 'IN_TRACK') {
          const opPos = this.getGlobalPosition(opponentIdx, opToken.stepCount);
          if (opPos.type === 'TRACK' && opPos.idx === finalPos.idx) {
            opToken.status = 'HOME_BASE';
            opToken.stepCount = 0;
            capturedToken = { playerIdx: opponentIdx, tokenId: opToken.id };
            this.hasExtraTurn = true;
          }
        }
      });
    }

    // Check Win
    const allFinished = player.tokens.every(t => t.status === 'FINISHED');
    if (allFinished) {
      this.winner = movingPlayerIdx;
    }

    const grantedExtraTurn = this.hasExtraTurn;
    this.diceRolled = false;
    this.hasExtraTurn = false;

    if (!grantedExtraTurn && this.winner === null) {
      this.turn = movingPlayerIdx === 0 ? 1 : 0;
    }

    return {
      playerIdx: movingPlayerIdx, // Correctly returns player who moved!
      tokenId,
      trajectory: pathTrajectory,
      capturedToken,
      nextTurn: this.turn,
      grantedExtraTurn,
      winner: this.winner
    };
  }

  passTurn() {
    this.diceRolled = false;
    this.hasExtraTurn = false;
    this.turn = this.turn === 0 ? 1 : 0;
    return this.turn;
  }
}
