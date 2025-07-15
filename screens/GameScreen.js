import React, { useState, useEffect } from 'react';
import { View, TouchableOpacity, Text, StyleSheet, ScrollView, Clipboard } from 'react-native';
import ConnectFour from '../components/ConnectFour';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert } from 'react-native';

export default function GameScreen({ route, navigation }) {
  const { roomCode, isHost, username, playerId, playerNumber, players: initialPlayers, gameState: initialGameState } = route.params || {};
  const [gameState, setGameState] = useState(initialGameState || {
    board: Array(6).fill(null).map(() => Array(7).fill(null)),
    currentPlayer: 1,
    winner: null,
    gameOver: false,
    moves: [],
  });
  const [players, setPlayers] = useState(initialPlayers || []);
  const [isConnected, setIsConnected] = useState(false);
  const [connectionError, setConnectionError] = useState(null);
  const [ws, setWs] = useState(null);

  useEffect(() => {
    const websocket = new WebSocket('http://172.20.10.9:3003');
    setWs(websocket);

    websocket.onopen = () => {
      console.log('Connected to WebSocket server');
      setIsConnected(true);
      setConnectionError(null);
      if (roomCode) {
        websocket.send(JSON.stringify({
          type: 'join_room',
          roomId: roomCode,
          username,
        }));
      }
    };

    websocket.onmessage = (event) => {
      const data = JSON.parse(event.data);
      console.log('Received:', data);

      switch (data.type) {
        case 'game_start':
          setGameState({ ...gameState, currentPlayer: data.currentPlayer });
          break;
        case 'game_move':
          setGameState(data.gameState);
          setPlayers(data.players || players);
          break;
        case 'game_reset':
          setGameState(data.gameState);
          setConnectionError(null);
          break;
        case 'player_joined':
          setPlayers(data.players);
          break;
        case 'player_left':
          setPlayers(data.players);
          setConnectionError(`Player ${data.playerName} left the game`);
          break;
        case 'game_over_timeout':
          setGameState(data.gameState);
          setConnectionError(`Player ${data.winner === playerNumber ? 'You' : getPlayerName(data.winner)} won due to timeout!`);
          break;
        case 'game_over_disconnect':
          setGameState(data.gameState);
          setConnectionError(`Player ${data.winner === playerNumber ? 'You' : getPlayerName(data.winner)} won due to opponent disconnect!`);
          break;
        case 'error':
          setConnectionError(data.message);
          break;
      }
    };

    websocket.onclose = () => {
      console.log('Disconnected from WebSocket server');
      setIsConnected(false);
      setConnectionError('Disconnected from server');
    };

    websocket.onerror = (error) => {
      console.error('WebSocket error:', error);
      setIsConnected(false);
      setConnectionError('Connection error. Please try again.');
    };

    return () => {
      websocket.close();
    };
  }, [roomCode, username, playerNumber]);

  const getPlayerName = (playerNum) => {
    const player = players.find((p) => p.playerNumber === playerNum);
    return player ? player.username : `Player ${playerNum}`;
  };

  const handleMove = (newState) => {
    if (!isConnected || gameState.currentPlayer !== playerNumber || gameState.gameOver) {
      setConnectionError('Not your turn or game is over');
      return;
    }
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({
        type: 'game_move',
        column: newState.column,
      }));
    }
  };

  const resetGame = () => {
    if (isHost && isConnected && ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({
        type: 'game_reset',
      }));
    }
  };

  const handleLogout = async () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to log out? This will leave the game and clear your username.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            await AsyncStorage.removeItem('username');
            if (ws) {
              ws.send(JSON.stringify({
                type: 'leave_room',
              }));
              ws.close();
            }
            navigation.navigate('Home');
          },
        },
      ]
    );
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>🎮 Connect Four</Text>
        <View style={styles.roomInfo}>
          <Text style={styles.roomCode}>Room: {roomCode || 'Not joined'}</Text>
          {roomCode && (
            <TouchableOpacity
              style={styles.copyButton}
              onPress={() => {
                Clipboard.setString(roomCode);
                Alert.alert('Success', 'Room code copied to clipboard!');
              }}
            >
              <Text style={styles.copyButtonText}>📋 Copy</Text>
            </TouchableOpacity>
          )}
          <View style={[styles.statusIndicator, isConnected ? styles.connected : styles.disconnected]}>
            <Text style={styles.statusText}>{isConnected ? '🟢 Connected' : '🔴 Disconnected'}</Text>
          </View>
        </View>
        {connectionError && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>❌ {connectionError}</Text>
            <TouchableOpacity
              style={styles.errorCloseButton}
              onPress={() => setConnectionError(null)}
            >
              <Text style={styles.errorCloseButtonText}>×</Text>
            </TouchableOpacity>
          </View>
        )}
        <Text style={styles.roleText}>
          {isHost ? `👑 ${username} (Host, Player ${playerNumber})` : `👥 ${username} (Guest, Player ${playerNumber})`}
        </Text>
        <TouchableOpacity
          style={[styles.button, styles.logoutButton]}
          onPress={handleLogout}
        >
          <Text style={[styles.buttonText, styles.logoutButtonText]}>🚪 Logout</Text>
        </TouchableOpacity>
      </View>

      {gameState && (
        <View style={styles.gameContainer}>
          <View style={styles.gameHeader}>
            <Text style={styles.gameTitle}>🔴 Connect Four</Text>
            {isHost && (
              <TouchableOpacity
                style={[styles.resetButton, !isConnected && styles.disabledButton]}
                onPress={resetGame}
                disabled={!isConnected}
              >
                <Text style={styles.resetButtonText}>🔄 New Game</Text>
              </TouchableOpacity>
            )}
          </View>
          <ConnectFour
            gameState={gameState}
            onMove={handleMove}
            playerRole={playerNumber}
            players={players}
            isComputerMode={false}
          />
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
    paddingHorizontal: 15,
    paddingVertical: 6,
    borderRadius: 10,
  },
  statusIndicator: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
    marginLeft: 10,
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
  errorContainer: {
    backgroundColor: '#ffebee',
    borderRadius: 15,
    padding: 15,
    marginTop: 10,
    borderLeftWidth: 4,
    borderLeftColor: '#e74c3c',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  errorText: {
    fontSize: 16,
    color: '#c62828',
    fontWeight: '600',
  },
  errorCloseButton: {
    padding: 5,
  },
  errorCloseButtonText: {
    fontSize: 20,
    color: '#c62828',
    fontWeight: 'bold',
  },
  roleText: {
    fontSize: 16,
    color: '#7f8c8d',
    fontStyle: 'italic',
    marginBottom: 10,
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
  button: {
    paddingVertical: 15,
    paddingHorizontal: 25,
    borderRadius: 15,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  logoutButton: {
    backgroundColor: '#e74c3c',
    marginTop: 10,
  },
  logoutButtonText: {
    color: '#ffffff',
  },
  disabledButton: {
    backgroundColor: '#dfe6e9',
    opacity: 0.6,
  },
});