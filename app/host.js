import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import TerminalView from '../components/TerminalView';
import { generateCode } from '../lib/room';
import { supabase } from '../lib/supabase';
import { colors } from '../lib/theme';

const RETRY_DELAY_MS = 250;

export default function Host() {
  const [gameId, setGameId] = useState(null);
  const [code, setCode] = useState('');
  const [err, setErr] = useState(null);
  const [busy, setBusy] = useState(false);
  const [players, setPlayers] = useState([]);

  async function createGame() {
    setBusy(true);
    setErr(null);
    const newCode = generateCode();
    const { data, error } = await supabase.from('games').insert({ code: newCode }).select().single();
    if (error) {
      console.log('createGame error:', error);
      setErr(error.message || 'Failed to create game');
      setBusy(false);
      return;
    }
    setGameId(data.id);
    setCode(data.code);
    setBusy(false);
  }

  async function startGame() {
    if (!gameId) return;
    await supabase
      .from('games')
      .update({
        status: 'question',
        current_question_index: 0,
        question_started_at: new Date().toISOString() // fixed typo
      })
      .eq('id', gameId);

    // Pass gid so Lobby subscriptions can filter correctly
    router.push({ pathname: '/lobby', params: { code, gid: gameId } });
  }

  useEffect(() => { createGame(); }, []);

  useEffect(() => {
    if (!gameId) return;

    async function refresh() {
      const { data } = await supabase
        .from('players')
        .select('*')
        .eq('game_id', gameId)
        .order('joined_at', { ascending: true });
      setPlayers(data || []);
    }

    const ch = supabase
      .channel('players-' + (code || ''))
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'players', filter: `game_id=eq.${gameId}` },
        () => refresh()
      )
      .subscribe();

    // initial load
    refresh();

    return () => supabase.removeChannel(ch);
  }, [gameId, code]);

  const listMaxHeight = 150;

  return (
    <TerminalView title="Debug the Graduate">
      <View style={{ flex: 1 }}>
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ gap: 16, padding: 16 }}>
          <Text style={styles.code}>Join Code: {code || '...'}</Text>

          <View style={styles.card}>
            <Text style={[styles.copy, { textAlign: 'center', fontWeight: 'bold' }]}>
              Click "Join Game" to play. Enter the code above when prompted and choose a username. Once joined, users will show in the user list below.
            </Text>
            <Text style={styles.sub}>Users joined: {players.length}</Text>
            <ScrollView style={{ maxHeight: listMaxHeight }} contentContainerStyle={{ gap: 6, paddingVertical: 6 }} showsVerticalScrollIndicator>
              {players.map(p => (
                <Text key={p.id} style={styles.name}>› {p.username}</Text>
              ))}
            </ScrollView>
            {!!err && <Text style={styles.err}>Error: {err}</Text>}
          </View>
        </ScrollView>

        <TouchableOpacity
          style={[styles.start, styles.startBottom]}
          onPress={() => (gameId ? startGame() : createGame())}
        >
          <Text style={styles.btntxt}>{gameId ? 'Run' : (busy ? 'Preparing…' : 'Retry Create Game')}</Text>
        </TouchableOpacity>
      </View>
    </TerminalView>
  );
}

const styles = StyleSheet.create({
  code:{ color: 'rgba(0, 255, 0, 0.7)', fontFamily: 'Courier New Bold', fontSize: 38, textAlign:'center', marginBottom: 8 },
 
  copy:{ color: colors.white, fontFamily: 'Courier New Bold'},
  start:{ backgroundColor:  'rgba(0, 255, 0, 0.7)', borderWidth:5, padding:14, borderRadius:8, alignItems:'center' },
  btntxt:{ color: colors.white, fontFamily: 'Courier New Bold',fontSize:20 },
  err:{ color: colors.red, fontFamily: 'Courier New Bold', marginBottom: 8 },
  sub:{ color: '#22b1f3ff', fontFamily: 'Courier New Bold', marginTop: 6,fontSize: 20, },
  name:{ color: colors.white, fontFamily: 'Courier New Bold', fontSize:18 },
  startBottom: { position: 'absolute', bottom: 20, alignSelf: 'center', width: '90%' },
});