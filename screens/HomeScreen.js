import React, { useState } from 'react';
import { View, TextInput, TouchableOpacity, Text, StyleSheet, ScrollView } from 'react-native';
import io from 'socket.io-client';
import AsyncStorage from '@react-native-async-storage/async-storage';

const socket = io('http://172.20.10.9:3000'); // Replace with your server URL

export default function HomeScreen({ navigation }) {
  const [roomCode, setRoomCode] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const createRoom = async () => {
    setIsLoading(true);
    setError('');
    const sessionId = await AsyncStorage.getItem('sessionId') || Math.random().toString();
    await AsyncStorage.setItem('sessionId', sessionId);
    socket.emit('create-room');
    socket.on('room-created', (code) => {
      setIsLoading(false);
      navigation.navigate('Game', { roomCode: code, isHost: true });
    });
  };

  const joinRoom = () => {
    if (!roomCode.trim()) {
      setError('Please enter a room code');
      return;
    }
    setIsLoading(true);
    setError('');
    socket.emit('join-room', roomCode);
    socket.on('start-game', () => {
      setIsLoading(false);
      navigation.navigate('Game', { roomCode, isHost: false });
    });
    socket.on('error', (msg) => {
      setIsLoading(false);
      setError(msg);
    });
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>🎮 Game Hub</Text>
        <Text style={styles.subtitle}>Play games with friends online</Text>
      </View>

      <View style={styles.cardContainer}>
        <View style={styles.card}>
          <Text style={styles.cardTitle}>🚀 Create New Room</Text>
          <Text style={styles.cardDescription}>
            Start a new game room and invite friends to join
          </Text>
          <TouchableOpacity 
            style={[styles.button, styles.primaryButton]} 
            onPress={createRoom}
            disabled={isLoading}
          >
            <Text style={styles.buttonText}>
              {isLoading ? 'Creating...' : 'Create Game Room'}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.divider}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>OR</Text>
          <View style={styles.dividerLine} />
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>🎯 Join Existing Room</Text>
          <Text style={styles.cardDescription}>
            Enter a room code to join an existing game
          </Text>
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
            style={[styles.button, styles.secondaryButton]} 
            onPress={joinRoom}
            disabled={isLoading || !roomCode.trim()}
          >
            <Text style={[styles.buttonText, styles.secondaryButtonText]}>
              {isLoading ? 'Joining...' : 'Join Game Room'}
            </Text>
          </TouchableOpacity>
        </View>

        {error ? (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>❌ {error}</Text>
          </View>
        ) : null}
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>
          Connect with friends and enjoy multiplayer games!
        </Text>
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