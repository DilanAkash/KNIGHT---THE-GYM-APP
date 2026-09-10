import { useEffect, useState } from 'react';
import { Keyboard, Platform, type KeyboardEvent } from 'react-native';

/**
 * Height of the on-screen keyboard, or 0 when it's closed.
 *
 * Necessary because the app runs edge-to-edge, and under edge-to-edge Android
 * stops resizing the window when the keyboard opens. Anything that relied on
 * that resize — a ScrollView shrinking, `KeyboardAvoidingView`, a bottom sheet
 * staying visible — silently does nothing, and the field you are typing into
 * ends up behind the keyboard.
 *
 * Driven by Keyboard events rather than window insets so it behaves the same on
 * both platforms and inside Expo Go, with no native module.
 */
export function useKeyboardHeight(): number {
  const [height, setHeight] = useState(0);

  useEffect(() => {
    // iOS reports the frame before the animation starts, which lets the layout
    // move with the keyboard. Android only reports it once it has finished.
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const onShow = (event: KeyboardEvent) => {
      setHeight(event.endCoordinates?.height ?? 0);
    };
    const onHide = () => setHeight(0);

    const showSub = Keyboard.addListener(showEvent, onShow);
    const hideSub = Keyboard.addListener(hideEvent, onHide);

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  return height;
}

/** True while the keyboard is open. */
export function useKeyboardVisible(): boolean {
  return useKeyboardHeight() > 0;
}
