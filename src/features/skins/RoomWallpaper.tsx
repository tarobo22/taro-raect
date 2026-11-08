import React from 'react';
import {View} from 'react-native';
import Svg,{Path,Rect,Circle,Ellipse} from 'react-native-svg';
import {useSkin} from './SkinProvider';
import {skins,type SkinTheme} from './catalog';
type WallpaperProps={theme:SkinTheme;subtle:boolean;};
const wallpaperArt={
 cloud:({theme:t,subtle}:WallpaperProps)=><>
   <Path d="M-55 138 Q-28 70 25 101 Q58 52 101 91 Q139 82 155 121 Q128 144 86 139 Z M473 65 Q504 22 538 51 Q577 18 611 55 L653 97 H471 Z" fill={t.surface} opacity={.85}/>
   <Rect x={-52} y={266} width={165} height={224} rx={81} fill="#DCE5D5" opacity={subtle?.45:.85}/><Path d="M32 268 V490" stroke={t.paper} strokeWidth={8}/>
   <Ellipse cx={300} cy={868} rx={270} ry={97} fill={t.warm} opacity={subtle?.35:1}/><Ellipse cx={300} cy={868} rx={224} ry={67} fill="none" stroke={t.frame} strokeWidth={3} opacity={.25}/>
   <Rect x={466} y={670} width={154} height={92} rx={40} fill={t.blush} transform="rotate(-12 535 720)"/><Path d="M477 706 Q535 680 603 688" stroke={t.surface} strokeWidth={3} fill="none" opacity={.5}/>
   <Circle cx={63} cy={770} r={31} fill="#B7C9B7"/><Path d="M43 746 Q82 768 49 794 M69 739 Q41 770 77 797" fill="none" stroke={t.paper} strokeWidth={3}/>
   <Path d="M500 286 Q520 271 540 286 L537 305 Q519 316 503 303 Z" fill={t.frame} opacity={.4}/><Circle cx={501} cy={267} r={6} fill={t.frame} opacity={.4}/><Circle cx={517} cy={260} r={6} fill={t.frame} opacity={.4}/><Circle cx={535} cy={265} r={6} fill={t.frame} opacity={.4}/>
 </>,
 plant:({theme:t,subtle}:WallpaperProps)=><>
   <Rect x={-52} y={130} width={208} height={282} rx={74} fill="#CDDFE0" opacity={subtle?.4:.8}/><Path d="M53 132 V410 M-50 272 H155" stroke={t.paper} strokeWidth={8}/>
   <Rect x={493} y={652} width={83} height={107} rx={22} fill={t.line}/><Path d="M535 652 V489 M535 574 Q461 549 480 502 Q530 506 535 574 M536 535 Q603 507 586 464 Q541 472 536 535" fill="none" stroke="#9BB8A4" strokeWidth={12} strokeLinecap="round"/>
   <Path d="M-10 816 H610 M-10 910 H610" stroke={t.line} strokeWidth={2} opacity={.4}/>
 </>,
 tea:({theme:t,subtle}:WallpaperProps)=><>
   <Rect x={-63} y={120} width={232} height={297} rx={84} fill="#CBDEC8" opacity={subtle?.4:.85}/><Path d="M53 122 V416 M-60 267 H167" stroke={t.paper} strokeWidth={8}/>
   <Rect x={445} y={650} width={185} height={17} rx={8} fill={t.frame}/><Rect x={480} y={585} width={64} height={64} rx={18} fill={t.surface}/><Path d="M542 599 C586 583 589 638 544 628" stroke={t.surface} strokeWidth={10} fill="none"/>
   <Path d="M503 561 Q486 539 505 520" stroke={t.frame} strokeWidth={4} fill="none" strokeLinecap="round"/><Path d="M0 815 H600 M0 900 H600" stroke={t.frame} strokeWidth={2} opacity={.2}/>

 </>,
};
/** Room art sits behind the entire app chrome and scroll area, never over text. */
export function RoomWallpaper({subtle=false,wide=false}:{subtle?:boolean;wide?:boolean}){
 const {id}=useSkin(),{theme:t,wallpaper}=skins[id],Art=wallpaperArt[wallpaper];
 if(wide)return <View style={{width:'100%',height:'100%',backgroundColor:t.paper}}><View style={{position:'absolute',left:0,top:0,bottom:0,width:'38%'}}><RoomWallpaper subtle={subtle}/></View><View style={{position:'absolute',right:0,top:0,bottom:0,width:'38%',transform:[{scaleX:-1}]}}><RoomWallpaper subtle={subtle}/></View></View>;
 return <Svg width="100%" height="100%" viewBox="0 0 600 1000" preserveAspectRatio="xMidYMid slice">
  <Rect width={600} height={1000} fill={t.paper}/><Path d="M0 678 Q300 636 600 678 V1000 H0 Z" fill={t.tint} opacity={subtle?.45:1}/>
  <Art theme={t} subtle={subtle}/>
 </Svg>;
}
