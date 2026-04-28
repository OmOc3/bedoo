import * as ImagePicker from 'expo-image-picker';
import { getApiBaseUrl } from '@/lib/sync/api-client';
import { readAuthCookieHeader } from '@/lib/auth-client';

export async function pickAndUploadImage(uid?: string): Promise<string | null> {
  // Request permission
  const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (permissionResult.granted === false) {
    alert("عذرًا، نحتاج إلى إذن للوصول إلى معرض الصور الخاص بك!");
    return null;
  }

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: 'images',
    allowsEditing: true,
    aspect: [1, 1],
    quality: 0.8,
  });

  if (result.canceled || !result.assets || result.assets.length === 0) {
    return null;
  }

  const asset = result.assets[0];
  
  if (!asset.uri) {
      return null;
  }

  return await uploadImage(asset.uri, uid);
}

export async function uploadImage(uri: string, uid?: string): Promise<string | null> {
  try {
    const baseUrl = await getApiBaseUrl();
    const cookie = await readAuthCookieHeader();

    const formData = new FormData();
    
    // Provide a file name and type so the server recognizes it as a file.
    const filename = uri.split('/').pop() || 'photo.jpg';
    const match = /\.(\w+)$/.exec(filename);
    const type = match ? `image/${match[1]}` : `image/jpeg`;

    formData.append('image', {
      uri,
      name: filename,
      type,
    } as any);

    if (uid) {
      formData.append('uid', uid);
    }

    const response = await fetch(`${baseUrl}/api/upload-profile-image`, {
      method: 'POST',
      headers: {
        Cookie: cookie,
      },
      body: formData,
    });

    if (!response.ok) {
      throw new Error("Failed to upload");
    }

    const data = await response.json();
    return data.url;
  } catch (error) {
    console.error("Upload Error:", error);
    return null;
  }
}
