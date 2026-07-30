import { css } from 'styled-components';
import type { IGardenTheme } from '../../../../types';
// TooltipDialog overrides
export const tooltipDialog = ({ theme }: { theme: IGardenTheme }) => css`
  border-radius: ${theme.borderRadii.xl};
`;

export const tooltipDialogBody = ({ theme }: { theme: IGardenTheme }) => css`
  padding-top: ${theme.space.xs};
`;

export const tooltipDialogFooter = ({ theme }: { theme: IGardenTheme }) => css`
  padding-top: ${theme.space.sm};
`;
