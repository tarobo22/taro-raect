import type {Page} from './model';
export class PageLoader<T extends {id:string}>{
 private generation=0;
 private value:{items:T[];next_cursor:string|null;busy:boolean;error:string}={items:[],next_cursor:null,busy:false,error:''};
 constructor(private readonly read:(cursor?:string)=>Promise<Page<T>>){}
 get snapshot(){return this.value;}
 dispose(){this.generation++;}
 async reload(){const generation=++this.generation;this.value={...this.value,busy:true,error:''};try{const page=await this.read();if(generation===this.generation)this.value={...page,busy:false,error:''};}catch(e){if(generation===this.generation)this.value={...this.value,busy:false,error:e instanceof Error?e.message:'목록을 확인하지 못했어요.'};}}
 async more(){if(this.value.busy||!this.value.next_cursor)return;const generation=this.generation,cursor=this.value.next_cursor;this.value={...this.value,busy:true,error:''};try{const page=await this.read(cursor);if(generation===this.generation){const ids=new Set(this.value.items.map(v=>v.id));this.value={items:[...this.value.items,...page.items.filter(v=>!ids.has(v.id))],next_cursor:page.next_cursor,busy:false,error:''};}}catch(e){if(generation===this.generation)this.value={...this.value,busy:false,error:e instanceof Error?e.message:'다음 목록을 확인하지 못했어요.'};}}
}
