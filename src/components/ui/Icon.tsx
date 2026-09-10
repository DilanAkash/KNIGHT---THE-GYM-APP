import { memo } from 'react';
import Svg, { Circle, Path, Polyline, Rect, type SvgProps } from 'react-native-svg';
import { palette } from '@/theme';

/**
 * Hand-drawn icon set rather than a vector-icon package.
 *
 * Everything is a 24px grid, 1.8px stroke, round caps and joins — the
 * consistency of that is what makes an interface look drawn by one person.
 * Pulling in Feather/Ionicons would mean inheriting three different weights.
 */
export type IconName =
  | 'plus'
  | 'minus'
  | 'check'
  | 'close'
  | 'chevronRight'
  | 'chevronLeft'
  | 'chevronDown'
  | 'chevronUp'
  | 'arrowUpRight'
  | 'arrowRight'
  | 'play'
  | 'pause'
  | 'clock'
  | 'sliders'
  | 'search'
  | 'trash'
  | 'edit'
  | 'more'
  | 'trophy'
  | 'target'
  | 'calendar'
  | 'camera'
  | 'droplet'
  | 'flame'
  | 'user'
  | 'activity'
  | 'barChart'
  | 'layers'
  | 'dumbbell'
  | 'bolt'
  | 'grip'
  | 'copy'
  | 'note'
  | 'filter'
  | 'refresh'
  | 'info'
  | 'alert'
  | 'star'
  | 'swap'
  | 'scale'
  | 'plate'
  | 'home';

export interface IconProps extends Omit<SvgProps, 'width' | 'height'> {
  name: IconName;
  size?: number;
  color?: string;
  strokeWidth?: number;
}

export const Icon = memo(function Icon({
  name,
  size = 22,
  color = palette.textPrimary,
  strokeWidth = 1.8,
  ...rest
}: IconProps) {
  const stroke = {
    stroke: color,
    strokeWidth,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    fill: 'none' as const,
  };

  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" {...rest}>
      {renderPaths(name, stroke, color)}
    </Svg>
  );
});

type StrokeProps = {
  stroke: string;
  strokeWidth: number;
  strokeLinecap: 'round';
  strokeLinejoin: 'round';
  fill: 'none';
};

function renderPaths(name: IconName, s: StrokeProps, color: string) {
  switch (name) {
    case 'plus':
      return <Path {...s} d="M12 5v14M5 12h14" />;
    case 'minus':
      return <Path {...s} d="M5 12h14" />;
    case 'check':
      return <Path {...s} d="M20 6.5 9.5 17 4 11.5" />;
    case 'close':
      return <Path {...s} d="M18 6 6 18M6 6l12 12" />;
    case 'chevronRight':
      return <Path {...s} d="m9.5 18 6-6-6-6" />;
    case 'chevronLeft':
      return <Path {...s} d="m14.5 18-6-6 6-6" />;
    case 'chevronDown':
      return <Path {...s} d="m6 9.5 6 6 6-6" />;
    case 'chevronUp':
      return <Path {...s} d="m6 14.5 6-6 6 6" />;
    case 'arrowUpRight':
      return <Path {...s} d="M7 17 17 7M8 7h9v9" />;
    case 'arrowRight':
      return <Path {...s} d="M4 12h15M13 6l6 6-6 6" />;
    case 'play':
      return <Path d="M7 4.8v14.4L19.5 12z" fill={color} stroke={color} strokeWidth={s.strokeWidth} strokeLinejoin="round" />;
    case 'pause':
      return <Path {...s} strokeWidth={s.strokeWidth + 0.6} d="M9 5v14M15 5v14" />;
    case 'clock':
      return (
        <>
          <Circle {...s} cx={12} cy={12} r={9} />
          <Path {...s} d="M12 6.8V12l3.6 2.1" />
        </>
      );
    case 'sliders':
      return (
        <>
          <Path {...s} d="M5 21v-6M5 11V3M12 21v-9M12 8V3M19 21v-4M19 13V3" />
          <Path {...s} d="M2.5 15h5M9.5 8h5M16.5 17h5" />
        </>
      );
    case 'search':
      return (
        <>
          <Circle {...s} cx={11} cy={11} r={7} />
          <Path {...s} d="m20 20-3.6-3.6" />
        </>
      );
    case 'trash':
      return (
        <>
          <Path {...s} d="M3.5 6h17M9 6V4h6v2" />
          <Path {...s} d="M18.5 6 17.6 20H6.4L5.5 6" />
          <Path {...s} d="M10 10.5v6M14 10.5v6" />
        </>
      );
    case 'edit':
      return <Path {...s} d="M12.5 20H21M16.4 3.6a2.1 2.1 0 0 1 3 3L7.5 18.5 3.5 20l1.5-4z" />;
    case 'more':
      return (
        <>
          <Circle cx={12} cy={5} r={1.7} fill={color} />
          <Circle cx={12} cy={12} r={1.7} fill={color} />
          <Circle cx={12} cy={19} r={1.7} fill={color} />
        </>
      );
    case 'trophy':
      return (
        <>
          <Path {...s} d="M7.5 3.5h9V9a4.5 4.5 0 0 1-9 0z" />
          <Path {...s} d="M7.5 5.5H4v1.8A3.2 3.2 0 0 0 7.2 10.5M16.5 5.5H20v1.8a3.2 3.2 0 0 1-3.2 3.2" />
          <Path {...s} d="M12 13.5V17M9 20.5h6" />
        </>
      );
    case 'target':
      return (
        <>
          <Circle {...s} cx={12} cy={12} r={8.5} />
          <Circle {...s} cx={12} cy={12} r={4.5} />
          <Circle cx={12} cy={12} r={1.6} fill={color} />
        </>
      );
    case 'calendar':
      return (
        <>
          <Rect {...s} x={3.5} y={5} width={17} height={15.5} rx={3} />
          <Path {...s} d="M8 3v4M16 3v4M3.5 10h17" />
        </>
      );
    case 'camera':
      return (
        <>
          <Path {...s} d="M4 8h3l1.8-2.2h6.4L17 8h3a1.5 1.5 0 0 1 1.5 1.5v9A1.5 1.5 0 0 1 20 20H4a1.5 1.5 0 0 1-1.5-1.5v-9A1.5 1.5 0 0 1 4 8z" />
          <Circle {...s} cx={12} cy={13.5} r={3.6} />
        </>
      );
    case 'droplet':
      return <Path {...s} d="M12 3s6.2 6.6 6.2 10.6a6.2 6.2 0 0 1-12.4 0C5.8 9.6 12 3 12 3z" />;
    case 'flame':
      return (
        <>
          <Path {...s} d="M12.5 2.5c3.2 4.2 5 5.8 5 9.3a5.5 5.5 0 0 1-11 0c0-2.3 1.1-3.6 2.3-4.6.1 1.7 1 2.4 1.6 2.4.6-2.2-1.1-4.4 2.1-7.1z" />
        </>
      );
    case 'user':
      return (
        <>
          <Circle {...s} cx={12} cy={8} r={4} />
          <Path {...s} d="M4.5 20.5a7.5 7.5 0 0 1 15 0" />
        </>
      );
    case 'activity':
      return <Polyline {...s} points="3,15 7.5,9 11.5,12.5 16,5 21,11" />;
    case 'barChart':
      return <Path {...s} d="M6 20.5V11M12 20.5V3.5M18 20.5v-6.5" strokeWidth={s.strokeWidth + 0.4} />;
    case 'layers':
      return (
        <>
          <Path {...s} d="m12 3 8.5 4.5L12 12 3.5 7.5 12 3z" />
          <Path {...s} d="m3.5 12.5 8.5 4.5 8.5-4.5" />
          <Path {...s} d="m3.5 17 8.5 4.5 8.5-4.5" />
        </>
      );
    case 'dumbbell':
      return (
        <>
          <Path {...s} d="M3.5 9.5v5M6.5 6.5v11M17.5 6.5v11M20.5 9.5v5" strokeWidth={s.strokeWidth + 0.3} />
          <Path {...s} d="M6.5 12h11" />
        </>
      );
    case 'bolt':
      return <Path {...s} d="M13.5 2.5 5 13.5h6l-.5 8L19 10.5h-6l.5-8z" />;
    case 'grip':
      return (
        <>
          <Circle cx={9} cy={7} r={1.5} fill={color} />
          <Circle cx={15} cy={7} r={1.5} fill={color} />
          <Circle cx={9} cy={12} r={1.5} fill={color} />
          <Circle cx={15} cy={12} r={1.5} fill={color} />
          <Circle cx={9} cy={17} r={1.5} fill={color} />
          <Circle cx={15} cy={17} r={1.5} fill={color} />
        </>
      );
    case 'copy':
      return (
        <>
          <Rect {...s} x={8.5} y={8.5} width={12} height={12} rx={3} />
          <Path {...s} d="M5 15.5H4.5A1.5 1.5 0 0 1 3 14V5a1.5 1.5 0 0 1 1.5-1.5H14A1.5 1.5 0 0 1 15.5 5v.5" />
        </>
      );
    case 'note':
      return (
        <>
          <Path {...s} d="M5 3.5h9L19 8.5v12H5z" />
          <Path {...s} d="M14 3.5v5h5" />
        </>
      );
    case 'filter':
      return <Path {...s} d="M3.5 5h17l-6.8 8v6.2l-3.4 1.8V13z" />;
    case 'refresh':
      return (
        <>
          <Path {...s} d="M20.5 12a8.5 8.5 0 1 1-2.6-6.1" />
          <Path {...s} d="M20.5 3.5v5h-5" />
        </>
      );
    case 'info':
      return (
        <>
          <Circle {...s} cx={12} cy={12} r={9} />
          <Path {...s} d="M12 11v6" />
          <Circle cx={12} cy={7.6} r={1.1} fill={color} />
        </>
      );
    case 'alert':
      return (
        <>
          <Path {...s} d="M12 3.2 21 19.5H3z" />
          <Path {...s} d="M12 9.5v4.5" />
          <Circle cx={12} cy={16.8} r={1.05} fill={color} />
        </>
      );
    case 'star':
      return <Path {...s} d="m12 3 2.7 5.7 6.3.8-4.6 4.3 1.2 6.2-5.6-3-5.6 3 1.2-6.2L3 9.5l6.3-.8z" />;
    case 'swap':
      return (
        <>
          <Path {...s} d="m16.5 3 4 4-4 4" />
          <Path {...s} d="M20.5 7H8a4 4 0 0 0-4 4" />
          <Path {...s} d="m7.5 21-4-4 4-4" />
          <Path {...s} d="M3.5 17H16a4 4 0 0 0 4-4" />
        </>
      );
    case 'scale':
      return (
        <>
          <Rect {...s} x={3.5} y={4.5} width={17} height={15} rx={3.5} />
          <Path {...s} d="M12 8.5v3M8.5 9.8l1.6 2M15.5 9.8l-1.6 2" />
          <Path {...s} d="M7.5 15.5h9" />
        </>
      );
    case 'plate':
      return (
        <>
          <Circle {...s} cx={12} cy={12} r={8.5} />
          <Circle {...s} cx={12} cy={12} r={3} />
        </>
      );
    case 'home':
      return (
        <>
          <Path {...s} d="m3.5 10.5 8.5-7 8.5 7" />
          <Path {...s} d="M5.5 9v11.5h13V9" />
        </>
      );
    default:
      return null;
  }
}
