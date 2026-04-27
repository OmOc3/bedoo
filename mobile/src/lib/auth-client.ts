import { expoClient } from '@better-auth/expo/client';
import { createAuthClient } from 'better-auth/react';
import * as SecureStore from 'expo-secure-store';

import { Brand, WebBaseUrl } from '@/constants/theme';

export const authClient = createAuthClient({
  baseURL: WebBaseUrl,
  plugins: [
    expoClient({
      scheme: Brand.scheme,
      storagePrefix: 'ecopest',
      storage: SecureStore,
    }),
  ],
});
