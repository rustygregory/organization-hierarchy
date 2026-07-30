import { css } from 'styled-components';
import { getColor } from '@zendeskgarden/react-theming';
import type { IGardenTheme } from '../../../../types';

type MenuItemType = 'add' | 'danger' | 'next' | 'previous' | 'header' | 'group';

export interface IMenuThemeProps {
  theme: IGardenTheme;
}

export interface IMenuItemThemeProps extends IMenuThemeProps {
  $isActive?: boolean;
  $isCompact?: boolean;
  $type?: MenuItemType;
}

const menuItemGap = ({ theme }: IMenuThemeProps) => `${theme.space.base / 2}px`;
const rowGapSelector =
  "> li:not([data-garden-id='dropdowns.menu.separator']) + li:not([data-garden-id='dropdowns.menu.separator'])";

const sharedItemStyles = ({ theme, $isActive, $type }: IMenuItemThemeProps) => {
  if ($type === 'group') {
    return '';
  }

  const isActionable = $type !== 'header';
  const showStripe = $isActive && isActionable;

  return css`
    border-radius: ${theme.borderRadii.sm};

    ${showStripe &&
    css`
      overflow: hidden;
      box-shadow: none;

      &::before {
        position: absolute;
        box-sizing: border-box;
        top: 0;
        bottom: 0;
        inset-inline-start: 0;
        width: ${theme.space.base}px;
        border-inline-end: ${theme.borderWidths.sm} solid ${getColor({ theme, variable: 'background.default' })};
        background-color: ${getColor({ theme, variable: 'border.primaryEmphasis' })};
        pointer-events: none;
        content: '';
      }
    `}

    &[aria-disabled='true'] {
      &::before {
        display: none;
      }
    }
  `;
};

export const menu = ({ theme }: IMenuThemeProps) => css`
  && {
    padding: ${theme.space.xxs};
  }

  ${rowGapSelector} {
    margin-block-start: ${menuItemGap({ theme })};
  }
`;

export const menuItem = (props: IMenuItemThemeProps) => sharedItemStyles(props);

export const menuItemAnchor = (props: IMenuItemThemeProps) => sharedItemStyles(props);

export const menuSeparator = ({ theme }: IMenuThemeProps) => css`
  margin: ${theme.space.xxs} ${theme.space.xs};
`;

export const menuItemGroup = ({ theme }: IMenuThemeProps) => css`
  ${rowGapSelector} {
    margin-block-start: ${menuItemGap({ theme })};
  }
`;
