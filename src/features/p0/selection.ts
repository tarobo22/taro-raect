export function contextSnapshot(entries:readonly {id:string;version:number}[]){
 if(entries.length>3||new Set(entries.map(e=>e.id)).size!==entries.length||entries.some(e=>!/^[\da-f]{8}-(?:[\da-f]{4}-){3}[\da-f]{12}$/i.test(e.id)||!Number.isInteger(e.version)||e.version<1))throw new Error('참고할 기록을 다시 확인해 주세요.');
 return {ids:entries.map(e=>e.id),versions:Object.fromEntries(entries.map(e=>[e.id,e.version])) as Record<string,number>};
}
export function validateContext(ids:string[],versions:Record<string,number>|undefined){
 const v=versions??{};if(Object.keys(v).length!==ids.length||ids.some(id=>!Object.hasOwn(v,id)))throw new Error('참고할 기록의 내용을 다시 확인하고 선택해 주세요.');
 return contextSnapshot(ids.map(id=>({id,version:v[id]}))).versions;
}
export function validRecordDate(value:string){return /^\d{4}-\d{2}-\d{2}$/.test(value)&&Number.isFinite(Date.parse(value))&&new Date(value).toISOString().slice(0,10)===value;}
export function recordDay(createdAt:string,timezone:string,localDay?:string|null){if(localDay)return localDay;if(!Number.isFinite(Date.parse(createdAt)))return '';const parts=new Intl.DateTimeFormat('en-CA',{timeZone:timezone,year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date(createdAt));const part=(type:string)=>parts.find(p=>p.type===type)!.value;return part('year')+'-'+part('month')+'-'+part('day');}
