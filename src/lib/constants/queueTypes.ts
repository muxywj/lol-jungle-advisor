/** Riot queueId → human-readable label (Korean) */
export const QUEUE_LABELS: Record<number, string> = {
  0: "커스텀",
  400: "일반",
  420: "솔로랭크",
  430: "일반",
  440: "자유랭크",
  450: "칼바람",
  490: "빠른 대전",
  700: "격전",
  830: "AI 대전",
  840: "AI 대전",
  850: "AI 대전",
  900: "URF",
  1020: "단일 챔피언",
  1300: "눈싸움 대난투",
  1400: "궁극기 주문서",
  1700: "아레나",
  1900: "URF",
  2400: "아레나",
};

export function getQueueLabel(queueId: number): string {
  return QUEUE_LABELS[queueId] ?? `큐 ${queueId}`;
}

/** 솔로랭크(420) + 자유랭크(440) */
export const RANKED_QUEUE_IDS = new Set([420, 440]);

export function isRankedQueue(queueId: number): boolean {
  return RANKED_QUEUE_IDS.has(queueId);
}

/** 소환사 협곡 일반게임 — 랭크 데이터 없을 때 폴백용 */
export const SR_NORMAL_QUEUE_IDS = new Set([400, 430, 490, 700]);

export function isSrNormalQueue(queueId: number): boolean {
  return SR_NORMAL_QUEUE_IDS.has(queueId);
}
