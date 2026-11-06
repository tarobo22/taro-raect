export interface StoryEpisode{id:string;version:string;title:string;summary:string;min_choices:number;max_choices:number;}
export type StoryExpression='calm'|'welcome'|'listen'|'encourage'|'joy'|'concern'|'serious';
export interface StoryRun{id:string;episode_id:string;episode_version:string;title:string;state:'active'|'completed'|'restarted';version:number;current_node:{id:string;prompt:string;expression:StoryExpression}|null;ending:{id:string;title:string;body:string;action:string}|null;choice_count:number;created_at:string;updated_at:string;completed_at:string|null;}
export interface StoryStart{episode_id:string;episode_version:string;}
export interface StoryChoice{expected_version:number;node_id:string;answer:boolean;}
