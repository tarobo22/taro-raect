import type {JournalMoodCode,JournalMoodLabels,JournalPolicy} from './model';

const codes=['calm','happy','thinking','settled','talk'] as const;
// Compatibility with the established five-label server, independent of list order.
// Unknown labels are never assigned a meaning from their array position.
const legacy:JournalMoodLabels={calm:'편안해요',happy:'기뻐요',thinking:'생각이 많아요',settled:'차분해요',talk:'이야기하고 싶어요'};

export function isJournalMoodCode(value:string):value is JournalMoodCode{
 return Object.hasOwn(legacy,value);
}

export function decodeMoodCodes(value:unknown,moods:string[]):JournalMoodLabels{
 const invalid=()=>new Error('마음기록 설정의 기분 연결을 확인하지 못했어요.');
 if(typeof value!=='object'||value===null||Array.isArray(value))throw invalid();
 const map=value as Record<string,unknown>;
 if(Object.keys(map).length!==codes.length||codes.some(code=>typeof map[code]!=='string'||!map[code]||!moods.includes(map[code] as string))
     ||new Set(Object.values(map)).size!==codes.length||moods.some(label=>!Object.values(map).includes(label)))throw invalid();
 return Object.fromEntries(codes.map(code=>[code,map[code]])) as JournalMoodLabels;
}

function labelFor(code:JournalMoodCode,policy:JournalPolicy|undefined|null):string|undefined{
 if(policy?.moodCodes)return policy.moodCodes[code];
 if(policy?.moods.includes(legacy[code]))return legacy[code];
 if(policy?.moods.includes(code))return code;
 return undefined;
}

export function journalMoodLabel(mood:string,policy:JournalPolicy|undefined|null):string{
 return isJournalMoodCode(mood)?labelFor(mood,policy)??mood:mood;
}

export function journalMoodCode(mood:string,policy:JournalPolicy):JournalMoodCode{
 if(isJournalMoodCode(mood))return mood;
 const code=codes.find(candidate=>labelFor(candidate,policy)===mood);
 if(!code)throw new Error('마음 선택의 연결을 확인하지 못했어요. 작성한 글을 유지한 채 설정을 다시 확인해 주세요.');
 return code;
}
