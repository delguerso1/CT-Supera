import * as ImagePicker from 'expo-image-picker';

export type PickedImageAsset = {
  uri: string;
  type?: string;
  fileName?: string;
  fileSize?: number;
};

export type PickImageResult =
  | { ok: false; reason: 'cancel' | 'error' | 'permission' }
  | { ok: true; asset: PickedImageAsset };

/**
 * Seleciona uma imagem da galeria (substitui o fluxo do react-native-image-picker).
 */
export async function pickImageFromLibrary(options: {
  quality?: number;
}): Promise<PickImageResult> {
  const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!perm.granted) {
    return { ok: false, reason: 'permission' };
  }

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ImagePicker.MediaTypeOptions.Images,
    allowsEditing: true,
    quality: options.quality ?? 0.8,
  });

  if (result.canceled) {
    return { ok: false, reason: 'cancel' };
  }

  const a = result.assets[0];
  const mime = a.mimeType ?? '';
  const type = mime.includes('png') ? 'image/png' : 'image/jpeg';

  return {
    ok: true,
    asset: {
      uri: a.uri,
      type,
      fileName: a.fileName ?? undefined,
      fileSize: a.fileSize,
    },
  };
}
