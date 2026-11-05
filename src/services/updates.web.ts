import type {OtaPolicy} from '../features/p0/model';
export function configureUpdatePolicy(_policy:OtaPolicy|null){}
export async function checkAndDownload(){return false;}
export async function applyUpdate(){throw new Error('업데이트 적용은 Android 앱에서 이용해 주세요.');}
export function bundleId(){return 'web-preview';}
export function isUpdateReady(){return false;}
export function getUpdateNotice(){return '';}
export function subscribeUpdateNotice(_listener:()=>void){return()=>{};}
