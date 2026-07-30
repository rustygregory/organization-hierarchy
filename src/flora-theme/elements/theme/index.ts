import { DEFAULT_THEME as V9_THEME } from '@zendeskgarden/react-theming';
import { buttons, forms, menus, modals, notifications } from './overrides';
import { PALETTE } from '../palette';
import type { IGardenTheme } from '../../types';

/* Exclude product palette from the theme */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const { product, ...palette } = PALETTE;

const colors = {
  primaryHue: 'blue',
  dangerHue: 'red',
  warningHue: 'yellow',
  successHue: 'green',
  neutralHue: 'grey',
  chromeHue: 'kale',
  variables: {
    dark: {
      background: {
        default: 'neutralHue.1100',
        raised: 'neutralHue.1000',
        recessed: 'neutralHue.1200',
        subtle: 'neutralHue.1000',
        emphasis: 'neutralHue.600',
        success: 'successHue.1000',
        warning: 'warningHue.1000',
        danger: 'dangerHue.1000',
        primaryEmphasis: 'primaryHue.600',
        successEmphasis: 'successHue.600',
        warningEmphasis: 'warningHue.600',
        dangerEmphasis: 'dangerHue.600',
        disabled: 'rgba(white, 100)',
      },
      border: {
        default: 'neutralHue.800',
        emphasis: 'neutralHue.600',
        subtle: 'neutralHue.900',
        success: 'successHue.900',
        warning: 'warningHue.900',
        danger: 'dangerHue.900',
        primaryEmphasis: 'primaryHue.600',
        successEmphasis: 'successHue.600',
        warningEmphasis: 'warningHue.600',
        dangerEmphasis: 'dangerHue.600',
        disabled: 'neutralHue.800',
      },
      foreground: {
        default: 'neutralHue.300',
        subtle: 'neutralHue.500',
        onEmphasis: 'neutralHue.1100',
        primary: 'primaryHue.600',
        success: 'successHue.400',
        warning: 'warningHue.400',
        danger: 'dangerHue.400',
        successEmphasis: 'successHue.300',
        warningEmphasis: 'warningHue.300',
        dangerEmphasis: 'dangerHue.300',
        disabled: 'neutralHue.700',
      },
      shadow: {
        small: 'rgba(neutralHue.1200, 1100)',
        medium: 'rgba(neutralHue.1200, 800)',
        large: 'rgba(neutralHue.1200, 1000)',
      },
    },
    light: {
      background: {
        default: 'palette.white',
        raised: 'palette.white',
        recessed: 'neutralHue.100',
        subtle: 'neutralHue.100',
        emphasis: 'neutralHue.700',
        success: 'successHue.100',
        warning: 'warningHue.100',
        danger: 'dangerHue.100',
        primaryEmphasis: 'primaryHue.700',
        successEmphasis: 'successHue.700',
        warningEmphasis: 'warningHue.700',
        dangerEmphasis: 'dangerHue.700',
        disabled: 'rgba(neutralHue.700, 100)',
      },
      border: {
        default: 'neutralHue.300',
        emphasis: 'neutralHue.600',
        subtle: 'neutralHue.200',
        success: 'successHue.300',
        warning: 'warningHue.300',
        danger: 'dangerHue.300',
        primaryEmphasis: 'primaryHue.700',
        successEmphasis: 'successHue.700',
        warningEmphasis: 'warningHue.700',
        dangerEmphasis: 'dangerHue.700',
        disabled: 'neutralHue.300',
      },
      foreground: {
        default: 'neutralHue.900',
        subtle: 'neutralHue.700',
        onEmphasis: 'palette.white',
        primary: 'primaryHue.700',
        success: 'successHue.700',
        warning: 'warningHue.700',
        danger: 'dangerHue.700',
        successEmphasis: 'successHue.900',
        warningEmphasis: 'warningHue.900',
        dangerEmphasis: 'dangerHue.900',
        disabled: 'neutralHue.600',
      },
      shadow: {
        small: 'rgba(neutralHue.1200, 200)',
        medium: 'rgba(neutralHue.1200, 200)',
        large: 'rgba(neutralHue.1200, 200)',
      },
    },
  },
};

/**
 * Builds a Flora-flavored Garden theme by applying Flora overrides on top of
 * the provided `parentTheme`.
 *
 * Unlike `DEFAULT_THEME` (a static snapshot with no arguments), `getTheme`
 * accepts a pre-customised base theme. Use this when the consuming application
 * has already modified the Garden theme (e.g. set `colors.base` to `'dark'`,
 * added palette entries, or changed component overrides) and wants Flora's
 * borderRadii, component overrides, and color variables layered on top.
 *
 * @param parentTheme - The base Garden theme to extend. Defaults to the Garden
 *   v9 `DEFAULT_THEME`.
 * @returns A new `IGardenTheme` object with Flora overrides applied.
 */
// Theming
export const getTheme = (parentTheme = V9_THEME): IGardenTheme => ({
  ...parentTheme,

  components: {
    ...parentTheme.components,

    // Flora overwrites
    ...buttons,
    ...forms,
    ...menus,
    ...modals,
    ...notifications,
  },
  borders: {
    ...parentTheme.borders,
  },
  borderRadii: {
    ...parentTheme.borderRadii,

    // Flora overwrites
    xs: '2px',
    sm: '4px',
    md: '8px',
    lg: '12px',
    xl: '16px',
    xxl: '24px',
    full: '9999px',
  },
  borderStyles: {
    ...parentTheme.borderStyles,
  },
  borderWidths: {
    ...parentTheme.borderWidths,
  },
  breakpoints: {
    ...parentTheme.breakpoints,
  },
  fonts: {
    ...parentTheme.fonts,
  },
  fontSizes: {
    ...parentTheme.fontSizes,
  },
  fontWeights: {
    ...parentTheme.fontWeights,
  },
  iconSizes: {
    ...parentTheme.iconSizes,
  },
  lineHeights: {
    ...parentTheme.lineHeights,
  },
  opacity: {
    ...parentTheme.opacity,
  },
  shadowWidths: {
    ...parentTheme.shadowWidths,
  },
  shadows: {
    ...parentTheme.shadows,
  },
  space: {
    ...parentTheme.space,
  },
  colors: {
    ...parentTheme.colors,
    ...colors,
    base: parentTheme.colors?.base ?? ('light' as const),
  },
  palette: {
    ...parentTheme.palette,
    ...palette,
  },
});

export const DEFAULT_THEME: IGardenTheme = getTheme();
