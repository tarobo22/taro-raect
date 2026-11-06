import {PageMemoryCache} from '../p0/PageMemoryCache';
/** Records keep their loaded pages while a detail is open; mutations start a fresh view. */
export class RecordViewState{
 readonly pages=new PageMemoryCache();
 private signature:string|null=null;
 visited=false;epoch=0;offset=0;
 update(signature:string){if(this.signature!==null&&this.signature!==signature)this.reset();this.signature=signature;}
 visit(){this.visited=true;}
 remember(offset:number){if(Number.isFinite(offset)&&offset>=0)this.offset=offset;}
 reset(){this.visited=false;this.offset=0;this.epoch++;this.pages.clear();}
}
