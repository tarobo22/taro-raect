import manifest from '../../assets/licenses/tarot-source-manifest.json';
import {cardImages} from './cardImages';
const bundled=new Map(manifest.map(row=>[row.sha256,row.card_id]));
/** A different catalog image never silently receives a similarly numbered bundled card. */
export function cardAssetSource(asset:{sha256:string;url:string}){
 const id=bundled.get(asset.sha256);return id==null?{uri:asset.url}:cardImages[id];
}
