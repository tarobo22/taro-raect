export interface Draft{text:string;sessionId?:string;}
export class DraftMemory {
 private owner='';private entries=new Map<string,Draft>();
 attach(owner:string){if(this.owner!==owner){this.entries.clear();this.owner=owner;}}
 read(key='new'):Draft|undefined{const value=this.entries.get(key);return value?{...value}:undefined;}
 write(key:string,draft:Draft){if(this.owner)this.entries.set(key,{...draft});}
 reset(key='new'){this.entries.delete(key);}
 clear(){this.entries.clear();this.owner='';}
}
