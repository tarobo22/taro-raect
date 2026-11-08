import type React from 'react';
export type ChoiceStageProps={children:React.ReactNode;onChoice:(answer:boolean)=>void|boolean|Promise<void|boolean>;disabled?:boolean;reduced:boolean;label?:string;showButtons?:boolean};
