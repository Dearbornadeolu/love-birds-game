import React, { useState, useEffect } from 'react';
import { View, TextInput, TouchableOpacity, Text, StyleSheet, ScrollView, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function HomeScreen({ navigation }) {
  const [roomCode, setRoomCode] = useState('');
  const [username, setUsername] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [createdRoomCode, setCreatedRoomCode] = useState(null);
  const [ws, setWs] = useState(null);

  useEffect(() => {
    const loadUsername = async () => {
      const storedUsername = await AsyncStorage.getItem('username');
      if (storedUsername) setUsername(storedUsername);
    };
    loadUsername();

    const websocket = new WebSocket('http://172.20.10.9:3003');
    setWs(websocket);

    websocket.onopen = () => {
      console.log('Connected to WebSocket server');
    };

    websocket.onmessage = (event) => {
      const data = JSON.parse(event.data);
      console.log('Received:', data);

      switch (data.type) {
        case 'room_created':
          setIsLoading(false);
          setCreatedRoomCode(data.roomId);
          navigation.navigate('Game', {
            roomCode: data.roomId,
            isHost: true,
            username,
            playerId: data.playerId,
            playerNumber: data.playerNumber,
          });
          break;
        case 'room_joined':
          setIsLoading(false);
          navigation.navigate('Game', {
            roomCode: data.roomId,
            isHost: false,
            username,
            playerId: data.playerId,
            playerNumber: data.playerNumber,
            players: data.players,
            gameState: data.gameState,
          });
          break;
        case 'error':
          setIsLoading(false);
          setError(data.message);
          break;
      }
    };

    websocket.onclose = () => {
      console.log('Disconnected from WebSocket server');
      setWs(null);
      setError('Disconnected from server');
    };

    websocket.onerror = (error) => {
      console.error('WebSocket error:', error);
      setIsLoading(false);
      setError('Connection error. Please try again.');
    };

    return () => {
      websocket.close();
    };
  }, [navigation, username]);

  const createRoom = async () => {
    if (!username.trim()) {
      setError('Please enter a username');
      return;
    }
    if (!ws || ws.readyState !== WebSocket.OPEN) {
      setError('Not connected to server');
      return;
    }
    setIsLoading(true);
    setError('');
    await AsyncStorage.setItem('username', username.trim());
    ws.send(JSON.stringify({
      type: 'create_room',
      username: username.trim(),
      game: 'connect4',
    }));
  };

  const joinRoom = async () => {
    if (!username.trim()) {
      setError('Please enter a username');
      return;
    }
    if (!roomCode.trim()) {
      setError('Please enter a room code');
      return;
    }
    if (roomCode === createdRoomCode) {
      setError('You cannot join your own room');
      return;
    }
    if (!ws || ws.readyState !== WebSocket.OPEN) {
      setError('Not connected to server');
      return;
    }
    setIsLoading(true);
    setError('');
    await AsyncStorage.setItem('username', username.trim());
    ws.send(JSON.stringify({
      type: 'join_room',
      roomId: roomCode.trim().toUpperCase(),
      username: username.trim(),
    }));
  };

  const handleLogout = async () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to log out? This will clear your username and disconnect you.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            await AsyncStorage.removeItem('username');
            setUsername('');
            setRoomCode('');
            setCreatedRoomCode(null);
            setError('');
            if (ws) ws.close();
          },
        },
      ]
    );
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>🎮 Game Hub</Text>
        <Text style={styles.subtitle}>Play Connect Four with friends online</Text>
      </View>

      <View style={styles.cardContainer}>
        <View style={styles.card}>
          <Text style={styles.cardTitle}>👤 Username</Text>
          <TextInput
            placeholder="Enter Your Username"
            value={username}
            onChangeText={(text) => {
              setUsername(text);
              setError('');
            }}
            style={styles.input}
            placeholderTextColor="#7f8c8d"
            maxLength={20}
            autoCapitalize="none"
          />
          {username.trim() && (
            <TouchableOpacity
              style={[styles.button, styles.logoutButton]}
              onPress={handleLogout}
            >
              <Text style={[styles.buttonText, styles.logoutButtonText]}>🚪 Logout</Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>🚀 Create New Room</Text>
          <Text style={styles.cardDescription}>Start a new Connect Four game and invite friends</Text>
          <TouchableOpacity
            style={[styles.button, styles.primaryButton, isLoading && styles.disabledButton]}
            onPress={createRoom}
            disabled={isLoading}
          >
            <Text style={styles.buttonText}>{isLoading ? 'Creating...' : 'Create Game Room'}</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.divider}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>OR</Text>
          <View style={styles.dividerLine} />
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>🎯 Join Existing Room</Text>
          <Text style={styles.cardDescription}>Enter a room code to join a game</Text>
          <TextInput
            placeholder="Enter Room Code"
            value={roomCode}
            onChangeText={(text) => {
              setRoomCode(text.toUpperCase());
              setError('');
            }}
            style={styles.input}
            placeholderTextColor="#7f8c8d"
            maxLength={6}
            autoCapitalize="characters"
          />
          <TouchableOpacity
            style={[styles.button, styles.secondaryButton, (isLoading || !roomCode.trim()) && styles.disabledButton]}
            onPress={joinRoom}
            disabled={isLoading || !roomCode.trim()}
          >
            <Text style={[styles.buttonText, styles.secondaryButtonText]}>
              {isLoading ? 'Joining...' : 'Join Game Room'}
            </Text>
          </TouchableOpacity>
        </View>

        {error && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>❌ {error}</Text>
          </View>
        )}
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>Connect with friends and enjoy multiplayer games!</Text>
      </View>
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
    marginTop: 40,
    marginBottom: 40,
  },
  title: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 18,
    color: '#7f8c8d',
    textAlign: 'center',
  },
  cardContainer: {
    flex: 1,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 30,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  cardTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 10,
    textAlign: 'center',
  },
  cardDescription: {
    fontSize: 16,
    color: '#7f8c8d',
    textAlign: 'center',
    marginBottom: 25,
    lineHeight: 22,
  },
  input: {
    borderWidth: 2,
    borderColor: '#e0e0e0',
    borderRadius: 15,
    padding: 15,
    fontSize: 18,
    marginBottom: 20,
    backgroundColor: '#f8f9fa',
    textAlign: 'center',
    fontWeight: '600',
    color: '#2c3e50',
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
  primaryButton: {
    backgroundColor: '#3498db',
  },
  secondaryButton: {
    backgroundColor: '#ffffff',
    borderWidth: 2,
    borderColor: '#3498db',
  },
  buttonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  secondaryButtonText: {
    color: '#3498db',
  },
  logoutButton: {
    backgroundColor: '#e74c3c',
    marginTop: 10,
  },
  logoutButtonText: {
    color: '#ffffff',
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 20,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#e0e0e0',
  },
  dividerText: {
    marginHorizontal: 15,
    fontSize: 16,
    color: '#7f8c8d',
    fontWeight: '600',
  },
  errorContainer: {
    backgroundColor: '#ffebee',
    borderRadius: 15,
    padding: 15,
    marginTop: 10,
    borderLeftWidth: 4,
    borderLeftColor: '#e74c3c',
  },
  errorText: {
    fontSize: 16,
    color: '#c62828',
    textAlign: 'center',
    fontWeight: '600',
  },
  footer: {
    alignItems: 'center',
    marginTop: 30,
    paddingTop: 20,
  },
  footerText: {
    fontSize: 16,
    color: '#7f8c8d',
    textAlign: 'center',
    fontStyle: 'italic',
  },
});