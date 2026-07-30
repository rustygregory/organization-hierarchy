import { css } from 'styled-components';
import { getColor } from '@zendeskgarden/react-theming';
import type { IGardenTheme } from '../../../../types';
import { checkedColors } from './checkbox';

// Style overwrite for radio
// prettier-ignore
export const radio = ({ theme }: { theme: IGardenTheme }) => {
  const { bg, hoverBg, activeBg, disabledBg } = checkedColors(theme);

  // Unchecked border colors
  const controlBorder  = getColor({ theme, hue: 'neutralHue', light: { shade: 500 }, dark: { shade: 600 } });
  const disabledBorder = getColor({ theme, variable: 'border.disabled' });

  // Unchecked hover / active tints
  const hoverBgTint    = getColor({ theme, variable: 'background.primaryEmphasis', transparency: theme.opacity[100] });
  const activeBgTint   = getColor({ theme, variable: 'background.primaryEmphasis', transparency: theme.opacity[200] });
  const hoverBorder    = getColor({ theme, variable: 'border.primaryEmphasis' });

  return css`
    /* Unchecked default */
    &&:not(:checked) ~ label::before {
      background-color: transparent;
      border: ${theme.borderWidths.sm} solid ${controlBorder};
    }

    /* Unchecked hover */
    &&:enabled:not(:checked) ~ label:hover::before {
      background-color: ${hoverBgTint};
      border-color: ${hoverBorder};
    }

    /* Unchecked active */
    &&:enabled:not(:checked) ~ label:active::before {
      background-color: ${activeBgTint};
      border-color: ${hoverBorder};
    }

    /* Unchecked disabled */
    &&:disabled:not(:checked) ~ label::before {
      background-color: transparent;
      border-color: ${disabledBorder};
    }

    /* Checked default: solid neutral fill */
    &&:checked ~ label::before {
      background-color: ${bg};
      border: ${theme.borderWidths.sm} solid transparent;
    }

    /* Checked hover */
    &&:enabled:checked ~ label:hover::before {
      background-color: ${hoverBg};
    }

    /* Checked active */
    &&:enabled:checked ~ label:active::before {
      background-color: ${activeBg};
    }

    /* Checked disabled */
    &&:disabled:checked ~ label::before {
      background-color: ${disabledBg};
    }
  `;
};
