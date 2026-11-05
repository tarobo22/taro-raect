/** An operation identity, never an authentication credential. */
export function requestId():string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g,c=>{
    const value=Math.floor(Math.random()*16);
    return (c==='x'?value:(value&3)|8).toString(16);
  });
}
