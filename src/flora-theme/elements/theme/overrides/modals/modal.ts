import { css } from 'styled-components';
import type { IGardenTheme } from '../../../../types';

// Modal overrides
export const modal = ({ theme }: { theme: IGardenTheme }) => css`
  border-radius: ${theme.borderRadii.xl};
`;

export const modalFooterItem = ({ theme }: { theme: IGardenTheme }) => css`
  margin-inline-start: ${theme.space.base * 3}px;

  &:first-child {
    margin-inline-start: 0;
  }
`;
