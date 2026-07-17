import { Platform } from 'react-native';

// Removes the browser default blue focus ring on web TextInputs
export const noOutline: any = Platform.OS === 'web'
  ? { outlineWidth: 0, outlineStyle: 'none' }
  : {};
