import type {StoreBilling} from '../features/billing/model';
const unavailable=async():Promise<never>=>{throw new Error('구매와 복원은 Google Play에서 설치한 Android 앱에서 진행해 주세요.');};
export const storeBilling:StoreBilling={supported:false,products:async()=>[],purchase:unavailable,restore:unavailable};
