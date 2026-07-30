// Buttons
import { button } from './buttons/button';
import { iconButton } from './buttons/iconButton';

// Forms
import { checkbox } from './forms/checkbox';
import { radio } from './forms/radio';
import { toggle } from './forms/toggle';

// Modals
import { modal, modalFooterItem } from './modals/modal';
import { tooltipDialog, tooltipDialogBody, tooltipDialogFooter } from './modals/tooltipDialog';

// Menus
import { menu, menuItem, menuItemAnchor, menuSeparator, menuItemGroup } from './menus/menu';

// Notifications
import { alert } from './notifications/alert';
import { notification, close as notificationClose, icon as notificationIcon } from './notifications/notification';

// Theming keys
export const buttons = {
  'buttons.button': button,
  'buttons.icon_button': iconButton,
};

export const forms = {
  'forms.checkbox': checkbox,
  'forms.radio': radio,
  'forms.toggle': toggle,
};

export const modals = {
  'modals.modal': modal,
  'modals.footer_item': modalFooterItem,
  'modals.tooltip_dialog': tooltipDialog,
  'modals.tooltip_dialog.body': tooltipDialogBody,
  'modals.tooltip_dialog.footer': tooltipDialogFooter,
};

export const menus = {
  'dropdowns.menu': menu,
  'dropdowns.menu.item': menuItem,
  'dropdowns.menu.item_anchor': menuItemAnchor,
  'dropdowns.menu.separator': menuSeparator,
  'dropdowns.menu.item_group': menuItemGroup,
};

export const notifications = {
  'notifications.alert': alert,
  'notifications.notification': notification,
  'notifications.close': notificationClose,
  'notifications.icon': notificationIcon,
};
