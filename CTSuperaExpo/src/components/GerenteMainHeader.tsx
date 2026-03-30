import React from 'react';
import { View, Text, TouchableOpacity, Image, StyleSheet, Alert } from 'react-native';
import { PainelGerente } from '../types';
import CONFIG from '../config';
import { colors } from '../theme';

type Props = {
  painel: PainelGerente;
  onLogout: () => void;
};

function getInitials(name: string) {
  if (!name) return '?';
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

export default function GerenteMainHeader({ painel, onLogout }: Props) {
  const baseUrl = CONFIG.API_BASE_URL.replace('/api/', '');

  const handleLogout = () => {
    Alert.alert('Sair', 'Deseja realmente sair do aplicativo?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Sair', onPress: onLogout, style: 'destructive' },
    ]);
  };

  return (
    <View style={styles.mainHeader}>
      <View style={styles.headerContent}>
        <View style={styles.profilePhoto}>
          {painel.foto_perfil ? (
            <Image source={{ uri: `${baseUrl}${painel.foto_perfil}` }} style={styles.profileImageHeader} />
          ) : (
            <View style={styles.profileInitialsHeader}>
              <Text style={styles.profileInitialsTextHeader}>
                {getInitials(`${painel.first_name} ${painel.last_name}`)}
              </Text>
            </View>
          )}
        </View>
        <View style={styles.headerInfo}>
          <Text style={styles.headerName}>
            {painel.first_name} {painel.last_name}
          </Text>
          <Text style={styles.headerRole}>Gerente</Text>
        </View>
        <TouchableOpacity onPress={handleLogout} style={styles.logoutButton}>
          <Text style={styles.logoutText}>Sair</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  mainHeader: {
    backgroundColor: colors.primary,
    paddingVertical: 20,
    paddingHorizontal: 16,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  profilePhoto: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  profileImageHeader: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  profileInitialsHeader: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileInitialsTextHeader: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.primary,
  },
  headerInfo: {
    flex: 1,
  },
  headerName: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  headerRole: {
    color: '#fff',
    fontSize: 14,
    opacity: 0.8,
  },
  logoutButton: {
    padding: 8,
  },
  logoutText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
});
