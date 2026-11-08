export function cardMeaningLine(shortMeaning: string | undefined, fallback: string): string {
  const firstLine = fallback.trim().split(/\r?\n/, 1)[0];
  return shortMeaning?.trim() || firstLine.match(/^.*?[.!?。！？](?=\s|$)/)?.[0] || firstLine;
}
