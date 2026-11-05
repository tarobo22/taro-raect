interface PreparedUpdate {download():Promise<boolean>;}
export interface UpdatePort {check():Promise<PreparedUpdate|null>;reload():Promise<void>;}

/** Download and reload are separate user actions; failed preparation never reloads. */
export class UpdateManager {
  private prepared=false;
  private checking:Promise<boolean>|null=null;
  private applying:Promise<void>|null=null;
  constructor(private readonly port:UpdatePort){}
  get ready():boolean{return this.prepared;}

  checkAndDownload():Promise<boolean>{
    if(this.checking)return this.checking;
    if(this.prepared)return Promise.resolve(true);
    this.checking=this.prepare().finally(()=>{this.checking=null;});
    return this.checking;
  }

  private async prepare():Promise<boolean>{
    const update=await this.port.check();
    if(!update)return false;
    if(!await update.download())throw new Error('업데이트를 준비하지 못했어요. 기존 내용은 계속 사용할 수 있어요.');
    this.prepared=true;
    return true;
  }

  apply():Promise<void>{
    if(this.applying)return this.applying;
    if(!this.prepared)return Promise.reject(new Error('적용할 업데이트를 먼저 준비해 주세요.'));
    this.applying=Promise.resolve().then(()=>this.port.reload()).then(()=>{this.prepared=false;})
      .finally(()=>{this.applying=null;});
    return this.applying;
  }
}
