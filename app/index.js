import { Link } from 'expo-router';
import { useState } from 'react';
import { Image, StyleSheet, Text, TouchableOpacity, View, useWindowDimensions } from 'react-native';
import TerminalView from '../components/TerminalView';
import { colors } from '../lib/theme';

export default function Home() {
  // We'll size the image to perfectly fit INSIDE the bordered panel using the panel's real size.
  const { width: winW, height: winH } = useWindowDimensions(); // (kept if you use it elsewhere)
  const [panelSize, setPanelSize] = useState({ w: 0, h: 0 });

  // Resolve the asset's intrinsic size to preserve its aspect ratio exactly
  const bgAsset = require('../assets/start.jpg');
  // Web-safe: resolveAssetSource may not exist on RN web. Fall back to the require() object if it has width/height.
  const meta =
    (typeof Image.resolveAssetSource === 'function' ? Image.resolveAssetSource(bgAsset) : null)
    || (bgAsset && typeof bgAsset === 'object' && bgAsset.width && bgAsset.height ? bgAsset : null);
  const imgAspect = meta?.width && meta?.height ? meta.width / meta.height : 3 / 4;

  // Compute how to render: fill the panel on phones (portrait panel) using 'cover',
  // and show full image on wide desktops using 'contain'. Never overflow past borders.
  const { w, h } = panelSize;
  const panelAspect = w > 0 && h > 0 ? (w / h) : 0;
  const renderMode = panelAspect > 1.2 ? 'contain' : 'cover'; // wide => contain, portrait/square => cover

  return (
    <TerminalView title="Debug the Graduate!">
      {/* Fill only the inside of the panel with a responsive background */}
      <View style={styles.fill}>
        {/* Background image sized to contain within the panel, centered */}
        <View
          style={[styles.absFill, { backgroundColor: '#000' }]}
          onLayout={(e) => {
            const { width, height } = e.nativeEvent.layout;
            setPanelSize({ w: Math.round(width), h: Math.round(height) });
          }}
        >
          {w > 0 && h > 0 && (
            <Image
              source={bgAsset}
              style={{
                position: 'absolute',
                left: 0,
                top: 0,
                width: w,
                height: h,
                opacity: 0.75,
              }}
              resizeMode={renderMode}
              pointerEvents="none"
            />
          )}
        </View>
        {/* Overlay: keep your buttons centered, terminal theme preserved */}
        <View style={styles.wrap}>
          <Link href="/host" asChild>
            <TouchableOpacity style={styles.btn}><Text style={styles.btntxt}>Host Game</Text></TouchableOpacity>
          </Link>
          <Link href="/join" asChild>
            <TouchableOpacity style={styles.btnAlt}><Text style={styles.btntxt}>Join Game</Text></TouchableOpacity>
          </Link>

          <Text style= {styles.subtext}>How Well Do You Know the Grad?</Text>
          <Text style= {styles.subtext}></Text>
        </View>
        <Text style={styles.credit}>Created by: Micahela</Text>
      </View>
    </TerminalView>
  );
}
const styles = StyleSheet.create({
  wrap: { flex:1, alignItems:'center', justifyContent:'center', gap:16 },
  btn: { backgroundColor:'rgba(0, 255, 0, 0.7)', borderWidth:5, fontWeight:'bold',padding:16, borderRadius:10 },
  btnAlt: { backgroundColor:'rgba(50, 134, 245, 0.67)', borderWidth:5, padding:16, borderRadius:10 },
  btntxt: { color: colors.white, fontFamily: 'Courier New',fontWeight:'bold', fontSize: 20 },
  subtext: { color: 'rgba(3, 59, 244, 1)', fontFamily: 'Courier New',fontWeight:'bold', fontSize: 20},
  credit: {
    position: 'absolute',
    bottom: 12,
    right: 16,
    color: 'rgba(120, 170, 255, 0.9)',
    fontFamily: 'Courier New',
    fontWeight: 'normal',
    fontSize: 12,
  },
  fill: { flex: 1, position: 'relative' },
  absFill: { ...StyleSheet.absoluteFillObject },
  bgImage: { opacity: 0.38 }});