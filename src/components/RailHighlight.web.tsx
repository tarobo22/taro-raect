import React from 'react';
import {color} from '../design/tokens';
export function RailHighlight({x,width,reduced}:{x:number;width:number;reduced:boolean}){return <div aria-hidden style={{position:'absolute',left:0,top:0,bottom:0,width,borderRadius:18,background:color.mint,transform:`translate3d(${x}px,0,0)`,transition:reduced?'none':'transform 280ms cubic-bezier(.2,.8,.2,1), width 280ms cubic-bezier(.2,.8,.2,1)',pointerEvents:'none'}}/>;}
