import {color} from '../../design/tokens';
import {useSkin} from './SkinProvider';
import {skins,type SkinTheme} from './catalog';
export function useSkinTheme(){const {id}=useSkin();return skins[id].theme;}
export function surfaceTone(tone:string|undefined,theme:SkinTheme){
 if(!tone||tone===color.surface)return theme.surface;
 if(tone===color.mint)return theme.tint;if(tone===color.sage)return theme.soft;
 if(tone===color.pink)return theme.blush;if(tone===color.peach)return theme.warm;
 return tone;
}
