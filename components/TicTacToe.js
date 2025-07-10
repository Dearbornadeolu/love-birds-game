import React, { useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

const TicTacToe = ({ gameState, onMove, playerRole, isComputerMode }) => {
    const { board, turn } = gameState;

    // Add debug logging
    console.log('TicTacToe Debug:', {
        gameState,
        playerRole,
        isComputerMode,
        turn,
        board,
        canPlayerMove: turn === playerRole
    });

    const checkWinner = (board) => {
        const wins = [
            [0, 1, 2], [3, 4, 5], [6, 7, 8],
            [0, 3, 6], [1, 4, 7], [2, 5, 8],
            [0, 4, 8], [2, 4, 6],
        ];
        for (let [a, b, c] of wins) {
            if (board[a] && board[a] === board[b] && board[a] === board[c]) return board[a];
        }
        return board.every(cell => cell) ? 'Draw' : null;
    };

    const makeComputerMove = () => {
        console.log('makeComputerMove called', { isComputerMode, turn, playerRole, board, winner: checkWinner(board) });
        if (!isComputerMode || turn === playerRole || checkWinner(board)) return;

        const opponent = playerRole === 'X' ? 'O' : 'X';
        const newBoard = [...board];
        let move = -1;

        // Check for winning move
        for (let i = 0; i < 9; i++) {
            if (!newBoard[i]) {
                newBoard[i] = opponent;
                if (checkWinner(newBoard) === opponent) {
                    move = i;
                    break;
                }
                newBoard[i] = null;
            }
        }

        // Check for blocking player's win
        if (move === -1) {
            for (let i = 0; i < 9; i++) {
                if (!newBoard[i]) {
                    newBoard[i] = playerRole;
                    if (checkWinner(newBoard) === playerRole) {
                        move = i;
                        newBoard[i] = opponent;
                        break;
                    }
                    newBoard[i] = null;
                }
            }
        }

        // Choose center if available
        if (move === -1 && !newBoard[4]) {
            move = 4;
            newBoard[4] = opponent;
        }

        // Choose random available move
        if (move === -1) {
            const available = newBoard
                .map((cell, index) => (cell === null ? index : null))
                .filter(index => index !== null);
            if (available.length > 0) {
                move = available[Math.floor(Math.random() * available.length)];
                newBoard[move] = opponent;
            }
        }

        if (move !== -1) {
            const newState = { ...gameState, board: newBoard, turn: playerRole };
            console.log('Computer making move', { move, newBoard, newTurn: playerRole, newState });
            onMove(newState);
        } else {
            console.log('No valid move available for computer');
        }
    };

    useEffect(() => {
        console.log('TicTacToe props received', { gameState, playerRole, isComputerMode });
        if (isComputerMode && turn !== playerRole && !checkWinner(board)) {
            console.log('useEffect triggered for computer move', { turn, playerRole, board });
            const timer = setTimeout(makeComputerMove, 500);
            return () => clearTimeout(timer);
        }
    }, [gameState, isComputerMode, playerRole]);

    const handlePress = (index) => {
        if (board[index] || checkWinner(board) || turn !== playerRole) return;
        const newBoard = [...board];
        newBoard[index] = turn;
        const newState = { ...gameState, board: newBoard, turn: turn === 'X' ? 'O' : 'X' };
        console.log('Player move', { index, newBoard, newTurn: newState.turn, newState });
        onMove(newState);
    };

    const winner = checkWinner(board);

    return (
        <View style={styles.container}>
            {/* Add debug info for troubleshooting */}
            <View style={styles.debugContainer}>
                <Text style={styles.debugText}>
                    Debug: Player={playerRole}, Turn={turn}, CanMove={turn === playerRole ? 'Yes' : 'No'}
                </Text>
            </View>

            <View style={styles.header}>
                <Text style={styles.title}>Tic Tac Toe</Text>
                {!winner && (
                    <Text style={styles.turnText}>
                        Current Turn: <Text style={[styles.player, turn === 'X' ? styles.playerX : styles.playerO]}>{turn}</Text>
                        {turn === playerRole ? ' (Your Turn)' : isComputerMode ? ' (Computer\'s Turn)' : ' (Waiting for opponent)'}
                    </Text>
                )}
            </View>

            <View style={styles.board}>
                {board.map((cell, index) => (
                    <TouchableOpacity
                        key={index}
                        style={[
                            styles.cell,
                            index % 3 !== 2 && styles.cellBorderRight,
                            index < 6 && styles.cellBorderBottom,
                            turn === playerRole && !cell && !winner && styles.cellActive
                        ]}
                        onPress={() => handlePress(index)}
                        disabled={!!cell || !!winner || turn !== playerRole}
                    >
                        <Text style={[
                            styles.cellText,
                            cell === 'X' ? styles.playerX : styles.playerO
                        ]}>
                            {cell}
                        </Text>
                    </TouchableOpacity>
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
    debugContainer: {
        backgroundColor: '#ffeb3b',
        padding: 10,
        borderRadius: 5,
        marginBottom: 10,
    },
    debugText: {
        fontSize: 12,
        color: '#333',
        fontWeight: 'bold',
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
    playerX: {
        color: '#e74c3c',
    },
    playerO: {
        color: '#3498db',
    },
    board: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        width: 300,
        height: 300,
        backgroundColor: '#34495e',
        borderRadius: 15,
        padding: 5,
    },
    cell: {
        width: 90,
        height: 90,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#ffffff',
        margin: 2,
        borderRadius: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    cellBorderRight: {},
    cellBorderBottom: {},
    cellText: {
        fontSize: 48,
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
    cellActive: {
        backgroundColor: '#e8f4f8',
    },
});

export default React.memo(TicTacToe);