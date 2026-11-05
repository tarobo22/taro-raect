/** Keep the same request identity on an explicit retry after uncertain network failure. */
export interface Attempt {fingerprint:string;id:string;}
export interface AttemptStore {
  read():Promise<Attempt|null>;
  write(attempt:Attempt):Promise<void>;
  clear():Promise<void>;
}

export class IdempotentSubmit<I,O> {
  private pending: Promise<O>|null = null;
  private attempt:Attempt|null = null;
  constructor(private readonly execute:(input:I,id:string)=>Promise<O>, private readonly newId:()=>string,
              private readonly receipts?:AttemptStore) {}
  submit(input:I):Promise<O> {
    if(this.pending)return this.pending;
    const write=this.receipts?this.persisted(input):this.send(input);
    this.pending=write.then(value=>{
      if(!this.receipts)this.attempt=null;
      return value;
    }).finally(()=>{this.pending=null;});
    return this.pending;
  }

  private identity(input:I,previous:Attempt|null):Attempt{
    const fingerprint=JSON.stringify(input)??'';
    return previous?.fingerprint===fingerprint?previous:{fingerprint,id:this.newId()};
  }

  private send(input:I):Promise<O>{
    this.attempt=this.identity(input,this.attempt);
    return this.execute(input,this.attempt.id);
  }

  private async persisted(input:I):Promise<O>{
    this.attempt=this.identity(input,this.attempt??await this.receipts!.read());
    await this.receipts!.write(this.attempt);
    return this.execute(input,this.attempt.id);
  }

  async acknowledge():Promise<void>{
    if(this.pending)await this.pending;
    if(this.receipts)await this.receipts.clear();
    this.attempt=null;
  }
}

export {requestId} from '../../infrastructure/requestId';
