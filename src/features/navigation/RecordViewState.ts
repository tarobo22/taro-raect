/** Records keep their loaded pages while a detail is open; mutations start a fresh view. */
export class RecordViewState{
 visited=false;epoch=0;offset=0;
 visit(){this.visited=true;}
 remember(offset:number){if(Number.isFinite(offset)&&offset>=0)this.offset=offset;}
 reset(){this.visited=false;this.offset=0;this.epoch++;}
}
