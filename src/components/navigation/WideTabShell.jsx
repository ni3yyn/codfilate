import React from 'react';
import { View, StyleSheet } from 'react-native';

/**
 * Wraps tab navigator: on wide screens, first child is the side rail (RTL: rail on the right).
 */
export default function WideTabShell({ isWide, rail, children }) {
  return (
    <View style={styles.root}>
      {isWide && rail}
      <View style={styles.main} collapsable={false}>
        {children}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    flexDirection: 'row',
    minHeight: 0,
    minWidth: 0,
  },
  main: {
    flex: 1,
    minWidth: 0,
    minHeight: 0,
  },
});
