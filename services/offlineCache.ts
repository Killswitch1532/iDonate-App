import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Save JSON data to local storage under a namespaced key.
 */
export async function setCache(key: string, data: any): Promise<void> {
  try {
    await AsyncStorage.setItem(`@idonate:${key}`, JSON.stringify(data));
  } catch (error) {
    console.error(`[iDonate:OfflineCache] Failed to write cache for ${key}:`, error);
  }
}

/**
 * Retrieve namespaced JSON data from local storage. Returns null if not found.
 */
export async function getCache<T = any>(key: string): Promise<T | null> {
  try {
    const data = await AsyncStorage.getItem(`@idonate:${key}`);
    return data ? JSON.parse(data) : null;
  } catch (error) {
    console.error(`[iDonate:OfflineCache] Failed to read cache for ${key}:`, error);
    return null;
  }
}

/**
 * Clear cached data for a namespaced key.
 */
export async function clearCache(key: string): Promise<void> {
  try {
    await AsyncStorage.removeItem(`@idonate:${key}`);
  } catch (error) {
    console.error(`[iDonate:OfflineCache] Failed to clear cache for ${key}:`, error);
  }
}
