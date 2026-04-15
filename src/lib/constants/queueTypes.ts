/** Riot queueId → human-readable label (Korean) */
export const QUEUE_LABELS: Record<number, string> = {
  420: "솔로랭크",
  440: "자유랭크",
  400: "일반",
  430: "일반",
  450: "무작위 총력전",
  700: "격전",
  900: "URF",
  1020: "단일 챔피언",
  1400: "궁극기 주문서",
  1900: "URF",
  0: "커스텀",
};

export function getQueueLabel(queueId: number): string {
  return QUEUE_LABELS[queueId] ?? `큐 ${queueId}`;
}
