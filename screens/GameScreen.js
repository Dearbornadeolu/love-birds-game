import React, { useState, useEffect } from 'react';
import { View, TouchableOpacity, Text, StyleSheet, ScrollView } from 'react-native';
import TicTacToe from '../components/TicTacToe';
import ConnectFour from '../components/ConnectFour';
import io from 'socket.io-client';

const socket = io('http://172.20.10.9:3000', {
    reconnection: true,
    reconnectionAttempts: 5,
    reconnectionDelay: 1000,
    timeout: 10000,
});

export default function GameScreen({ route }) {
    const { roomCode, isHost } = route.params || { roomCode: null, isHost: false };
    const [game, setGame] = useState(null);
    const [isConnected, setIsConnected] = useState(socket.connected);
    const [connectionError, setConnectionError] = useState(null);
    const [gameMode, setGameMode] = useState('multiplayer'); // Default to multiplayer

    const getPlayerRole = (gameType, isHost) => {
        if (gameType === 'tictactoe') {
            return isHost ? 'X' : 'O';
        } else if (gameType === 'connectfour') {
            return isHost ? 'R' : 'Y';
        }
        return isHost ? 'X' : 'O'; // fallback
    };

    const [playerRole, setPlayerRole] = useState(getPlayerRole('tictactoe', isHost));

    useEffect(() => {
        if (game && game.type) {
            const newRole = getPlayerRole(game.type, isHost);
            console.log('GameScreen: Setting player role', {
                gameType: game.type,
                isHost,
                newRole,
                oldRole: playerRole,
            });
            setPlayerRole(newRole);
        }
    }, [game?.type, isHost]);

    useEffect(() => {
        if (gameMode === 'computer') return;
    
        socket.on('connect', () => {
            console.log('Connected to server, joining room:', roomCode);
            setIsConnected(true);
            setConnectionError(null);
            socket.emit('join-room', roomCode);
        });
    
        socket.on('join-room-response', (response) => {
            console.log('Join room response:', response);
            if (!response.success) {
                setConnectionError('Failed to join room: ' + response.message);
            }
        });
    
        socket.on('start-game', (gameState) => {
            console.log('Received start-game:', gameState);
            setGame(gameState);
        });
    
        socket.on('game-update', (gameState) => {
            console.log('Received game-update:', gameState);
            setGame(gameState);
        });
    
        socket.on('connect_error', (error) => {
            console.error('Connection error:', error.message);
            setIsConnected(false);
            setConnectionError(error.message);
        });
    
        socket.on('disconnect', (reason) => {
            console.log('Disconnected:', reason);
            setIsConnected(false);
            if (reason === 'io server disconnect') {
                socket.connect();
            }
        });
    
        socket.on('player-disconnected', () => {
            setGame(null);
            setConnectionError('Other player disconnected');
        });
    
        return () => {
            socket.off('connect');
            socket.off('join-room-response');
            socket.off('start-game');
            socket.off('game-update');
            socket.off('connect_error');
            socket.off('disconnect');
            socket.off('player-disconnected');
        };
    }, [roomCode, gameMode]);

    const startGame = (gameType) => {
        if (gameMode === 'multiplayer' && (!isConnected || !isHost)) return;

        const initialState = gameType === 'tictactoe'
            ? { board: Array(9).fill(null), turn: 'X', host: 'X', guest: 'O' }
            : { board: Array(6).fill().map(() => Array(7).fill(null)), turn: 'R', host: 'R', guest: 'Y' };

        const newGameState = { type: gameType, ...initialState };

        console.log('GameScreen: Starting game', {
            gameType,
            initialState,
            newGameState,
            isHost,
            gameMode,
            currentPlayerRole: playerRole,
        });

        if (gameMode === 'multiplayer') {
            
            socket.emit('start-game', { roomCode, gameState: newGameState });
        }
        setGame(newGameState);

        const newRole = getPlayerRole(gameType, isHost);
        setPlayerRole(newRole);
    };

    const handleMove = (newState) => {
        console.log('GameScreen: Handling move', { newState, gameMode, playerRole, oldState: game });
    
        // Allow player moves in multiplayer mode when it's their turn and connected
        if (gameMode === 'multiplayer' && (!isConnected || game.turn !== playerRole)) {
            console.log('Move blocked in multiplayer mode', { gameMode, isConnected, gameTurn: game.turn, playerRole });
            return;
        }
        // Allow moves in computer mode (both player and computer moves)
        if (gameMode === 'computer') {
            setGame(newState);
            return;
        }
    
        // For multiplayer mode, update state and emit move
        setGame(newState);
        if (gameMode === 'multiplayer') {
            socket.emit('game-move', { roomCode, gameState: newState });
        }
    };

    const resetGame = () => {
        if ((isHost || gameMode === 'computer') && (isConnected || gameMode === 'computer')) {
            const initialState = game.type === 'tictactoe'
                ? { board: Array(9).fill(null), turn: 'X', host: 'X', guest: 'O' }
                : { board: Array(6).fill().map(() => Array(7).fill(null)), turn: 'R', host: 'R', guest: 'Y' };
            const newGameState = { type: game.type, ...initialState };
            if (gameMode === 'multiplayer') {
               
                socket.emit('start-game', { roomCode, gameState: newGameState });
            }
            setGame(newGameState);
        }
    };

    // Alternative: Simple button-based mode selector
    const renderModeSelector = () => (
        <View style={styles.modeSelector}>
            <Text style={styles.modeLabel}>Game Mode:</Text>
            <View style={styles.modeButtons}>
                <TouchableOpacity
                    style={[
                        styles.modeButton,
                        gameMode === 'multiplayer' && styles.modeButtonActive
                    ]}
                    onPress={() => {
                        setGameMode('multiplayer');
                        setGame(null);
                        setConnectionError(null);
                    }}
                >
                    <Text style={[
                        styles.modeButtonText,
                        gameMode === 'multiplayer' && styles.modeButtonTextActive
                    ]}>
                        👥 Multiplayer
                    </Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[
                        styles.modeButton,
                        gameMode === 'computer' && styles.modeButtonActive
                    ]}
                    onPress={() => {
                        setGameMode('computer');
                        setGame(null);
                        setConnectionError(null);
                    }}
                >
                    <Text style={[
                        styles.modeButtonText,
                        gameMode === 'computer' && styles.modeButtonTextActive
                    ]}>
                        🤖 Computer
                    </Text>
                </TouchableOpacity>
            </View>
        </View>
    );

    return (
        <ScrollView contentContainerStyle={styles.container}>
            <View style={styles.header}>
                <Text style={styles.title}>🎮 Game Room</Text>

                {renderModeSelector()}

                {gameMode === 'multiplayer' && (
                    <View style={styles.roomInfo}>
                        <Text style={styles.roomCode}>Room: {roomCode || 'Not joined'}</Text>
                        {roomCode && (
                            <TouchableOpacity style={styles.copyButton} onPress={() => {
                                navigator.clipboard.writeText(roomCode);
                                alert('Room code copied to clipboard!');
                            }}>
                                <Text style={styles.copyButtonText}>📋 Copy</Text>
                            </TouchableOpacity>
                        )}
                        <View style={[styles.statusIndicator, isConnected ? styles.connected : styles.disconnected]}>
                            <Text style={styles.statusText}>
                                {isConnected ? '🟢 Connected' : '🔴 Disconnected'}
                            </Text>
                        </View>
                    </View>
                )}
                {gameMode === 'multiplayer' && connectionError && (
                    <Text style={styles.errorText}>Error: {connectionError}</Text>
                )}
                <Text style={styles.roleText}>
                    {gameMode === 'computer'
                        ? `🤖 Playing against Computer (${playerRole})`
                        : isHost
                            ? `👑 You are the host (${playerRole})`
                            : `👥 You are the guest (${playerRole})`
                    }
                </Text>
            </View>

            {!game && (isHost || gameMode === 'computer') && (
                <View style={styles.gameSelection}>
                    <Text style={styles.selectionTitle}>Choose a Game to Play</Text>
                    <View style={styles.gameButtons}>
                        <TouchableOpacity
                            style={[styles.gameButton, styles.ticTacToeButton, gameMode === 'multiplayer' && !isConnected && styles.disabledButton]}
                            onPress={() => startGame('tictactoe')}
                            disabled={gameMode === 'multiplayer' && !isConnected}
                        >
                            <Text style={styles.gameButtonEmoji}>⭕</Text>
                            <Text style={styles.gameButtonTitle}>Tic-Tac-Toe</Text>
                            <Text style={styles.gameButtonDescription}>
                                Classic 3x3 grid game
                            </Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[styles.gameButton, styles.connectFourButton, gameMode === 'multiplayer' && !isConnected && styles.disabledButton]}
                            onPress={() => startGame('connectfour')}
                            disabled={gameMode === 'multiplayer' && !isConnected}
                        >
                            <Text style={styles.gameButtonEmoji}>🔴</Text>
                            <Text style={styles.gameButtonTitle}>Connect Four</Text>
                            <Text style={styles.gameButtonDescription}>
                                Drop pieces to connect four
                            </Text>
                        </TouchableOpacity>
                    </View>
                </View>
            )}

            {!game && !isHost && gameMode === 'multiplayer' && (
                <View style={styles.waitingContainer}>
                    <Text style={styles.waitingEmoji}>⏳</Text>
                    <Text style={styles.waitingText}>
                        {isConnected ? 'Waiting for host to start the game...' : 'Connecting to server...'}
                    </Text>
                    <View style={styles.loadingDots}>
                        <View style={[styles.dot, styles.dot1]} />
                        <View style={[styles.dot, styles.dot2]} />
                        <View style={[styles.dot, styles.dot3]} />
                    </View>
                </View>
            )}

            {game && (
                <View style={styles.gameContainer}>
                    <View style={styles.gameHeader}>
                        <Text style={styles.gameTitle}>
                            {game.type === 'tictactoe' ? '⭕ Tic-Tac-Toe' : '🔴 Connect Four'}
                        </Text>
                        {(isHost || gameMode === 'computer') && (
                            <TouchableOpacity
                                style={[styles.resetButton, gameMode === 'multiplayer' && !isConnected && styles.disabledButton]}
                                onPress={resetGame}
                                disabled={gameMode === 'multiplayer' && !isConnected}
                            >
                                <Text style={styles.resetButtonText}>🔄 New Game</Text>
                            </TouchableOpacity>
                        )}
                    </View>

                    {game.type === 'tictactoe' && (
                        <TicTacToe
                            gameState={game}
                            onMove={handleMove}
                            playerRole={playerRole}
                            isComputerMode={gameMode === 'computer'}
                        />
                    )}
                    {game.type === 'connectfour' && (
                        <ConnectFour
                            gameState={game}
                            onMove={handleMove}
                            playerRole={playerRole}
                            isComputerMode={gameMode === 'computer'}
                        />
                    )}
                </View>
            )}
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flexGrow: 1,
        backgroundColor: '#f8f9fa',
        padding: 20,
    },
    header: {
        alignItems: 'center',
        marginTop: 20,
        marginBottom: 30,
    },
    title: {
        fontSize: 32,
        fontWeight: 'bold',
        color: '#2c3e50',
        marginBottom: 15,
    },
    modeSelector: {
        alignItems: 'center',
        marginBottom: 15,
    },
    modeLabel: {
        fontSize: 16,
        fontWeight: '600',
        color: '#2c3e50',
        marginBottom: 10,
    },
    modeButtons: {
        flexDirection: 'row',
        backgroundColor: '#ecf0f1',
        borderRadius: 25,
        padding: 4,
    },
    modeButton: {
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderRadius: 20,
        marginHorizontal: 2,
    },
    modeButtonActive: {
        backgroundColor: '#3498db',
    },
    modeButtonText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#7f8c8d',
    },
    modeButtonTextActive: {
        color: '#ffffff',
    },
    // Alternative styles for Picker if you want to keep it
    pickerContainer: {
        backgroundColor: '#ecf0f1',
        borderRadius: 10,
        overflow: 'hidden',
        minWidth: 150,
    },
    picker: {
        height: 50,
        color: '#2c3e50',
    },
    roomInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 10,
        flexWrap: 'wrap',
        justifyContent: 'center',
    },
    roomCode: {
        fontSize: 18,
        fontWeight: '600',
        color: '#34495e',
        backgroundColor: '#ecf0f1',
        paddingHorizontal: 15
    },
    statusIndicator: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 15,
    },
    connected: {
        backgroundColor: '#d5f4e6',
    },
    disconnected: {
        backgroundColor: '#ffeaa7',
    },
    statusText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#2c3e50',
    },
    errorText: {
        fontSize: 14,
        color: '#e74c3c',
        marginBottom: 10,
        textAlign: 'center',
    },
    roleText: {
        fontSize: 16,
        color: '#7f8c8d',
        fontStyle: 'italic',
    },
    gameSelection: {
        alignItems: 'center',
    },
    selectionTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#2c3e50',
        marginBottom: 30,
    },
    gameButtons: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        width: '100%',
    },
    gameButton: {
        flex: 1,
        alignItems: 'center',
        padding: 25,
        borderRadius: 20,
        margin: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 5,
    },
    ticTacToeButton: {
        backgroundColor: '#ffffff',
    },
    connectFourButton: {
        backgroundColor: '#ffffff',
    },
    disabledButton: {
        backgroundColor: '#dfe6e9',
        opacity: 0.6,
    },
    gameButtonEmoji: {
        fontSize: 40,
        marginBottom: 10,
    },
    gameButtonTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#2c3e50',
        marginBottom: 8,
    },
    gameButtonDescription: {
        fontSize: 14,
        color: '#7f8c8d',
        textAlign: 'center',
    },
    waitingContainer: {
        alignItems: 'center',
        padding: 40,
        backgroundColor: '#ffffff',
        borderRadius: 20,
        margin: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 5,
    },
    waitingEmoji: {
        fontSize: 60,
        marginBottom: 20,
    },
    waitingText: {
        fontSize: 18,
        color: '#7f8c8d',
        textAlign: 'center',
        marginBottom: 20,
    },
    loadingDots: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
    },
    dot: {
        width: 10,
        height: 10,
        borderRadius: 5,
        backgroundColor: '#3498db',
        marginHorizontal: 5,
    },
    dot1: {
        opacity: 0.4,
    },
    dot2: {
        opacity: 0.7,
    },
    dot3: {
        opacity: 1,
    },
    gameContainer: {
        alignItems: 'center',
    },
    gameHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        width: '100%',
        marginBottom: 20,
    },
    gameTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#2c3e50',
    },
    resetButton: {
        backgroundColor: '#e74c3c',
        paddingHorizontal: 15,
        paddingVertical: 8,
        borderRadius: 15,
    },
    resetButtonText: {
        color: '#ffffff',
        fontWeight: '600',
        fontSize: 14,
    },
    copyButton: {
        backgroundColor: '#3498db',
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 15,
        marginLeft: 10,
    },
    copyButtonText: {
        color: '#ffffff',
        fontWeight: '600',
        fontSize: 14,
    },
});