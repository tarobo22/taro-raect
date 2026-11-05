import type {JournalSummary} from './model';

export class SummaryLoader{
 private generation=0;
 private value:{value:JournalSummary|null;busy:boolean;error:string}={value:null,busy:false,error:''};
 constructor(private readonly api:{summary:(from:string,to:string)=>Promise<JournalSummary>}){}
 get snapshot(){return this.value;}
 dispose(){this.generation++;}
 async load(from:string,to:string){
  const generation=++this.generation;this.value={value:null,busy:true,error:''};
  try{const next=await this.api.summary(from,to);if(generation===this.generation)this.value={value:next,busy:false,error:''};}
  catch(e){if(generation===this.generation)this.value={value:null,busy:false,error:e instanceof Error?e.message:'기록을 확인하지 못했어요.'};}
 }
}
