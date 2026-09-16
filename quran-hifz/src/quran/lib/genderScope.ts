/** Admin-wide "which masajid gender am I looking at" filter, selected from
 *  the sidebar and persisted so it survives navigation/reload. "all" means
 *  no filtering — every list/stat shows everything, same as before this
 *  feature existed. */
export type GenderScope = "all" | "male" | "female";

const STORAGE_KEY = "qh_gender_scope";

export function readStoredGenderScope(): GenderScope {
  if (typeof window === "undefined") return "all";
  const v = window.localStorage.getItem(STORAGE_KEY);
  return v === "male" || v === "female" ? v : "all";
}

export function storeGenderScope(scope: GenderScope): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, scope);
}

type Gendered = { gender: "male" | "female" };

/** True when `entity` (a masjid, or something carrying one) belongs to the
 *  active scope. An unpopulated ref (bare id string) or missing masjid is
 *  never hidden — there's no data to filter on, so it stays visible. */
export function matchesGenderScope(entity: Gendered | string | undefined, scope: GenderScope): boolean {
  if (scope === "all") return true;
  if (!entity || typeof entity === "string") return true;
  return entity.gender === scope;
}

type ScopedTrack = { _id: string; masjid: Gendered | string; teachers: ({ _id: string } | string)[] };

/** Ids of every teacher who teaches at least one track under a masjid in
 *  scope — teachers carry no masjid link of their own, so this is the join. */
export function teacherIdsInScope(tracks: ScopedTrack[], scope: GenderScope): Set<string> {
  const ids = new Set<string>();
  for (const t of tracks) {
    if (!matchesGenderScope(t.masjid, scope)) continue;
    for (const teacher of t.teachers) {
      ids.add(typeof teacher === "string" ? teacher : teacher._id);
    }
  }
  return ids;
}
