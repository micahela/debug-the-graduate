import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import TerminalView from '../components/TerminalView';
import { supabase } from '../lib/supabase';
import { colors } from '../lib/theme';

function Typewriter({ text, speed = 24, style }) {
  const [out, setOut] = useState('');
  useEffect(() => {
    let i = 0;
    setOut('');
    const id = setInterval(() => {
      i += 1;
      setOut(text.slice(0, i));
      if (i >= text.length) clearInterval(id);
    }, speed);
    return () => clearInterval(id);
  }, [text, speed]);
  return <Text style={style}>{out}</Text>;
}

export default function Lobby() {
  const { code, gid, pid } = useLocalSearchParams();
  const [game, setGame] = useState(null);
  const [players, setPlayers] = useState([]);

  const [dot, setDot] = useState(0);
  const messages = [
    'Establishing secure socket…',
    'Syncing player roster…',
    'Calibrating trivia engine…',
    'Loading question bank…',
  ];
  const [msgIdx, setMsgIdx] = useState(0);

  useEffect(() => {
    const dotId = setInterval(() => setDot(d => (d + 1) % 4), 500);
    const msgId = setInterval(() => setMsgIdx(i => (i + 1) % messages.length), 3000);
    return () => { clearInterval(dotId); clearInterval(msgId); };
  }, []);

  const pulse = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 1200, useNativeDriver: true, easing: Easing.inOut(Easing.quad) }),
        Animated.timing(pulse, { toValue: 0, duration: 1200, useNativeDriver: true, easing: Easing.inOut(Easing.quad) }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);
  const badgeScale = pulse.interpolate({ inputRange:[0,1], outputRange:[1, 1.04] });
  const dots = '.'.repeat(dot);

  useEffect(() => {
    if (!code) return;
    const subGame = supabase
      .channel('game-'+code)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'games', filter: `code=eq.${code}` },
        payload => setGame(payload.new))
      .subscribe();

    const subPlayers = supabase
      .channel('players-'+code)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'players', filter: `game_id=eq.${gid}` },
        async () => {
          const { data } = await supabase.from('players').select('*').eq('game_id', gid).order('joined_at');
          setPlayers(data || []);
        })
      .subscribe();

    (async () => {
      const { data: g } = await supabase.from('games').select('*').eq('code', code).single();
      setGame(g);
      const { data: p } = await supabase.from('players').select('*').eq('game_id', g.id).order('joined_at');
      setPlayers(p || []);
    })();

    return () => { supabase.removeChannel(subGame); supabase.removeChannel(subPlayers); };
  }, [code, gid]);

  useEffect(() => {
    if (game?.status === 'question') {
      router.push({ pathname: '/game', params: { code, gid, pid }});
    }
  }, [game]);

  async function hostStartNext() {
    // advance from lobby to first question (already set by host.js, but host can re-trigger)
    await supabase.from('games').update({
      status: 'question',
      current_question_index: 0,
      question_started_at: new Date().toISOString()
    }).eq('id', gid);
  }

  const isHostView = !pid; // host came here without pid

  return (
    <TerminalView title={`Waiting Room`}>
      <View style={{ flex:1, alignItems:'center', justifyContent:'center', padding: 16, gap: 16 }}>
        <Animated.View style={[styles.badge, { transform:[{ scale: badgeScale }] }]}>
          <Text style={styles.badgeTxt}>CONNECTED</Text>
        </Animated.View>

        <Text style={styles.head}>{`Room:${code}`}</Text>
        <Text style={styles.sub}>{`Users joined: ${players.length}`}</Text>

        <Typewriter style={styles.sys} text={messages[msgIdx]} />
        <Text style={styles.wait}>Waiting for host{dots}</Text>

        <Text style={styles.ascii}>{'[████████░░░░░░░░░░]'}{' '}{'standby'}</Text>

        {isHostView && (
          <TouchableOpacity style={styles.btn} onPress={hostStartNext}>
            <Text style={styles.btntxt}>Start Game</Text>
          </TouchableOpacity>
        )}
      </View>
    </TerminalView>
  );
}
const styles = StyleSheet.create({
  head:{ color: '#22b1f3ff', fontFamily: 'Courier New Bold', fontSize: 28, textAlign:'center' },
  sub:{ color: '#22b1f3ff', fontFamily: 'Courier New Bold', fontSize: 16 },
  sys:{ color: '#22b1f3ff', fontFamily: 'Courier New Bold', opacity: 0.9, textAlign:'center' },
  wait:{ color: colors.green, fontFamily: 'Courier New Bold', fontSize: 16 },
  ascii:{ color: '#22b1f3ff', fontFamily: 'Courier New Bold', textAlign:'center' },
  name:{ color: colors.white, fontFamily: 'Courier New Bold', paddingVertical:4 },
  btn:{ borderColor: colors.green, backgroundColor: 'rgba(0, 255, 0, 0.7)', borderWidth:5, padding:14, borderRadius:8, alignItems:'center' },
  btntxt:{ color: colors.white, fontFamily: 'Courier New Bold' },
  tip:{ color: colors.gray, fontFamily: 'Courier New Bold', textAlign:'center' },
  badge:{ borderColor: colors.blue, borderWidth: 2, paddingVertical: 6, paddingHorizontal: 12, borderRadius: 12, backgroundColor: 'rgba(243, 247, 122, 0.08)' },
  badgeTxt:{ color: '#22b1f3ff', fontFamily: 'Courier New Bold', fontSize: 12, letterSpacing: 2 },
});