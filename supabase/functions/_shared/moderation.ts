export function canRunOwnerAnalysis(moderationStatus: string | null, isStaff: boolean): boolean {
  return isStaff || moderationStatus !== "flagged";
}
