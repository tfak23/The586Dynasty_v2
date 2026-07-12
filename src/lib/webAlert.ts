import { Alert as RNAlert, Platform } from 'react-native';

// React Native's Alert.alert is a NO-OP on react-native-web: dialogs never
// show and button onPress handlers never fire, so confirmations (sign out,
// advance season, reject/withdraw trade) and notifications silently do nothing
// on the deployed web app. This drop-in replacement maps to the browser's
// native window.confirm / window.alert on web, and delegates to RN Alert on
// native — so every existing `Alert.alert(...)` call site works unchanged.

export interface AlertButton {
  text?: string;
  onPress?: (value?: string) => void;
  style?: 'default' | 'cancel' | 'destructive';
}

function webAlert(title: string, message?: string, buttons?: AlertButton[]): void {
  if (typeof window === 'undefined') return;
  const text = message ? `${title}\n\n${message}` : title;

  // Notification (0–1 buttons): show and fire the single handler if present.
  if (!buttons || buttons.length <= 1) {
    window.alert(text);
    buttons?.[0]?.onPress?.();
    return;
  }

  // Confirmation: OK = the primary (last non-cancel) action, Cancel = cancel.
  const cancel = buttons.find((b) => b.style === 'cancel');
  const actions = buttons.filter((b) => b.style !== 'cancel');
  const primary = actions[actions.length - 1];
  if (window.confirm(text)) primary?.onPress?.();
  else cancel?.onPress?.();
}

export const Alert = {
  alert(title: string, message?: string, buttons?: AlertButton[], options?: unknown): void {
    if (Platform.OS === 'web') {
      webAlert(title, message, buttons);
      return;
    }
    RNAlert.alert(title, message, buttons as never, options as never);
  },
};
