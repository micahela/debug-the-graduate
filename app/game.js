import dayjs from 'dayjs';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Alert, Image, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, useWindowDimensions, View } from 'react-native';
import TerminalView from '../components/TerminalView';
import { supabase } from '../lib/supabase';
import { colors } from '../lib/theme';

// === STATIC QUESTIONS ===
// Put your images into /assets and reference them with require() below.
// Replace the sample entries with your real ones. Keep indices 0-based in `correct_indices`.
const QUESTIONS = [
    {
        text: "What is Micahela's Grad Major?",
        image: require('../assets/Q1.png'),
        options: ['Big Data', 'Computer Engineering', 'Accounting', 'Computer Science'],
        correct_indices: [3],
        time_limit_seconds: 20
    },
    {
        text: "What was Micahela's undergrad major?",
       image: require('../assets/Q2.png'),
        options: ['Nursing', 'Computer Engineering', 'IT Project Management', 'Data Analytics'],
        correct_indices: [2],
        time_limit_seconds: 20
    },
    {
        text: 'What year did Micahela graduate from her undergrad?',
        image: require('../assets/Q3.png'),
        options: ['2019', '2021', '2020', '2023'],
        correct_indices: [1],
        time_limit_seconds: 20
    },
    {
        text: 'What year did Micahela start her Grad program?',
        image: require('../assets/Q4.jpg'),
        options: ['2022', '2024', '2023', '2025'],
        correct_indices: [2],
        time_limit_seconds: 20
    }, 
    {
        text: "What is Micahela's dream job?",
        image: require('../assets/Q5.png'),
        options: ['Data Scientist', 'Computer Engineer', 'Project Manager', 'Software Developer'],
        correct_indices: [3],
        time_limit_seconds: 20
    },
    {
        text: "Multi-select: What's Micahela's favorite food?",
        image: require('../assets/Q6.jpg'),
        options: ['Thai', 'Jamaican', 'Indian', 'Tex-Mex'],
        correct_indices: [1,2,3], // multiple correct
        time_limit_seconds: 20
    },
    {
        text: "What's Micahela's middle name?",
        image: require('../assets/Q7.jpg'),
        options: ['Melanie', 'Gina', 'Ashley', 'Giavanna'],
        correct_indices: [3],
        time_limit_seconds: 20
    },
    {
        text: "What's Micahela's favorite color?",
        image: require('../assets/Q8.png'),
        options: ['Red', 'Yellow', 'Blue', 'Green'],
        correct_indices: [2],
        time_limit_seconds: 20
    },
    {
        text: 'True of False: Micahela loves coffee and drank a lot of it during school.',
        image: require('../assets/Q9.jpg'),
        options: ['True', 'False'],
        correct_indices: [1],
        time_limit_seconds: 20
    },
    {
        text: 'How long did Micahela work at Geek Squad?',
        image: require('../assets/Q10.jpg'),
        options: ['3 years', '6 months', '5 years', '1 year'],
        correct_indices: [0],
        time_limit_seconds: 20
    },
    {
        text: 'Multi-select: What technology does Micahela have to help her Mum with a lot?',
        image: require('../assets/Q11.jpg'),
        options: ['Updating her software', 'Putting on screen protectors', 'Setting up new devices', 'Troubleshooting WiFi'],
        correct_indices: [0,1,2,3], // all correct
        time_limit_seconds: 20
    },
    {
        text: 'How long has Micahela been vegan?',
        image: require('../assets/Q12.png'),
        options: ['6 months', '2 years', '8 years', '7 years'],
        correct_indices: [2],
        time_limit_seconds: 20
    },{
        text: "What's Micahela's favorite Operating System?",
        image: require('../assets/Q13.jpg'),
        options: ['Windows 10', 'MacOS', 'Linux', 'Windows 8'],
        correct_indices: [0],
        time_limit_seconds: 20
    },{
        text: "Multi-Select: What's Micahela's favorite music genres?",
        image: require('../assets/Q20.jpg'),
        options: ['Dancehall', 'Reggae', 'Country', 'Dembow'],
        correct_indices: [0,1,3], // multiple correct
        time_limit_seconds: 20
    },{
        text: "What's Micahela's favorite sport?",
       image: require('../assets/Q14.jpg'),
        options: ['Basketball 🏀', 'Tennis 🎾', 'Futbol ⚽️', 'Baseball ⚾️'],
        correct_indices: [2],
        time_limit_seconds: 20
    },{
        text: "What is Micahela's current job role?",
        image: require('../assets/Q15.jpg'),
        options: ['IT Support', 'Customer Service Agent', 'Project Manager', 'Data Analyst'],
        correct_indices: [3],
        time_limit_seconds: 20
    },{
        text: "Multi-select: What's most likely to distract Micahela mid-coding session?",
        image: require('../assets/Q16.jpg'),
        options: ['Mum & Nikko 🐕', 'TikTok', 'Food', "Nothing, she's locked in"],
        correct_indices: [0,3], // multiple correct
        time_limit_seconds: 20
    },{
        text: 'Which class was the only class Micahela has failed in her entire academic career?',
        image: require('../assets/Q17.png'),
        options: ['Alegbra I', 'Geometry', 'Chemistry', 'Intro to Programming'],
        correct_indices: [3],
        time_limit_seconds: 20
    },{
        text: 'Multi-Select: Where are two places Micahela loves to vist?',
        image: require('../assets/Q18.jpg'),
        options: ['Puerto Rico', 'Jamaica', 'Costa Rica', 'Europe'],
        correct_indices: [1,2], // multiple correct
        time_limit_seconds: 20
    }
];

function TimerBar({ remaining, total }) {
  const pct = Math.max(0, Math.min(1, total ? remaining / total : 0));
  const barColor = remaining > total * 0.5 ? colors.green : remaining > total * 0.25 ? '#E1A405' : colors.red;
  return (
    <View style={styles.timerWrap}>
      <View style={styles.timerTrack}>
        <View style={[styles.timerFill, { width: `${Math.round(pct * 100)}%`, backgroundColor: barColor }]} />
      </View>
      <Text style={styles.timerText}>{remaining}s</Text>
    </View>
  );
}

export default function Game() {
  const { code, gid, pid } = useLocalSearchParams();
  const [game, setGame] = useState(null);
  const [selected, setSelected] = useState([]);   // indices array for multi-select
  const [phase, setPhase] = useState('question'); // 'question' | 'reveal'
  const [remaining, setRemaining] = useState(20);
  const [submitted, setSubmitted] = useState(false);
  const [freeForm, setFreeForm] = useState('');
  const [cloudEntries, setCloudEntries] = useState([]); // array of strings

  const currentQuestion = useMemo(() => {
    if (!game) return null;
    const idx = game.current_question_index || 0;
    return QUESTIONS[idx];
  }, [game]);

  // subscribe to game changes
  useEffect(() => {
    // On web, params can be undefined briefly on first render; don't hit Supabase until ready
    if (!code || !gid) return;
    const ch = supabase
      .channel('game-' + code)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'games', filter: `code=eq.${code}` },
        (payload) => {
          const g = payload?.new || payload?.record || payload?.old;
          if (!g) return;
          setGame(g);

          if (g.status === 'finished') {
            router.push({ pathname: '/results', params: { gid, code } });
            return;
          }
          if (g.status === 'cancelled') {
            const isHost = !pid;
            router.push({ pathname: isHost ? '/host' : '/join', params: isHost ? { code } : {} });
            return;
          }
          if (g.status === 'question') {
            setPhase('question');
            setSelected([]);
            setSubmitted(false);
            setFreeForm('');
          } else if (g.status === 'reveal') {
            setPhase('reveal');
          }
        }
      )
      .subscribe();

    (async () => {
      const { data: g, error } = await supabase.from('games').select('*').eq('id', gid).single();
      if (error) {
        console.error('Failed to load game:', error);
        Alert.alert('Connection error', error.message || 'Failed to load game from Supabase.');
        return;
      }
      setGame(g);
    })();

    return () => {
      supabase.removeChannel(ch);
    };
  }, [gid, code, pid]);

  // Live wordcloud for host during the wordcloud question
  useEffect(() => {
    const idx = game?.current_question_index ?? -1;
    const isWord = currentQuestion?.type === 'wordcloud';
    const isHost = !pid;
    if (!gid || idx < 0 || !isWord || !isHost) return;

    async function refresh() {
      const { data } = await supabase
        .from('answers')
        .select('free_text')
        .eq('game_id', gid)
        .eq('question_index', idx)
        .order('created_at', { ascending: true });
      setCloudEntries((data || []).map(r => (r?.free_text || '').trim()).filter(Boolean));
    }

    const ch = supabase
      .channel('answers-cloud-' + gid + '-' + idx)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'answers', filter: `game_id=eq.${gid}` },
        (payload) => {
          const r = payload.new;
          if (r?.question_index === idx) {
            refresh();
          }
        }
      )
      .subscribe();

    refresh();
    return () => supabase.removeChannel(ch);
  }, [gid, pid, game?.current_question_index, currentQuestion?.type]);

  // Timer tick (client-calculated using question_started_at)
  useEffect(() => {
    if (!game?.question_started_at || !currentQuestion) return;
    const limit = currentQuestion.time_limit_seconds || 20;

    const tick = () => {
      const elapsed = dayjs().diff(dayjs(game.question_started_at), 'second');
      const remain = Math.max(0, limit - elapsed);
      setRemaining(remain);

      // Only host flips to reveal at 0s to keep clients in sync
      const isHost = !pid;
      if (remain === 0 && isHost && game.status === 'question') {
        (async () => {
          const { error } = await supabase.from('games').update({ status: 'reveal' }).eq('id', gid);
          if (error) {
            // Surface RLS or other errors in the console so we know why reveal didn't fire
            console.error('Failed to set reveal phase:', error.message);
          }
        })();
      }
    };

    tick();
    const tm = setInterval(tick, 250);
    return () => clearInterval(tm);
  }, [game?.question_started_at, currentQuestion, pid, gid, game?.status]);

  // Host-only early reveal: if all joined players have submitted, flip to reveal
  useEffect(() => {
    if (!gid || !game || game.status !== 'question') return;
    const isHost = !pid;
    if (!isHost) return;

    const qIndex = game.current_question_index ?? 0;

    async function refreshCounts() {
      // Count total players joined for this game
      const { count: totalPlayers, error: pErr } = await supabase
        .from('players')
        .select('*', { count: 'exact', head: true })
        .eq('game_id', gid);
      if (pErr) return;

      // Count distinct players who answered this question
      const { data: ans, error: aErr } = await supabase
        .from('answers')
        .select('player_id')
        .eq('game_id', gid)
        .eq('question_index', qIndex);
      if (aErr) return;

      const answered = new Set((ans || []).map(r => r.player_id)).size;

      // If everyone answered and we're still in question phase, reveal now
      if ((totalPlayers || 0) > 0 && answered >= (totalPlayers || 0) && game.status === 'question') {
        const { error } = await supabase.from('games').update({ status: 'reveal' }).eq('id', gid);
        if (error) console.error('Early reveal failed:', error.message);
      }
    }

    // Subscribe to changes in players and answers to recompute counts
    const chPlayers = supabase
      .channel('players-count-' + gid + '-' + qIndex)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'players', filter: `game_id=eq.${gid}` }, () => refreshCounts())
      .subscribe();

    const chAnswers = supabase
      .channel('answers-count-' + gid + '-' + qIndex)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'answers', filter: `game_id=eq.${gid}` }, (payload) => {
        // Only recompute for this question index
        if (payload?.new?.question_index === qIndex) refreshCounts();
      })
      .subscribe();

    // Initial check in case everyone already answered
    refreshCounts();

    return () => {
      supabase.removeChannel(chPlayers);
      supabase.removeChannel(chAnswers);
    };
  }, [gid, pid, game?.id, game?.status, game?.current_question_index]);

  function toggleChoice(i) {
    setSelected((prev) => (prev.includes(i) ? prev.filter((x) => x !== i) : [...prev, i]));
  }

  const isCorrect = useMemo(() => {
    if (!currentQuestion) return false;
    const a = new Set(selected);
    const b = new Set(currentQuestion.correct_indices);
    if (a.size !== b.size) return false;
    for (const x of a) if (!b.has(x)) return false;
    return true;
  }, [selected, currentQuestion]);

  async function submit() {
    if (!pid || !game) return; // host has no pid
    const payload = {
      game_id: gid,
      player_id: pid,
      question_index: game.current_question_index
    };

    if (currentQuestion?.type === 'wordcloud') {
      // Expect a free_text column on answers table
      payload.selected_indices = null;
      payload.is_correct = null;
      payload.free_text = (freeForm || '').trim();
    } else {
      payload.selected_indices = selected;
      payload.is_correct = isCorrect;
    }

    const { error } = await supabase.from('answers').insert(payload);
    if (error) {
      console.error('Submit failed:', error);
      Alert.alert('Submit failed', error.message || 'Could not submit your answer.');
      return;
    }
    setSubmitted(true);
  }

  async function nextOrReveal() {
    if (!game) return;
    const next = (game.current_question_index || 0) + 1;
    if (next >= QUESTIONS.length) {
      const { error } = await supabase.from('games').update({ status: 'finished' }).eq('id', gid);
      if (error) {
        console.error('Finish failed:', error);
        Alert.alert('Could not finish game', error.message || 'Supabase update failed.');
        return;
      }
      router.push({ pathname: '/results', params: { gid, code } });
    } else {
      const { error } = await supabase
        .from('games')
        .update({
          status: 'question',
          current_question_index: next,
          question_started_at: new Date().toISOString()
        })
        .eq('id', gid);

      if (error) {
        console.error('Next question failed:', error);
        Alert.alert('Could not advance', error.message || 'Supabase update failed.');
        return;
      }
      setSubmitted(false);
      setFreeForm('');
    }
  }

  // Host-only: reveal now (flip to reveal immediately)
  async function revealNow() {
    if (!game) return;
    const isHost = !pid;
    if (!isHost) return;

    const { error } = await supabase.from('games').update({ status: 'reveal' }).eq('id', gid);
    if (error) {
      console.error('Reveal now failed:', error);
      Alert.alert('Could not reveal', error.message || 'Supabase update failed.');
      return;
    }
    setPhase('reveal');
  }

  // Host-only: skip question (advance to next question or finish)
  async function skipQuestion() {
    if (!game) return;
    const isHost = !pid;
    if (!isHost) return;

    const next = (game.current_question_index || 0) + 1;

    // If we're at the end, finish.
    if (next >= QUESTIONS.length) {
      const { error } = await supabase.from('games').update({ status: 'finished' }).eq('id', gid);
      if (error) {
        console.error('Finish (skip) failed:', error);
        Alert.alert('Could not finish game', error.message || 'Supabase update failed.');
        return;
      }
      router.push({ pathname: '/results', params: { gid, code } });
      return;
    }

    const { error } = await supabase
      .from('games')
      .update({
        status: 'question',
        current_question_index: next,
        question_started_at: new Date().toISOString()
      })
      .eq('id', gid);

    if (error) {
      console.error('Skip failed:', error);
      Alert.alert('Could not skip', error.message || 'Supabase update failed.');
      return;
    }

    // Reset local UI state immediately (clients will also update via realtime)
    setPhase('question');
    setSelected([]);
    setSubmitted(false);
    setFreeForm('');
  }

  async function cancelGame() {
    if (!game) return;
    let res = await supabase
      .from('games')
      .update({ status: 'cancelled' })
      .eq('id', gid)
      .select('id');

    if (res.error || (Array.isArray(res.data) && res.data.length === 0)) {
      // Fallback by game code in case gid mismatch on web deep-link
      res = await supabase
        .from('games')
        .update({ status: 'cancelled' })
        .eq('code', code)
        .select('id');
    }

    if (res.error) {
      console.error('Cancel failed:', res.error.message);
      Alert.alert('Cancel failed', res.error.message);
      return;
    }

    router.push({ pathname: '/host', params: { code } });
  }

  // Atomic scoring via RPC (create increment_score as shown earlier)
  useEffect(() => {
    if (phase !== 'reveal' || !pid || !currentQuestion) return;
    if (currentQuestion?.type === 'wordcloud') return; // no points for wordcloud
    if (isCorrect) {
      supabase.rpc('increment_score', { p_player_id: pid, p_delta: 1 });
    }
  }, [phase, pid, currentQuestion, isCorrect]);

  // Call hooks unconditionally before any early return to keep hook order stable
  const { width: winW, height: winH } = useWindowDimensions();
  if (!game || !currentQuestion) return <TerminalView title="Loading..." />;

  const hostView = !pid;
  const isHost = hostView;
  const PANEL_PADDING = 32;              // approximate inner padding of TerminalView panel
  const MAX_IMG_W = 900;                 // cap for large desktops/projectors
  const targetW = Math.min(MAX_IMG_W, Math.max(280, winW - PANEL_PADDING));
  const aspect = 16 / 9;
  let imgW = targetW;
  let imgH = Math.round(imgW / aspect);
  // Keep image from swallowing the viewport height (esp. on laptops)
  const MAX_BY_HEIGHT = Math.floor(winH * 0.45);
  if (imgH > MAX_BY_HEIGHT) {
    imgH = MAX_BY_HEIGHT;
    imgW = Math.round(imgH * aspect);
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      {hostView && (
        <View style={styles.topRight}>
          <TouchableOpacity
            onPress={() => {
              if (Platform.OS === 'web') {
                // Expo web Alert has limited support — immediately cancel
                cancelGame();
                return;
              }
              Alert.alert(
                'Cancel Game?',
                'This will send everyone back to the lobby.',
                [
                  { text: 'No', style: 'cancel' },
                  { text: 'Yes, cancel', style: 'destructive', onPress: cancelGame },
                ]
              );
            }}
            style={styles.cancelBtn}
          >
            <Text style={styles.cancelTxt}>CANCEL</Text>
          </TouchableOpacity>
        </View>
      )}
      {(() => {
        const total = currentQuestion.time_limit_seconds || 20;
        const bars = 10;
        const filled = Math.max(0, Math.min(bars, Math.round((remaining / total) * bars)));
        const barStr = '█'.repeat(filled) + '░'.repeat(bars - filled);
        const titleStr = `Question ${(game.current_question_index || 0) + 1} `;
        return (
          <TerminalView title={titleStr}>
            {/* Fixed header area under title */}
            <View style={styles.timerHeader}>
              <TimerBar remaining={remaining} total={total} />
            </View>
            <ScrollView
              contentContainerStyle={{ gap: 16, paddingBottom: 48 }}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              {currentQuestion.image ? (
                <Image
                  source={currentQuestion.image}
                  style={{ width: imgW, height: imgH, resizeMode: 'contain', alignSelf: 'center', marginBottom: 8 }}
                />
              ) : null}

              <Text style={styles.q}>{currentQuestion.text}</Text>

              {currentQuestion?.type === 'wordcloud' ? (
                <>
                  {/* Host: live word cloud */}
                  {isHost ? (
                    <WordCloudView entries={cloudEntries} />
                  ) : (
                    /* Player: free-text input */
                    <View style={{ gap: 8 }}>
                      <TextInput
                        style={styles.input}
                        value={freeForm}
                        onChangeText={setFreeForm}
                        placeholder="Type your phrase..."
                        placeholderTextColor="#7a7a7a"
                        editable={phase === 'question' && !submitted}
                        returnKeyType="done"
                        onSubmitEditing={() => {
                          if (!submitted && phase === 'question' && freeForm.trim()) submit();
                        }}
                      />
                    </View>
                  )}
                </>
              ) : (
                <View style={{ gap: 8 }}>
                  {currentQuestion.options.map((opt, i) => {
                    const active = selected.includes(i);
                    const stylesArr = [styles.opt];
                    const locked = submitted && phase === 'question';
                    if (phase === 'reveal') {
                      if (currentQuestion.correct_indices.includes(i)) {
                        stylesArr.push(styles.optCorrect);
                      } else if (!isHost && active) {
                        stylesArr.push(styles.optWrong);
                      }
                    } else if (locked) {
                      stylesArr.push(styles.optDisabled);
                      if (active) stylesArr.push(styles.optActive);
                    } else if (active) {
                      stylesArr.push(styles.optActive);
                    }
                    return (
                      <TouchableOpacity
                        key={i}
                        style={stylesArr}
                        disabled={phase !== 'question' || submitted || isHost}
                        onPress={() => { if (isHost || submitted || phase !== 'question') return; toggleChoice(i); }}
                      >
                        <Text style={styles.opttxt}>{String.fromCharCode(65 + i)}. {opt}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              )}

              {phase === 'question' && !!pid && (
                <TouchableOpacity
                  style={[styles.submit, submitted && styles.submitDisabled]}
                  onPress={submit}
                  disabled={submitted || (currentQuestion?.type === 'wordcloud' && !freeForm.trim())}
                >
                  <Text style={styles.btntxt}>{submitted ? 'Submitted' : 'Submit'}</Text>
                </TouchableOpacity>
              )}

              {phase === 'reveal' && !!pid && (
                <Text style={[styles.reveal, { color: isCorrect ? colors.green : colors.red }]}>
                  {isCorrect ? '✓ Correct' : '✗ Incorrect'}
                </Text>
              )}

              {hostView && (
                <View style={{ gap: 10 }}>
                  {phase === 'question' ? (
                    <>
                      <TouchableOpacity style={styles.host} onPress={revealNow}>
                        <Text style={styles.btntxt}>REVEAL NOW</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={styles.hostSecondary} onPress={skipQuestion}>
                        <Text style={styles.btntxt}>SKIP</Text>
                      </TouchableOpacity>
                    </>
                  ) : (
                    <TouchableOpacity style={styles.host} onPress={nextOrReveal}>
                      <Text style={styles.btntxt}>Next Question</Text>
                    </TouchableOpacity>
                  )}
                </View>
              )}
            </ScrollView>
          </TerminalView>
        );})()}
    </KeyboardAvoidingView>
  );
}

function WordCloudView({ entries }) {
  // tally frequencies
  const tally = new Map();
  (entries || []).forEach(t => {
    const key = t.toLowerCase();
    tally.set(key, (tally.get(key) || 0) + 1);
  });
  const items = Array.from(tally.entries()).sort((a,b) => b[1] - a[1]);
  if (items.length === 0) {
    return <Text style={{ color: colors.gray, fontFamily: 'Courier New Bold' }}>Waiting for responses…</Text>;
  }
  // map counts to font sizes
  const max = Math.max(...items.map(([,c]) => c));
  const min = Math.min(...items.map(([,c]) => c));
  const scale = (c) => {
    if (max === min) return 22;
    const t = (c - min) / (max - min);
    return Math.round(16 + t * 28); // 16..44
  };
  return (
    <View style={styles.cloudWrap}>
      {items.map(([word, count], idx) => (
        <Text key={word + idx} style={[styles.cloudWord, { fontSize: scale(count) }]}>
          {word}
        </Text>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  q: { color: colors.white, fontFamily: 'Courier New Bold', fontSize: 18 },
  opt: { borderColor: colors.blue, borderWidth: 2, padding: 22, borderRadius: 20 },
  optActive: { borderColor: colors.orange, backgroundColor: 'rgba(11, 230, 234, 0.93)' },
  optCorrect: { borderColor: colors.green, backgroundColor: 'rgba(255, 174, 0, 0.08)' },
  optWrong: { borderColor: colors.red, backgroundColor: 'rgba(255,77,77,0.08)' },
  opttxt: { color: colors.white, fontFamily: 'Courier New Bold' },
  btntxt: { color: colors.white, fontFamily: 'Courier New Bold', fontSize: 15 },
  submit: { backgroundColor:  'rgba(0, 255, 0, 0.7)', borderWidth:5, padding:14, borderRadius:8, alignItems:'center', marginTop: 130 },
  reveal: { fontFamily: 'Courier New Bold', fontSize: 20, textAlign: 'center', marginTop: 8 },
  host: {backgroundColor:  'rgba(79, 191, 251, 0.9)' , borderWidth: 5, padding: 12, borderRadius: 8, alignItems: 'center' },
  hostSecondary: { backgroundColor: 'rgba(255, 174, 0, 0.18)', borderWidth: 2, borderColor: colors.orange, padding: 12, borderRadius: 8, alignItems: 'center' },
  optDisabled: { borderColor: colors.gray, backgroundColor: 'rgba(107,114,128,0.2)' },
  submitDisabled: { borderColor: colors.gray, opacity: 0.6 },
  input: { borderColor: colors.blue, borderWidth: 1, borderRadius: 8, padding: 12, color: colors.white, fontFamily: 'Courier New Bold' },
  cloudWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, alignItems: 'flex-start' },
  cloudWord: { color: colors.white, fontFamily: 'Courier New Bold' },
  topRight: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 16 : 12,
    right: 16,
    zIndex: 20,
  },
  cancelBtn: {
    borderWidth: 1,
    borderColor: colors.red,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 6,
    backgroundColor: 'rgba(255,0,0,0.08)',
  },
  cancelTxt: {
    color: colors.red,
    fontFamily: 'Courier New Bold',
    fontSize: 12,
    letterSpacing: 1,
  },
  timerWrap: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  timerTrack: { flex: 1, height: 10, borderRadius: 0, backgroundColor: 'rgba(122,162,247,0.15)', overflow: 'hidden', borderWidth: 1, borderColor: colors.blue },
  timerFill: { height: '100%' },
  timerText: { color: colors.white, fontFamily: 'Courier New Bold', fontSize: 14 },
  timerHeader: { paddingHorizontal: 16, paddingTop: 6, paddingBottom: 8 },
});