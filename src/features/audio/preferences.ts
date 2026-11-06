export interface SensoryPreferences{sound:boolean;haptics:boolean;music:boolean;}
export const defaultSensory:Readonly<SensoryPreferences>=Object.freeze({sound:false,haptics:true,music:false});
export function restoreSensory(value:unknown):SensoryPreferences{
 const source=value&&typeof value==='object'?value as Record<string,unknown>:{};
 return {sound:typeof source.sound==='boolean'?source.sound:defaultSensory.sound,
         haptics:typeof source.haptics==='boolean'?source.haptics:defaultSensory.haptics,
         music:typeof source.music==='boolean'?source.music:defaultSensory.music};
}
