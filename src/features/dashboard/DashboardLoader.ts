import type {JournalEntry,JournalPolicy,JournalRepository} from '../journal/model';
import type {Counsel,ExperienceConfig,ExperienceRepository,Reading} from '../experience/model';

interface DashboardData {
  entries:JournalEntry[];
  readings:Reading[];
  counsels:Counsel[];
  journalPolicy:JournalPolicy|null;
  config:ExperienceConfig|null;
}
type Section=keyof DashboardData;
export interface DashboardSnapshot extends DashboardData {errors:Partial<Record<Section,string>>;}

/** Each endpoint has its own failure boundary; only the newest refresh may publish. */
export class DashboardLoader {
  private generation=0;
  private value:DashboardSnapshot={
    entries:[],readings:[],counsels:[],journalPolicy:null,config:null,errors:{},
  };

  constructor(private readonly journal:Pick<JournalRepository,'list'|'policy'>,
              private readonly experience:Pick<ExperienceRepository,'readings'|'counsels'|'config'>) {}

  get snapshot():DashboardSnapshot {return this.value;}

  async load():Promise<DashboardSnapshot|null> {
    const generation=++this.generation;
    const results=await Promise.allSettled([
      this.journal.list(),this.experience.readings(),this.experience.counsels(),
      this.journal.policy(),this.experience.config(),
    ]);
    if(generation!==this.generation)return null;
    const errors:DashboardSnapshot['errors']={};
    function settled<T>(result:PromiseSettledResult<T>,section:Section,previous:T):T {
      if(result.status==='fulfilled')return result.value;
      errors[section]=result.reason instanceof Error?result.reason.message:'잠시 뒤 다시 불러와 주세요.';
      return previous;
    }
    this.value={
      entries:settled(results[0],'entries',this.value.entries),
      readings:settled(results[1],'readings',this.value.readings),
      counsels:settled(results[2],'counsels',this.value.counsels),
      journalPolicy:settled(results[3],'journalPolicy',this.value.journalPolicy),
      config:settled(results[4],'config',this.value.config),
      errors,
    };
    return this.value;
  }
}
