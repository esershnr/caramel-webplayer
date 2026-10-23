export { DRAWER_TABS, isDrawerTab, visibleTabs, resolveTab, chaptersPresent, type DrawerTab } from './tabs.js';
export {
  SWIPE_MIN_DISTANCE,
  SWIPE_MIN_VELOCITY,
  SWIPE_SLOP,
  SWIPE_WIDTH_RATIO,
  swipeDecision,
  type SwipeInput,
  type SwipeOptions,
} from './swipe.js';
export { LAST_TAB_KEY, readLastTab, writeLastTab } from './session.js';
export { DRAWER_KEYS, DRAWER_DEFAULTS, registerDrawerI18n } from './i18n.js';
export { CaramelDrawerElement, type DrawerToggleDetail, type DrawerTabDetail } from './element.js';
export { defineCaramelDrawer } from './define.js';
