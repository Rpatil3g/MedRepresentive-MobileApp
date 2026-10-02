import React, { useContext, useEffect, useState } from 'react';
import { View, ActivityIndicator, Text, StyleSheet, Modal } from 'react-native';
import { NavigationContext } from '@react-navigation/native';
import { COLORS, SIZES } from '../../constants';

export interface LoadingProps {
  visible: boolean;
  message?: string;
}

/**
 * Whether the screen this component sits in is the one on screen. A Modal draws over the whole
 * app, so without this a screen further down a stack (e.g. Visit List under Log Visit) would
 * cover the screen in front with its spinner. Outside a navigator it always counts as focused.
 */
const useScreenFocused = (): boolean => {
  const navigation = useContext(NavigationContext);
  const [focused, setFocused] = useState(() => navigation?.isFocused() ?? true);

  useEffect(() => {
    if (!navigation) return undefined;
    setFocused(navigation.isFocused());
    const unsubscribeFocus = navigation.addListener('focus', () => setFocused(true));
    const unsubscribeBlur = navigation.addListener('blur', () => setFocused(false));
    return () => {
      unsubscribeFocus();
      unsubscribeBlur();
    };
  }, [navigation]);

  return focused;
};

const Loading: React.FC<LoadingProps> = ({ visible, message }) => {
  const focused = useScreenFocused();

  return (
    <Modal transparent visible={visible && focused} animationType="fade">
      <View style={styles.container}>
        <View style={styles.content}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          {message && <Text style={styles.message}>{message}</Text>}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.overlay,
  },
  content: {
    backgroundColor: COLORS.background,
    padding: SIZES.paddingXL,
    borderRadius: SIZES.radiusLG,
    alignItems: 'center',
    minWidth: 150,
  },
  message: {
    marginTop: SIZES.paddingMD,
    fontSize: SIZES.fontMD,
    color: COLORS.textPrimary,
    textAlign: 'center',
  },
});

export default Loading;
