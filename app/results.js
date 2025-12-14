import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import TerminalView from '../components/TerminalView';
import { supabase } from '../lib/supabase';
import { colors } from '../lib/theme';

const BOOT_MESSAGES = [
  '> Initializing score compiler...\n',
  '> Aggregating correct answers...\n',
  '> Calculating rankings...\n',
  '> Execution complete. Displaying results.\n'
];

function TypeLine({ text, delay = 0, style }) {
  const [out, setOut] = useState('');
  const ivRef = useRef(null);
  const toRef = useRef(null);

  useEffect(() => {
    const src = typeof text === 'string' ? text : (text == null ? '' : String(text));
    setOut('');

    toRef.current = setTimeout(() => {
      let i = 0;
      ivRef.current = setInterval(() => {
        i++;
        setOut(src.slice(0, i));
        if (i >= src.length) {
          clearInterval(ivRef.current);
          ivRef.current = null;
        }
      }, 25);
    }, delay);

    return () => {
      if (toRef.current) {
        clearTimeout(toRef.current);
        toRef.current = null;
      }
      if (ivRef.current) {
        clearInterval(ivRef.current);
        ivRef.current = null;
      }
    };
  }, [text, delay]);

  return <Text style={style}>{out}</Text>;
}

export default function Results() {
  const { gid, code } = useLocalSearchParams();
  const { pid } = useLocalSearchParams();
  const hostView = !pid; // host has no pid param in our app
  const [bootLines, setBootLines] = useState([]);
  const [phase, setPhase] = useState('boot'); // 'boot' -> showing system messages, 'reveal' -> leaderboard typing
  const [sortedRows, setSortedRows] = useState([]);
  const [topScoreBands, setTopScoreBands] = useState({ gold: null, silver: null, bronze: null });

  const bootTimers = useRef([]);
  const scrollRef = useRef(null);

  function clearBootTimers() {
    bootTimers.current.forEach(t => clearTimeout(t));
    bootTimers.current = [];
  }

  function playBoot() {
    // reset scroll and phase
    if (scrollRef.current && scrollRef.current.scrollTo) {
      scrollRef.current.scrollTo({ y: 0, animated: true });
    }
    setPhase('boot');
    setBootLines([]);

    clearBootTimers();
    let i = 0;
    function step() {
      if (i < BOOT_MESSAGES.length) {
        setBootLines(prev => [...prev, BOOT_MESSAGES[i]]);
        i++;
        bootTimers.current.push(setTimeout(step, 500));
      } else {
        // Wait before showing leaderboard
        bootTimers.current.push(setTimeout(() => setPhase('reveal'), 2000));
      }
    }
    step();
  }

  useEffect(() => {
    (async () => {
      // 1) Get all players for this game
      const { data: plist } = await supabase
        .from('players')
        .select('id, username')
        .eq('game_id', gid);

      // 2) Get all answers for this game
      const { data: alist } = await supabase
        .from('answers')
        .select('player_id, is_correct')
        .eq('game_id', gid);

      // 3) Tally: 1 point per correct answer
      const scoreByPlayer = new Map();
      (alist || []).forEach(a => {
        if (a.is_correct) {
          scoreByPlayer.set(a.player_id, (scoreByPlayer.get(a.player_id) || 0) + 1);
        }
      });

      const rows = (plist || []).map(p => ({
        username: p.username,
        score: scoreByPlayer.get(p.id) || 0
      }));

      // 4) Sort by score (desc), then username; keep all players
      rows.sort((a, b) => (b.score - a.score) || a.username.localeCompare(b.username));
      setSortedRows(rows);

      // Determine top bands by unique scores (ties included)
      const uniq = Array.from(new Set(rows.map(r => r.score))).sort((a,b)=>b-a);
      const bands = {
        gold: uniq[0] ?? null,
        silver: uniq[1] ?? null,
        bronze: uniq[2] ?? null,
      };
      setTopScoreBands(bands);
    })();
  }, [gid]);

  useEffect(() => {
    const ch = supabase
      .channel('game-results-' + code)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'games', filter: `code=eq.${code}` },
        (payload) => {
          const g = payload.new;
          if (g?.status === 'question') {
            router.replace({ pathname: '/game', params: { gid, code, pid } });
          } else if (g?.status === 'finished' && !!pid) {
            // Non-host (players) return to Join page to enter the new code
            router.replace('/join');
          }
        }
      )
      .subscribe();
    return () => supabase.removeChannel(ch);
  }, [gid, code, pid]);

  useEffect(() => {
    playBoot();
    return () => clearBootTimers();
  }, []);

  return (
    <TerminalView title={`System Report`}>
      <TouchableOpacity onPress={playBoot} style={{ alignSelf: 'flex-end', marginBottom: 8 }}>
        <Text style={styles.restartBtn}>Replay Boot</Text>
      </TouchableOpacity>
      <ScrollView ref={scrollRef} style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 24 }} showsVerticalScrollIndicator>
        <View style={{ gap:12 }}>
          {phase === 'boot' && (
            <View style={{ gap: 4 }}>
              {bootLines.map((ln, idx) => (
                <TypeLine key={`boot-${idx}`} text={ln} delay={0} style={styles.prompt} />
              ))}
            </View>
          )}

          {phase === 'reveal' && (
            <View style={{ gap: 8 }}>
              {sortedRows.map((p, i) => {
                const rankNum = i + 1;
                const line = `${rankNum}. ${p.username} — ${p.score}`;
                const styleBand = (p.score === topScoreBands.gold)
                  ? styles.gold
                  : (p.score === topScoreBands.silver)
                    ? styles.silver
                    : (p.score === topScoreBands.bronze)
                      ? styles.bronze
                      : styles.row;
                return (
                  <TypeLine
                    key={`row-${i}`}
                    text={line}
                    delay={i * 10000}
                    style={[styles.row, styleBand]}
                  />
                );
              })}
            </View>
          )}
        </View>
      </ScrollView>
    </TerminalView>
  );
}
const styles = StyleSheet.create({
  row:{ color: colors.white, fontFamily: 'Courier New Bold', fontSize: 40 },
  gold:{ color: '#ffd700' }, silver:{ color: '#c0c0c0' }, bronze:{ color: '#cd7f32' },
  prompt:{ color: colors.green, fontFamily: 'Courier New Bold', fontSize: 36 , textAlign:'center' },
  tip:{ color: colors.gray, fontFamily: 'Courier New Bold', fontSize: 12, textAlign:'center' },
});