import { css } from 'styled-components';
import type { IGardenTheme } from '../../../../types';
// Drawer overrides
export const drawerModal = ({ theme }: { theme: IGardenTheme }) => css`
  border-radius: ${theme.borderRadii.xxl};
  border: none;
  margin: ${theme.space.xxs};
  height: calc(100% - ${theme.space.xxs} * 2);
`;

export const drawerModalClose = ({ theme }: { theme: IGardenTheme }) => css`
  border-radius: ${theme.borderRadii.lg};
`;
