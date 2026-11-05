const explanations:Record<string,string>={
 UNKNOWN_PROVIDER_OUTCOME:'이전 요청이 처리됐는지 확인할 수 없어요. 자동으로 다시 보내지 않아요. 새 요청으로 재시도하면 추가 비용이 발생할 수 있어요.',
 RESOURCE_CHANGED:'참고한 기록이 바뀌거나 삭제됐어요. 사용할 기록을 다시 선택하고 내용을 확인한 뒤 요청해 주세요.',
 CONTEXT_CHANGED:'참고한 기록이 바뀌거나 삭제됐어요. 사용할 기록을 다시 선택하고 내용을 확인한 뒤 요청해 주세요.',
 CONTEXT_INVALIDATED:'참고한 기록을 더 이상 사용할 수 없어요. 사용할 기록을 다시 선택해 주세요.',
 JOURNAL_VERSION_CONFLICT:'참고한 기록이 수정됐어요. 사용할 기록을 다시 선택하고 내용을 확인해 주세요.',
 CONSENT_REVOKED:'이 처리의 동의가 철회돼 작업을 중단했어요. 원하면 AI 이용 설정을 확인한 뒤 직접 새로 요청해 주세요.',
 CONSENT_REQUIRED:'이 처리 목적의 동의가 필요해요. AI 이용 설정을 확인한 뒤 직접 요청해 주세요.',
 PROVIDER_UNAVAILABLE:'현재 AI 연결이 준비되지 않았어요. 기본 카드 해석이나 마음기록으로 이어갈 수 있어요.',
 PROVIDER_REFUSAL:'이 요청에는 답변을 만들지 못했어요. 입력한 내용은 유지되니 질문을 다시 살펴보고 선택해 주세요.',
 QUOTA_EXCEEDED:'지금 이용할 수 있는 AI 요청 횟수를 모두 사용했어요. 나중에 다시 확인하거나 기본 해석과 마음기록을 이용해 주세요.',
 DAILY_LIMIT_EXCEEDED:'오늘 이용할 수 있는 AI 요청 횟수를 모두 사용했어요. 기본 해석과 마음기록은 계속 이용할 수 있어요.',
};
export function jobFailureExplanation(detail:{code:string;message:string}){const known=explanations[detail.code]||explanations[detail.message];if(known)return known;if(detail.message!==detail.code&&/[가-힣]/.test(detail.message))return detail.message;return '요청을 마치지 못했어요. 입력과 카드는 유지됩니다. 상태를 다시 확인하거나 이전 화면에서 이어가 주세요.';}
