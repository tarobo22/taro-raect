import {useEffect,useMemo} from 'react';
import {ScreenDraftSession} from './ScreenDraftSession';
export function useScreenDraft(){const session=useMemo(()=>new ScreenDraftSession(),[]);useEffect(()=>()=>session.dispose(),[session]);return session;}
