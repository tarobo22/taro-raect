import geometry from '../../../assets/skins/catalog.json';
import scenes from '../../../assets/skins/scenes.json';
import type {SkinId} from './SkinSelection';
export type Pose='rest'|'greeting'|'explain';
export const skinIds:SkinId[]=['cafe','clinic','playroom'];
export const skins={
 cafe:{label:'카페',name:'카페의 여운',greeting:'따뜻한 한 잔처럼, 천천히 들어볼게요.',hint:'차 한 잔의 여유',accent:'#DCE8D9'},
 clinic:{label:'진료실',name:'마음 진료실의 여운',greeting:'어떤 마음인지, 차근차근 함께 살펴요.',hint:'차분하게 마음 살피기',accent:'#DDE9E8'},
 playroom:{label:'놀이방',name:'놀이방의 고양이',greeting:'야옹. 오늘은 네 곁에 있을게.',hint:'말없이 곁에 있어도 좋아요',accent:'#EEDDD0'},
} as const;
export {geometry,scenes};
