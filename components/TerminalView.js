import { StyleSheet, Text, View } from 'react-native';
import { colors } from '../lib/theme';

export default function TerminalView({ title, children }) {
  return (
    <View style={styles.container}>
      {title && <Text style={styles.title}>{title}</Text>}
      <View style={styles.panel}>{children}</View>
      <View style={styles.overlay} pointerEvents="none" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#000', 
    padding: 10,
    shadowColor: colors.blue,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 2,
    elevation: 10,
  },
  title: { 
    color: colors.blue, 
    fontFamily: 'Courier New', 
    fontWeight: 'bold',
    fontSize: 28, 
    marginBottom: 16, 
    textAlign: 'center', 
    letterSpacing: 1,
    textShadowColor: colors.blue,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 8,
  },
  panel: {
    flex: 1,
    borderWidth: 5,
    borderColor: colors.blue,
    borderRadius: 17,
    padding: 10,
    backgroundColor: '#000',
    shadowColor: colors.blue,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.7,
    shadowRadius: 15,
    elevation: 12,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255,255,255,0.02)',
    opacity: 0.1,
    backgroundSize: '100% 2px',
  },
});