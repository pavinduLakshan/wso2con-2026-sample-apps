import { getDb } from "../connection";

export interface TravelPolicy {
  id: number;
  org_id: string;
  domestic_cabin: string;
  intl_cabin: string;
  long_haul_hours: number;
  price_cap_percent: number;
  min_days_advance: number;
  updated_at: string;
}

const SQL_GET = "SELECT * FROM travel_policies WHERE org_id = ?";

const SQL_UPSERT = `
  INSERT INTO travel_policies (org_id, domestic_cabin, intl_cabin, long_haul_hours, price_cap_percent, min_days_advance, updated_at)
  VALUES (@org_id, @domestic_cabin, @intl_cabin, @long_haul_hours, @price_cap_percent, @min_days_advance, datetime('now'))
  ON CONFLICT(org_id) DO UPDATE SET
    domestic_cabin    = excluded.domestic_cabin,
    intl_cabin        = excluded.intl_cabin,
    long_haul_hours   = excluded.long_haul_hours,
    price_cap_percent = excluded.price_cap_percent,
    min_days_advance  = excluded.min_days_advance,
    updated_at        = datetime('now')
`;

export function getTravelPolicy(orgId: string): TravelPolicy | null {
  return getDb().prepare(SQL_GET).get(orgId) as TravelPolicy | null;
}

export function upsertTravelPolicy(
  orgId: string,
  policy: Omit<TravelPolicy, "id" | "org_id" | "updated_at">
): TravelPolicy {
  const db = getDb();
  db.prepare(SQL_UPSERT).run({ org_id: orgId, ...policy });
  return db.prepare(SQL_GET).get(orgId) as TravelPolicy;
}
