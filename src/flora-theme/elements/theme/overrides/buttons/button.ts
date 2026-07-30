import { css } from 'styled-components';
import { getColor } from '@zendeskgarden/react-theming';
import type { IGardenTheme } from '../../../../types';

// Type for theming props
export interface IButtonThemeProps {
  theme: IGardenTheme;
  $isPill?: boolean;
  $isPrimary?: boolean;
  $isBasic?: boolean;
  $isNeutral?: boolean;
  $isDanger?: boolean;
  $isLink?: boolean;
}

// State color map
export interface IStateColors {
  theme: IGardenTheme;
  fg?: string;
  bg?: string;
  border?: string;
  hoverFg?: string;
  hoverBg?: string;
  hoverBorder?: string;
  activeFg?: string;
  activeBg?: string;
  activeBorder?: string;
  disabledBg?: string;
  disabledBorder?: string;
}

// Helper function to generate state styles
export const stateStyles = (color: IStateColors) => css`
  ${color.fg && `color: ${color.fg};`}
  ${color.bg && `background-color: ${color.bg};`}
  ${color.border && `border-color: ${color.border};`}

  &:hover {
    ${color.hoverFg && `color: ${color.hoverFg};`}
    ${color.hoverBg && `background-color: ${color.hoverBg};`}
    ${color.hoverBorder && `border-color: ${color.hoverBorder};`}
  }

  &:active,
  &[aria-pressed='true'],
  &[aria-pressed='mixed'] {
    ${color.activeFg && `color: ${color.activeFg};`}
    ${color.activeBg && `background-color: ${color.activeBg};`}
    ${color.activeBorder && `border-color: ${color.activeBorder};`}
  }

  &:disabled {
    color: ${getColor({ theme: color.theme, variable: 'foreground.disabled' })};
    ${color.disabledBg && `background-color: ${color.disabledBg};`}
    ${color.disabledBorder && `border-color: ${color.disabledBorder};`}
  }
`;

// Style overwrites
export const button = ({ theme, $isPill, $isPrimary, $isBasic, $isNeutral, $isDanger, $isLink }: IButtonThemeProps) => {
  const colors: Omit<IStateColors, 'theme'> = {};

  // prettier-ignore
  if ($isLink && $isDanger) {
    colors.fg           = getColor({ theme, variable: 'foreground.danger' });
    colors.hoverFg      = getColor({ theme, variable: 'foreground.danger',         light: { offset: 100 }, dark: { offset: -100  }});
    colors.activeFg     = getColor({ theme, variable: 'foreground.danger',         light: { offset: 200 }, dark: { offset: -200 }});

  } else if ($isLink) {
    colors.fg           = getColor({ theme, variable: 'foreground.primary' });
    colors.hoverFg      = getColor({ theme, variable: 'foreground.primary',        light: { offset: 100 }, dark: { offset: -100  }});
    colors.activeFg     = getColor({ theme, variable: 'foreground.primary',        light: { offset: 200 }, dark: { offset: -200 } });

  } else if ($isPrimary && $isDanger) {
    colors.bg           = getColor({ theme, variable: 'background.dangerEmphasis' });
    colors.fg           = getColor({ theme, variable: 'foreground.onEmphasis' });
    colors.hoverBg      = getColor({ theme, variable: 'background.dangerEmphasis', light: { offset: 100 }, dark: { offset: -100 } });
    colors.activeBg     = getColor({ theme, variable: 'background.dangerEmphasis', light: { offset: 200 }, dark: { offset: -200 } });
    colors.disabledBg   = getColor({ theme, hue: 'neutralHue',                     light: { shade:  700 }, dark: { hue: 'white' }, transparency: theme.opacity[100] });

  } else if ($isPrimary) {
    colors.bg           = getColor({ theme, hue: 'neutralHue',                     light: { shade:  900 }, dark: { shade:   300 } });
    colors.fg           = getColor({ theme, variable: 'foreground.onEmphasis',     light: { offset:   0 }, dark: { offset:    0 } });
    colors.hoverBg      = getColor({ theme, hue: 'neutralHue',                     light: { shade:  800 }, dark: { shade:   200 } });
    colors.activeBg     = getColor({ theme, hue: 'neutralHue',                     light: { shade:  700 }, dark: { shade:   100 } });
    colors.disabledBg   = getColor({ theme, hue: 'neutralHue',                     light: { shade:  700 }, dark: { hue: 'white' }, transparency: theme.opacity[100] });

  } else if ($isBasic && $isDanger) {
    colors.fg           = getColor({ theme, variable: 'foreground.danger' });
    colors.hoverFg      = getColor({ theme, variable: 'foreground.danger',         light: { offset: 100 }, dark: { offset: -100 } });
    colors.hoverBg      = getColor({ theme, variable: 'background.dangerEmphasis', light: { offset:   0 }, dark: { offset:    0 }, transparency: theme.opacity[100] });
    colors.activeFg     = getColor({ theme, variable: 'foreground.danger',         light: { offset: 200 }, dark: { offset: -200 } });
    colors.activeBg     = getColor({ theme, variable: 'background.dangerEmphasis', light: { offset:   0 }, dark: { offset:    0 }, transparency: theme.opacity[200] });
    colors.disabledBg   = getColor({ theme, hue: 'neutralHue',                     light: { shade:  700 }, dark: { hue: 'white' }, transparency: theme.opacity[100] });

  } else if ($isBasic) {
    colors.fg           = getColor({ theme, hue: 'neutralHue',                     light: { shade:  900 }, dark: { shade:   300 } });
    colors.hoverFg      = getColor({ theme, hue: 'neutralHue',                     light: { shade:  900 }, dark: { shade:   300 } });
    colors.hoverBg      = getColor({ theme, hue: 'neutralHue',                     light: { shade:  700 }, dark: { hue: 'white' }, transparency: theme.opacity[100] });
    colors.activeFg     = getColor({ theme, hue: 'neutralHue',                     light: { shade:  900 }, dark: { shade:   300 } });
    colors.activeBg     = getColor({ theme, hue: 'neutralHue',                     light: { shade:  700 }, dark: { hue: 'white' }, transparency: theme.opacity[200] });
    colors.disabledBg   = getColor({ theme, hue: 'neutralHue',                     light: { shade:  700 }, dark: { hue: 'white' }, transparency: theme.opacity[100] });

  } else if ($isDanger) {
    colors.fg           = getColor({ theme, variable: 'foreground.danger' });
    colors.border       = getColor({ theme, variable: 'border.dangerEmphasis' });
    colors.hoverFg      = getColor({ theme, variable: 'foreground.danger',         light: { offset: 100 }, dark: { offset: -100 } });
    colors.hoverBg      = getColor({ theme, variable: 'background.dangerEmphasis', light: { offset:   0 }, dark: { offset:    0 }, transparency: theme.opacity[100] });
    colors.hoverBorder  = getColor({ theme, variable: 'border.dangerEmphasis',     light: { offset: 100 }, dark: { offset: -100 } });
    colors.activeFg     = getColor({ theme, variable: 'foreground.danger',         light: { offset: 200 }, dark: { offset: -200 } });
    colors.activeBg     = getColor({ theme, variable: 'background.dangerEmphasis', light: { offset:   0 }, dark: { offset:    0 }, transparency: theme.opacity[200] });
    colors.activeBorder = getColor({ theme, variable: 'border.dangerEmphasis',     light: { offset: 200 }, dark: { offset: -200 }});
    colors.disabledBg   = getColor({ theme, hue: 'neutralHue',                     light: { shade:  700 }, dark: { hue: 'white' }, transparency: theme.opacity[100] });

  } else {
    colors.fg           = getColor({ theme, hue: 'neutralHue',                     light: { shade:  900 }, dark: { shade:   300 } });
    colors.border       = getColor({ theme, hue: 'neutralHue',                     light: { shade:  500 }, dark: { shade:   600 } });
    colors.hoverFg      = getColor({ theme, hue: 'neutralHue',                     light: { shade:  900 }, dark: { shade:   300 } });
    colors.hoverBg      = getColor({ theme, hue: 'neutralHue',                     light: { shade:  700 }, dark: { hue: 'white' }, transparency: theme.opacity[100] });
    colors.hoverBorder  = getColor({ theme, hue: 'neutralHue',                     light: { shade:  600 }, dark: { shade:   500 } });
    colors.activeFg     = getColor({ theme, hue: 'neutralHue',                     light: { shade:  900 }, dark: { shade:   300 } });
    colors.activeBg     = getColor({ theme, hue: 'neutralHue',                     light: { shade:  700 }, dark: { hue: 'white' }, transparency: theme.opacity[200] });
    colors.activeBorder   = getColor({ theme, hue: 'neutralHue',                     light: { shade:  700 }, dark: { shade:   400 } });
    colors.disabledBg     = getColor({ theme, hue: 'neutralHue',                     light: { shade:  700 }, dark: { hue: 'white' }, transparency: theme.opacity[100] });
    colors.disabledBorder = 'transparent';
  }

  // prettier-ignore
  if ($isNeutral === false && !$isPrimary && !$isLink && !$isDanger) {
    colors.fg       = getColor({ theme, variable: 'foreground.primary' });
    colors.hoverFg  = getColor({ theme, variable: 'foreground.primary', light: { offset: 100 }, dark: { offset: -100 } });
    colors.activeFg = getColor({ theme, variable: 'foreground.primary', light: { offset: 200 }, dark: { offset: -200 } });
  }

  return css`
    ${!$isLink && `font-weight: ${theme.fontWeights.semibold};`}
    border-radius: ${$isLink || $isPill === false ? theme.borderRadii.md : theme.borderRadii.full};
    ${stateStyles({ theme, ...colors })}

    && svg {
      width: ${theme.space.md};
      height: ${theme.space.md};
    }
  `;
};
