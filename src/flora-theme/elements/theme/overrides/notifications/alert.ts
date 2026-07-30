import { css } from 'styled-components';
import { getColor } from '@zendeskgarden/react-theming';
import type { IGardenTheme } from '../../../../types';

// Type for theming props
export interface INotificationsThemeProps {
  theme: IGardenTheme;
  $type?: 'success' | 'warning' | 'error' | 'info';
}

// Alert background color per type
const getAlertBackground = ({ theme, $type }: INotificationsThemeProps) => {
  // prettier-ignore
  switch ($type) {
    case 'success': return getColor({ theme, hue: 'successHue', light: { shade: 200 }, dark: { shade: 900 } });
    case 'error':   return getColor({ theme, hue: 'dangerHue',  light: { shade: 200 }, dark: { shade: 900 } });
    case 'warning': return getColor({ theme, hue: 'warningHue', light: { shade: 200 }, dark: { shade: 900 } });
    case 'info':    return getColor({ theme, hue: 'neutralHue', light: { shade: 200 }, dark: { shade: 900 } });
    default:        return getColor({ theme, hue: 'neutralHue', light: { shade: 200 }, dark: { shade: 900 } });
  }
};

// Alert foreground color per type
const getAlertForeground = ({ theme, $type }: INotificationsThemeProps) => {
  // prettier-ignore
  switch ($type) {
    case 'success': return getColor({ theme, variable: 'foreground.successEmphasis' });
    case 'error':   return getColor({ theme, variable: 'foreground.dangerEmphasis' });
    case 'warning': return getColor({ theme, variable: 'foreground.warningEmphasis' });
    case 'info':    return getColor({ theme, variable: 'foreground.default' });
    default:        return getColor({ theme, variable: 'foreground.default' });
  }
};

// Alert-specific overrides
export const alert = ({ theme, $type }: INotificationsThemeProps) => css`
  padding: ${theme.space.base * 4}px ${theme.space.base * 10}px;
  border-radius: ${theme.borderRadii.xl};
  border-color: transparent;
  background-color: ${getAlertBackground({ theme, $type })};
  color: ${getAlertForeground({ theme, $type })};
`;
