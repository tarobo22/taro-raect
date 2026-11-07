import React from 'react';
import Svg,{Path,Rect,Circle} from 'react-native-svg';
import {scenes} from './catalog';
import type {SkinId} from './SkinSelection';
export function SceneArt({id}:{id:SkinId}){const scene=scenes[id];return <Svg width="100%" height="100%" viewBox="0 0 330 270" preserveAspectRatio="xMidYMid slice"><Rect width={330} height={270} fill={scene.paper}/><Path d="M0 202 Q165 178 330 202 V270 H0 Z" fill={scene.floor}/>{scene.shapes.map((shape,index)=>{const {type,...props}=shape;return type==='path'?<Path key={index} fill="none" strokeLinecap="round" strokeLinejoin="round" {...props}/>:type==='circle'?<Circle key={index} {...props}/>:<Rect key={index} {...props}/>;})}</Svg>;}
