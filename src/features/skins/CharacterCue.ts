/** Only explicit UI actions call this gate; hydration and idle motion never make a sound. */
export class CharacterCue{
 private last=-Infinity;
 request(now:number,enabled:boolean,blocked:boolean){
  if(!enabled||blocked||!Number.isFinite(now)||now-this.last<1400)return false;
  this.last=now;return true;
 }
}
