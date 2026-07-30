import { css } from 'styled-components';
import { getColor } from '@zendeskgarden/react-theming';
import { stateStyles, type IButtonThemeProps, type IStateColors } from './button';

export const iconButton = ({ theme, $isPill, $isPrimary, $isBasic, $isDanger }: IButtonThemeProps) => {
  const colors: Omit<IStateColors, 'theme'> = {};

  // prettier-ignore
  if ($isPrimary && $isDanger) {
    colors.bg           = getColor({ theme, variable: 'background.dangerEmphasis' });
    colors.fg           = getColor({ theme, variable: 'foreground.onEmphasis' });
    colors.hoverBg      = getColor({ theme, variable: 'background.dangerEmphasis', light: { offset: 100 }, dark: { offset: -100 } });
    colors.activeBg     = getColor({ theme, variable: 'background.dangerEmphasis', light: { offset: 200 }, dark: { offset: -200 } });
    colors.disabledBg   = getColor({ theme, hue: 'neutralHue',                     light: { shade:  700 }, dark: { hue: 'white' }, transparency: theme.opacity[100] });

  } else if ($isPrimary) {
    colors.bg           = getColor({ theme, hue: 'neutralHue',                     light: { shade:  900 }, dark: { shade: 300 } });
    colors.fg           = getColor({ theme, variable: 'foreground.onEmphasis',     light: { offset:   0 }, dark: { offset:  0 } });
    colors.hoverBg      = getColor({ theme, hue: 'neutralHue',                     light: { shade:  800 }, dark: { shade: 200 } });
    colors.activeBg     = getColor({ theme, hue: 'neutralHue',                     light: { shade:  700 }, dark: { shade: 100 } });
    colors.disabledBg   = getColor({ theme, hue: 'neutralHue',                     light: { shade:  700 }, dark: { hue: 'white' }, transparency: theme.opacity[100] });

  } else if ($isDanger && !$isBasic) {
    colors.fg           = getColor({ theme, variable: 'foreground.danger' });
    colors.border       = getColor({ theme, variable: 'border.dangerEmphasis' });
    colors.hoverFg      = getColor({ theme, variable: 'foreground.danger',         light: { offset: 100 }, dark: { offset: -100 } });
    colors.hoverBg      = getColor({ theme, variable: 'background.dangerEmphasis', light: { offset:   0 }, dark: { offset:    0 }, transparency: theme.opacity[100] });
    colors.hoverBorder  = getColor({ theme, variable: 'border.dangerEmphasis',     light: { offset: 100 }, dark: { offset: -100 } });
    colors.activeFg     = getColor({ theme, variable: 'foreground.danger',         light: { offset: 200 }, dark: { offset: -200 } });
    colors.activeBg     = getColor({ theme, variable: 'background.dangerEmphasis', light: { offset:   0 }, dark: { offset:    0 }, transparency: theme.opacity[200] });
    colors.activeBorder = getColor({ theme, variable: 'border.dangerEmphasis',     light: { offset: 200 }, dark: { offset: -200 } });

  } else if ($isDanger) {
    colors.fg           = getColor({ theme, variable: 'foreground.danger' });
    colors.hoverFg      = getColor({ theme, variable: 'foreground.danger',         light: { offset: 100 }, dark: { offset: -100 } });
    colors.hoverBg      = getColor({ theme, variable: 'background.dangerEmphasis', light: { offset:   0 }, dark: { offset:    0 }, transparency: theme.opacity[100] });
    colors.activeFg     = getColor({ theme, variable: 'foreground.danger',         light: { offset: 200 }, dark: { offset: -200 } });
    colors.activeBg     = getColor({ theme, variable: 'background.dangerEmphasis', light: { offset:   0 }, dark: { offset:    0 }, transparency: theme.opacity[200] });

  } else if ($isBasic) {
    colors.fg           = getColor({ theme, hue: 'neutralHue',                     light: { shade:  700 }, dark: { shade:   500 } });
    colors.hoverFg      = getColor({ theme, hue: 'neutralHue',                     light: { shade:  800 }, dark: { shade:   400 } });
    colors.hoverBg      = getColor({ theme, hue: 'neutralHue',                     light: { shade:  700 }, dark: { hue: 'white' }, transparency: theme.opacity[100] });
    colors.activeFg     = getColor({ theme, hue: 'neutralHue',                     light: { shade:  900 }, dark: { shade:   300 } });
    colors.activeBg     = getColor({ theme, hue: 'neutralHue',                     light: { shade:  700 }, dark: { hue: 'white' }, transparency: theme.opacity[200] });

  } else {
    colors.fg           = getColor({ theme, hue: 'neutralHue',                     light: { shade:  700 }, dark: { shade:   500 } });
    colors.border       = getColor({ theme, hue: 'neutralHue',                     light: { shade: 500  }, dark: { shade:   600 } });
    colors.hoverFg      = getColor({ theme, hue: 'neutralHue',                     light: { shade: 800  }, dark: { shade:   400 } });
    colors.hoverBg      = getColor({ theme, hue: 'neutralHue',                     light: { shade: 700  }, dark: { hue: 'white' }, transparency: theme.opacity[100] });
    colors.hoverBorder  = getColor({ theme, hue: 'neutralHue',                     light: { shade: 600  }, dark: { shade:   700 } });
    colors.activeFg     = getColor({ theme, hue: 'neutralHue',                     light: { shade: 900  }, dark: { shade:   300 } });
    colors.activeBg     = getColor({ theme, hue: 'neutralHue',                     light: { shade: 700  }, dark: { hue: 'white' }, transparency: theme.opacity[200] });
    colors.activeBorder = getColor({ theme, hue: 'neutralHue',                     light: { shade: 700  }, dark: { shade:   400 } });
  }

  return css`
    border-radius: ${$isPill === false ? theme.borderRadii.md : theme.borderRadii.full};
    ${stateStyles({ theme, ...colors })}

    && svg {
      width: ${theme.space.md};
      height: ${theme.space.md};
    }
  `;
};
