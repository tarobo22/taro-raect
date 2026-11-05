import type {Me,PreferencePatch} from './model';
/** Preserve user write order; ignore stale UI acknowledgements and queued work after erasure. */
export class PreferencesWriter{
 private pending:Promise<unknown>=Promise.resolve();private revision=0;private identity=0;
 constructor(private readonly repository:{updatePreferences(patch:PreferencePatch):Promise<Me>}){}
 reset(){this.identity++;this.revision++;}
 change(patch:PreferencePatch):Promise<Me|null>{
  const revision=++this.revision,identity=this.identity;
  const request=this.pending.catch(()=>{}).then(()=>{if(identity!==this.identity)throw new Error('기기 연결이 바뀌어 이전 설정 저장을 중단했어요.');return this.repository.updatePreferences(patch);});
  this.pending=request;
  return request.then(value=>revision===this.revision&&identity===this.identity?value:null);
 }
}
