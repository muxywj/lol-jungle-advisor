export interface ParsedRiotId {
  gameName: string;
  tagLine: string;
}

/**
 * "Hide on bush#KR1" → { gameName: "Hide on bush", tagLine: "KR1" }
 * Returns null if the input is missing "#" or either part is empty.
 */
export function parseRiotId(input: string): ParsedRiotId | null {
  const trimmed = input.trim();
  const hashIndex = trimmed.lastIndexOf("#");

  if (hashIndex === -1) return null;

  const gameName = trimmed.slice(0, hashIndex).trim();
  const tagLine = trimmed.slice(hashIndex + 1).trim();

  if (!gameName || !tagLine) return null;

  return { gameName, tagLine };
}
