import AsyncStorage from '@react-native-async-storage/async-storage';
import {AccountCache,CacheStorage} from './AccountCache';
/** Shared opaque I/O tracking. Existing keys and value formats remain unchanged. */
export const accountCache=new AccountCache(AsyncStorage as CacheStorage);
export default accountCache;
