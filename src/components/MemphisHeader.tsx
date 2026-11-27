import React from 'react';
import { View, StyleSheet, useWindowDimensions } from 'react-native';
import Svg, { Path, Circle, Line, G } from 'react-native-svg';
import { MemphisColors } from '@/constants/theme';

interface MemphisHeaderProps {
  height?: number;
}

export function MemphisHeader({ height = 180 }: MemphisHeaderProps) {
  const { width } = useWindowDimensions();

  return (
    <View style={[styles.container, { height, width }]}>
      <Svg
        width={width}
        height={height}
        viewBox="0 0 375 180"
        preserveAspectRatio="xMidYMin slice"
        style={StyleSheet.absoluteFill}
      >
        {/* Layer 1: Fluid Organic Shape (Pastel Mint/Teal Light) */}
        <Path
          d="M-20,-20 L260,-20 C240,60 210,120 130,135 C60,150 10,95 -20,110 Z"
          fill={MemphisColors.mintLight}
        />

        {/* Layer 2: Fluid Organic Shape (Pastel Mint/Teal Deeper) */}
        <Path
          d="M-20,-20 L190,-20 C170,45 140,85 85,95 C30,105 0,70 -20,80 Z"
          fill={MemphisColors.mint}
          opacity={0.85}
        />

        {/* Cobalt Circle Accent: Solid #2563EB, ~32px diameter on the left */}
        <Circle
          cx="48"
          cy="125"
          r="16"
          fill={MemphisColors.teal}
        />

        {/* Dot Matrix: 6 dots (3x2) in Navy */}
        <G fill={MemphisColors.navy} opacity={0.85}>
          <Circle cx="160" cy="50" r="2.5" />
          <Circle cx="174" cy="50" r="2.5" />
          <Circle cx="188" cy="50" r="2.5" />
          <Circle cx="160" cy="64" r="2.5" />
          <Circle cx="174" cy="64" r="2.5" />
          <Circle cx="188" cy="64" r="2.5" />
        </G>

        {/* Outline Circle (diameter ~48px) with Teal Light Stroke */}
        <Circle
          cx="285"
          cy="95"
          r="24"
          stroke={MemphisColors.tealLight}
          strokeWidth="2"
          fill="none"
          opacity={0.9}
        />

        {/* Diagonal Slash across the outline circle */}
        <Line
          x1="248"
          y1="125"
          x2="315"
          y2="60"
          stroke={MemphisColors.navy}
          strokeWidth="2.5"
          strokeLinecap="round"
        />

        {/* Mini Cross (x) in Navy near top right */}
        <G stroke={MemphisColors.navy} strokeWidth="2.5" strokeLinecap="round">
          <Line x1="330" y1="28" x2="344" y2="42" />
          <Line x1="344" y1="28" x2="330" y2="42" />
        </G>
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    overflow: 'hidden',
    backgroundColor: '#FFFFFF',
  },
});
