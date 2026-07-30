import { ReactNode } from 'react';
import { IGardenTheme as ILegacyGardenTheme } from '@zendeskgarden/react-theming';

export interface IGardenTheme extends ILegacyGardenTheme {
  borderRadii: ILegacyGardenTheme['borderRadii'] & {
    xs: string;
    // Extends: { sm, md, lg }
    xl: string;
    xxl: string;
    full: string;
  };
}

export interface IThemeProviderProps {
  children?: ReactNode;
  /**
   * Provides values for component styling. See styled-components
   * [`ThemeProvider`](https://styled-components.com/docs/api#themeprovider)
   * for details.
   */
  theme?: IGardenTheme | ((theme: IGardenTheme) => IGardenTheme);
}
