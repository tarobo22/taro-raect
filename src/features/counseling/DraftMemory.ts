export interface Draft{text:string;sessionId?:string;}
/** Account-scoped memory only. No browser storage, files, or pending-job payloads. */
export class DraftMemory{
 private owner='';private drafts=new Map<string,Draft>();
 attach(owner:string){if(owner!==this.owner){this.drafts.clear();this.owner=owner;}}
 read(key='new'){return this.drafts.get(key);}
 write(key:string,draft:Draft){if(this.owner)this.drafts.set(key,{...draft});}
 reset(key='new'){this.drafts.delete(key);}
 clear(){this.drafts.clear();this.owner='';}
}
