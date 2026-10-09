import {
  Airplay,
  Captions,
  CaptionsOff,
  Cast,
  Check,
  ChevronRight,
  Gauge,
  Languages,
  ListVideo,
  LoaderCircle,
  Maximize,
  Menu,
  Minimize,
  Pause,
  PictureInPicture2,
  Play,
  RotateCcw,
  RotateCw,
  Settings,
  SkipBack,
  SkipForward,
  SlidersHorizontal,
  Volume1,
  Volume2,
  VolumeX,
  X,
  type IconNode,
} from 'lucide';

export type { IconNode };

/**
 * Player icon registry. Keys are the semantic names used in skin markup and
 * by <esp-morph-icon>. Values are Lucide IconNode data (24x24, stroke).
 */
export const icons = {
  play: Play,
  pause: Pause,
  restart: RotateCcw,
  'seek-back': RotateCcw,
  'seek-forward': RotateCw,
  'skip-back': SkipBack,
  'skip-forward': SkipForward,
  'volume-high': Volume2,
  'volume-low': Volume1,
  'volume-off': VolumeX,
  'fullscreen-enter': Maximize,
  'fullscreen-exit': Minimize,
  'pip-enter': PictureInPicture2,
  'pip-exit': PictureInPicture2,
  'captions-on': Captions,
  'captions-off': CaptionsOff,
  settings: Settings,
  speed: Gauge,
  quality: SlidersHorizontal,
  speech: Languages,
  cast: Cast,
  airplay: Airplay,
  check: Check,
  chevron: ChevronRight,
  spinner: LoaderCircle,
  menu: Menu,
  close: X,
  playlist: ListVideo,
} as const satisfies Record<string, IconNode>;

export type IconName = keyof typeof icons;

export function isIconName(value: string): value is IconName {
  return Object.hasOwn(icons, value);
}

export function getIcon(name: string): IconNode | undefined {
  return isIconName(name) ? icons[name] : undefined;
}
