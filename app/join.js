import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import TerminalView from '../components/TerminalView';
import { supabase } from '../lib/supabase';
import { colors } from '../lib/theme';

export default function Join() {
  const [code, setCode] = useState('');
  const [username, setUsername] = useState('');

  async function join() {
    const { data: game } = await supabase.from('games').select('*').eq('code', code.trim().toUpperCase()).maybeSingle();
    if (!game) return;

    const { data: player } = await supabase.from('players').insert({ game_id: game.id, username }).select().single();

    // stash in memory (MVP) via params; in production use secure store
    router.push({ pathname: '/lobby', params: { code: game.code, gid: game.id, pid: player.id }});
  }

  return (
    <TerminalView title="Join Game">
      <View style={styles.wrap}>
        <TextInput
          style={styles.input}
          placeholder="Join Code"
          placeholderTextColor={colors.gray}
          autoCapitalize="characters"
          value={code}
          onChangeText={setCode}
        />
        <TextInput
          style={styles.input}
          placeholder="Username"
          placeholderTextColor={colors.gray}
          value={username}
          onChangeText={setUsername}
        />
        <TouchableOpacity style={styles.btn} onPress={join}>
          <Text style={styles.btntxt}>Enter</Text>
        </TouchableOpacity>
      </View>
    </TerminalView>
  );
}
const styles = StyleSheet.create({
  wrap:{ flex:1, justifyContent:'center', gap:12 },
  input:{ color: colors.white, borderColor: colors.blue, borderWidth:2, padding:12, borderRadius:8,fontWeight: 'bold', fontSize: 18,fontFamily: 'Courier New Bold' },
  btn:{ backgroundColor:  'rgba(0, 255, 0, 0.7)', borderWidth:5, padding:14, borderRadius:8, alignItems:'center' },
  btntxt:{ color: colors.white, fontFamily: 'Courier New', fontWeight: 'bold', fontSize: 18 },
});