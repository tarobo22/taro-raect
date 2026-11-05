/** Keep the same request identity on an explicit retry after uncertain network failure. */
export class IdempotentSubmit<I,O> {
  private pending: Promise<O>|null = null;
  private attempt: {fingerprint:string;id:string}|null = null;
  constructor(private readonly execute:(input:I,id:string)=>Promise<O>, private readonly newId:()=>string) {}
  submit(input:I):Promise<O> {
    if(this.pending)return this.pending;
    const fingerprint=JSON.stringify(input)??'';
    if(!this.attempt||this.attempt.fingerprint!==fingerprint)this.attempt={fingerprint,id:this.newId()};
    this.pending=this.execute(input,this.attempt.id).then(value=>{
      this.attempt=null;return value;
    }).finally(()=>{this.pending=null;});
    return this.pending;
  }
}

export function requestId():string {
  // This identifier deduplicates operations; it is not an authentication credential.
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g,c=>{
    const value=Math.floor(Math.random()*16);return (c==='x'?value:(value&3)|8).toString(16);
  });
}
