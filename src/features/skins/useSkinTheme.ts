import themes from '../../../assets/skins/themes.json';
import {color} from '../../design/tokens';
import {useSkin} from './SkinProvider';
export function useSkinTheme(){const {id}=useSkin();return themes[id];}
export function surfaceTone(tone:string|undefined,theme:typeof themes.cafe){
 if(!tone||tone===color.surface)return theme.surface;
 if(tone===color.mint)return theme.tint;if(tone===color.sage)return theme.soft;
 if(tone===color.pink)return theme.blush;if(tone===color.peach)return theme.warm;
 return tone;
}
