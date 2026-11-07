import React from 'react';
// Both frontends use the same vector paths; the web adapter uses browser SVG.
export default function Svg(props:any){return React.createElement('svg',{xmlns:'http://www.w3.org/2000/svg',...props});}
export const Path=(props:any)=>React.createElement('path',props);
export const Circle=(props:any)=>React.createElement('circle',props);
export const Ellipse=(props:any)=>React.createElement('ellipse',props);
export const Rect=(props:any)=>React.createElement('rect',props);
export const G=(props:any)=>React.createElement('g',props);

export const Defs=(props:any)=>React.createElement("defs",props);
export const ClipPath=(props:any)=>React.createElement("clipPath",props);
export const Image=(props:any)=>React.createElement("image",{...props,href:typeof props.href==='object'?props.href.uri:props.href});
