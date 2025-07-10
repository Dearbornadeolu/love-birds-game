import React, { useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

const ConnectFour = ({ gameState, onMove, playerRole, isComputerMode }) => {
  const { board, turn } = gameState;

  const checkWinner = (board) => {
    // Check horizontal
    for (let r = 0; r < 6; r++) {
      for (let c = 0; c < 4; c++) {
        if (
          board[r][c] &&
          board[r][c] === board[r][c + 1] &&
          board[r][c] === board[r][c + 2] &&
          board[r][c] === board[r][c + 3]
        ) {
          return board[r][c];
        }
      }
    }

    // Check vertical
    for (let c = 0; c < 7; c++) {
      for (let r = 0; r < 3; r++) {
        if (
          board[r][c] &&
          board[r][c] === board[r + 1][c] &&
          board[r][c] === board[r + 2][c] &&
          board[r][c] === board[r + 3][c]
        ) {
          return board[r][c];
        }
      }
    }

    // Check diagonal (positive slope)
    for (let r = 0; r < 3; r++) {
      for (let c = 0; c < 4; c++) {
        if (
          board[r][c] &&
          board[r][c] === board[r + 1][c + 1] &&
          board[r][c] === board[r + 2][c + 2] &&
          board[r][c] === board[r + 3][c + 3]
        ) {
          return board[r][c];
        }
      }
    }

    // Check diagonal (negative slope)
    for (let r = 3; r < 6; r++) {
      for (let c = 0; c < 4; c++) {
        if (
          board[r][c] &&
          board[r][c] === board[r - 1][c + 1] &&
          board[r][c] === board[r - 2][c + 2] &&
          board[r][c] === board[r - 3][c + 3]
        ) {
          return board[r][c];
        }
      }
    }

    return board[0].every(cell => cell) ? 'Draw' : null;
  };

  const makeComputerMove = () => {
    if (!isComputerMode || turn === playerRole || checkWinner(board)) return;

    const opponent = playerRole === 'R' ? 'Y' : 'R';
    const newBoard = board.map(row => [...row]);
    let move = -1;

    // Check for winning move
    for (let c = 0; c < 7; c++) {
      let r = -1;
      for (let row = 5; row >= 0; row--) {
        if (!newBoard[row][c]) {
          r = row;
          break;
        }
      }
      if (r !== -1) {
        newBoard[r][c] = opponent;
        if (checkWinner(newBoard) === opponent) {
          move = c;
          break;
        }
        newBoard[r][c] = null;
      }
    }

    // Check for blocking player's win
    if (move === -1) {
      for (let c = 0; c < 7; c++) {
        let r = -1;
        for (let row = 5; row >= 0; row--) {
          if (!newBoard[row][c]) {
            r = row;
            break;
          }
        }
        if (r !== -1) {
          newBoard[r][c] = playerRole;
          if (checkWinner(newBoard) === playerRole) {
            move = c;
            newBoard[r][c] = opponent;
            break;
          }
          newBoard[r][c] = null;
        }
      }
    }

    // Choose random valid move
    if (move === -1) {
      const available = [];
      for (let c = 0; c < 7; c++) {
        if (!newBoard[0][c]) {
          available.push(c);
        }
      }
      if (available.length > 0) {
        move = available[Math.floor(Math.random() * available.length)];
        let r = -1;
        for (let row = 5; row >= 0; row--) {
          if (!newBoard[row][move]) {
            r = row;
            break;
          }
        }
        newBoard[r][move] = opponent;
      }
    }

    if (move !== -1) {
      onMove({ ...gameState, board: newBoard, turn: playerRole });
    }
  };

  useEffect(() => {
    if (isComputerMode && turn !== playerRole) {
      const timer = setTimeout(makeComputerMove, 500); // Delay for natural feel
      return () => clearTimeout(timer);
    }
  }, [turn, isComputerMode]);

  const handlePress = (col) => {
    if (checkWinner(board) || turn !== playerRole) return;

    let row = -1;
    for (let r = 5; r >= 0; r--) {
      if (!board[r][col]) {
        row = r;
        break;
      }
    }
    if (row === -1) return;

    const newBoard = board.map(row => [...row]);
    newBoard[row][col] = turn;
    const nextTurn = turn === 'R' ? 'Y' : 'R';
    onMove({ ...gameState, board: newBoard, turn: nextTurn });
  };

  const winner = checkWinner(board);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Connect Four</Text>
        {!winner && (
          <Text style={styles.turnText}>
            Current Turn: <Text style={[styles.player, turn === 'R' ? styles.playerR : styles.playerY]}>{turn}</Text>
            {turn === playerRole ? ' (Your Turn)' : isComputerMode ? ' (Computer\'s Turn)' : ''}
          </Text>
        )}
      </View>

      <View style={styles.board}>
        {board.map((row, rowIndex) => (
          <View key={rowIndex} style={styles.row}>
            {row.map((cell, colIndex) => {
              const isDisabled = !!board[0][colIndex] || !!winner || turn !== playerRole;
              return (
                <TouchableOpacity
                  key={colIndex}
                  style={[
                    styles.cell,
                    colIndex !== 6 && styles.cellBorderRight,
                    rowIndex !== 5 && styles.cellBorderBottom,
                    turn === playerRole && !board[0][colIndex] && !winner && styles.cellActive,
                    board[0][colIndex] && styles.cellDisabled,
                  ]}
                  onPress={() => handlePress(colIndex)}
                  disabled={isDisabled}
                >
                  <Text
                    style={[
                      styles.cellContent,
                      cell === 'R' ? styles.playerR : cell === 'Y' ? styles.playerY : null,
                    ]}
                  >
                    {cell === 'R' ? '🔴' : cell === 'Y' ? '🟡' : ''}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        ))}
      </View>

      {winner && (
        <View style={styles.resultContainer}>
          <Text style={styles.resultText}>
            {winner === 'Draw' ? '🤝 It\'s a Draw!' : `🎉 ${winner === playerRole ? 'You Win!' : 'Computer Wins!'}`}
          </Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#f8f9fa',
    borderRadius: 20,
    margin: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  header: {
    alignItems: 'center',
    marginBottom: 30,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 10,
  },
  turnText: {
    fontSize: 18,
    color: '#34495e',
    fontWeight: '600',
  },
  player: {
    fontWeight: 'bold',
    fontSize: 20,
  },
  playerR: {
    color: '#e74c3c',
  },
  playerY: {
    color: '#f1c40f',
  },
  board: {
    backgroundColor: '#34495e',
    borderRadius: 15,
    padding: 5,
    width: 350,
  },
  row: {
    flexDirection: 'row',
  },
  cell: {
    width: 45,
    height: 45,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
    margin: 2,
    borderRadius: 22.5,
  },
  cellBorderRight: {},
  cellBorderBottom: {},
  cellActive: {
    backgroundColor: '#e8f4f8',
  },
  cellDisabled: {
    backgroundColor: '#dfe6e9',
    opacity: 0.6,
  },
  cellContent: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  resultContainer: {
    marginTop: 30,
    padding: 20,
    backgroundColor: '#27ae60',
    borderRadius: 15,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  resultText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ffffff',
    textAlign: 'center',
  },
});

export default React.memo(ConnectFour);