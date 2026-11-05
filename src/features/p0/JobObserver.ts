import type {Job} from './model';
/** Read-only observation never re-submits provider work. Disposal suppresses late results. */
export class JobObserver{
 private generation=0;
 constructor(private readonly repository:{job:(id:string)=>Promise<Job>}){}
 async refresh(id:string,publish:(job:Job)=>void):Promise<void>{const generation=++this.generation;const next=await this.repository.job(id);if(generation===this.generation)publish(next);}
 dispose(){this.generation++;}
}
