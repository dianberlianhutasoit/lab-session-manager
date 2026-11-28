import React, { useMemo } from 'react';
import { View, StyleSheet } from 'react-native';

// toqr menghasilkan Uint8Array (0 atau 1) dengan ukuran NxN
let toQR: ((text: string) => Uint8Array) | null = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const toqrModule = require('toqr');
  toQR = toqrModule.toQR || toqrModule.default || toqrModule;
} catch {
  toQR = null;
}

interface QRDisplayProps {
  value: string;
  size?: number;
  bgColor?: string;
  fgColor?: string;
}

export function QRDisplay({
  value,
  size = 200,
  bgColor = '#FFFFFF',
  fgColor = '#000000',
}: QRDisplayProps) {
  const { matrix, dimension } = useMemo(() => {
    if (!toQR || !value) {
      return { matrix: [] as number[], dimension: 0 };
    }
    try {
      const bytes = toQR(value);
      const dim = Math.round(Math.sqrt(bytes.length));
      return { matrix: Array.from(bytes), dimension: dim };
    } catch {
      return { matrix: [] as number[], dimension: 0 };
    }
  }, [value]);

  if (dimension === 0) {
    return (
      <View
        style={[
          styles.container,
          { width: size, height: size, backgroundColor: bgColor },
        ]}
      />
    );
  }

  const cellSize = size / dimension;

  // Kelompokkan per baris untuk rendering yang optimal
  const rows: number[][] = [];
  for (let r = 0; r < dimension; r++) {
    rows.push(matrix.slice(r * dimension, (r + 1) * dimension));
  }

  return (
    <View
      style={[
        styles.container,
        {
          width: size,
          height: size,
          backgroundColor: bgColor,
          padding: 8,
        },
      ]}>
      {rows.map((row, rowIndex) => (
        <View key={`row-${rowIndex}`} style={styles.row}>
          {row.map((cell, colIndex) => (
            <View
              key={`cell-${rowIndex}-${colIndex}`}
              style={{
                width: cellSize,
                height: cellSize,
                backgroundColor: cell === 1 ? fgColor : bgColor,
              }}
            />
          ))}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
  },
});
