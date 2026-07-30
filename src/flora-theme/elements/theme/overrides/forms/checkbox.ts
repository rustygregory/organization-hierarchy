import { css } from 'styled-components';
import { getColor } from '@zendeskgarden/react-theming';
import type { IGardenTheme } from '../../../../types';

// Checked-state colors: neutral dark treatment (matching primary button colors)
// prettier-ignore
export const checkedColors = (theme: IGardenTheme) => ({
  bg:         getColor({ theme, hue: 'neutralHue', light: { shade: 900 }, dark: { shade: 300 } }),
  hoverBg:    getColor({ theme, hue: 'neutralHue', light: { shade: 800 }, dark: { shade: 200 } }),
  activeBg:   getColor({ theme, hue: 'neutralHue', light: { shade: 700 }, dark: { shade: 100 } }),
  disabledBg: getColor({theme, hue: 'neutralHue',  light: { shade: 700 }, dark: { hue: 'white' }, transparency: theme.opacity[300] }),
});

// Style overwrite for checkbox
// prettier-ignore
export const checkbox = ({ theme }: { theme: IGardenTheme }) => {
  const { bg, hoverBg, activeBg, disabledBg } = checkedColors(theme);

  // Unchecked border colors
  const controlBorder  = getColor({ theme, hue: 'neutralHue', light: { shade: 500 }, dark: { shade: 600 } });
  const disabledBorder = getColor({ theme, variable: 'border.disabled' });

  // Unchecked hover / active tints
  const hoverBgTint    = getColor({ theme, variable: 'background.primaryEmphasis', transparency: theme.opacity[100] });
  const activeBgTint   = getColor({ theme, variable: 'background.primaryEmphasis', transparency: theme.opacity[200] });
  const hoverBorder    = getColor({ theme, variable: 'border.primaryEmphasis' });

  return css`
    /* Shape */
    && ~ label::before {
      border-radius: ${theme.borderRadii.sm};
    }

    /* Unchecked default */
    &&:not(:checked):not(:indeterminate) ~ label::before {
      background-color: transparent;
      border: ${theme.borderWidths.sm} solid ${controlBorder};
    }

    /* Unchecked hover */
    &&:enabled:not(:checked):not(:indeterminate) ~ label:hover::before {
      background-color: ${hoverBgTint};
      border-color: ${hoverBorder};
    }

    /* Unchecked active */
    &&:enabled:not(:checked):not(:indeterminate) ~ label:active::before {
      background-color: ${activeBgTint};
      border-color: ${hoverBorder};
    }

    /* Unchecked disabled */
    &&:disabled:not(:checked):not(:indeterminate) ~ label::before {
      background-color: transparent;
      border-color: ${disabledBorder};
    }

    /* Checked / indeterminate default: solid neutral fill */
    &&:checked ~ label::before,
    &&:indeterminate ~ label::before {
      background-color: ${bg};
      border: ${theme.borderWidths.sm} solid transparent;
    }

    /* Checked / indeterminate hover */
    &&:enabled:checked ~ label:hover::before,
    &&:enabled:indeterminate ~ label:hover::before {
      background-color: ${hoverBg};
    }

    /* Checked / indeterminate active */
    &&:enabled:checked ~ label:active::before,
    &&:enabled:indeterminate ~ label:active::before {
      background-color: ${activeBg};
    }

    /* Checked / indeterminate disabled */
    &&:disabled:checked ~ label::before,
    &&:disabled:indeterminate ~ label::before {
      background-color: ${disabledBg};
    }

    /* Check / dash icon: white when checked */
    &&:checked ~ label > svg,
    &&:indeterminate ~ label > svg {
      color: ${getColor({ theme, variable: 'foreground.onEmphasis' })};
    }
  `;
};
