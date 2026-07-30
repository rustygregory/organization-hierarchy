import { css } from 'styled-components';
import { getColor } from '@zendeskgarden/react-theming';
import type { INotificationsThemeProps } from './alert';

// Notification-specific overrides
export const notification = ({ theme }: INotificationsThemeProps) => css`
  padding: ${theme.space.base * 4}px ${theme.space.base * 10}px;
  border-radius: ${theme.borderRadii.xl};
  box-shadow: 0 ${theme.space.base}px ${theme.space.base * 2}px ${getColor({ theme, variable: 'shadow.medium' })};
`;

// Close button position override
export const close = ({ theme }: INotificationsThemeProps) => css`
  top: ${theme.space.base * 3}px;
  ${theme.rtl ? 'left' : 'right'}: ${theme.space.base * 3}px;
`;

// Icon position override
export const icon = ({ theme }: INotificationsThemeProps) => css`
  ${theme.rtl ? 'right' : 'left'}: ${theme.space.base * 3}px;
  margin-top: 0;
  top: ${theme.space.base * 4}px;
`;
