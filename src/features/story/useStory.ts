import {useRef} from 'react';
import {useP0Mutation,useP0Read} from '../p0/useP0';
/** An owner switch cannot reveal a previous connection's read or a late mutation result. */
export function useStoryRead<T>(owner:string,read:()=>Promise<T>,keys:readonly unknown[]=[]){const data=useP0Read(async()=>({owner,value:await read()}),[owner,...keys]);return {...data,value:data.value?.owner===owner?data.value.value:null};}
export function useStoryMutation<I,O>(owner:string,name:string,execute:(input:I,key:string)=>Promise<O>){
 const currentOwner=useRef(owner);currentOwner.current=owner;
 const action=useP0Mutation('story.'+owner+'.'+name,async(input:I,key:string)=>({owner,value:await execute(input,key)}));
 return {...action,async submit(input:I){const result=await action.submit(input);return result?.owner===currentOwner.current?result.value:null;}};
}
