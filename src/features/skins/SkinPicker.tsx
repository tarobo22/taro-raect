import React from 'react';
import {Pressable,View} from 'react-native';
import {Copy} from '../../components/UI';
import {color} from '../../design/tokens';
import {skins,skinIds} from './catalog';
import {useSkin} from './SkinProvider';
import {useSkinTheme} from './useSkinTheme';
export function SkinPicker(){const skin=useSkin(),theme=useSkinTheme();return <View style={{gap:6}}>
 <View accessibilityLabel="이야기할 공간" style={{flexDirection:'row',gap:6,padding:4,borderRadius:18,backgroundColor:theme.soft}}>{skinIds.map(id=><Pressable key={id} accessibilityRole="button" accessibilityLabel={`${skins[id].label} 공간 선택`} accessibilityState={{selected:id===skin.id}} aria-pressed={id===skin.id} onPress={()=>skin.select(id)} style={({pressed})=>({flex:1,minHeight:44,alignItems:'center',justifyContent:'center',borderRadius:14,backgroundColor:id===skin.id?theme.surface:'transparent',opacity:pressed?.72:1})}><Copy kind="small" style={{fontWeight:id===skin.id?'700':'400',color:id===skin.id?theme.action:theme.muted}}>{skins[id].label}</Copy></Pressable>)}</View>
 {skin.error?<Copy kind="small" style={{color:color.error}}>{skin.error}</Copy>:null}
 </View>;}


