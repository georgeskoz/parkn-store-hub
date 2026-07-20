// Single source of truth for translating between app-side role names
// ('seeker' / 'provider') and DB-side role names ('renter' / 'host').
// 'admin' passes through unchanged (not part of the seeker/provider mapping).
// DB CHECK constraint: role = ANY ('admin','host','renter','user').

export type AppRole = "provider" | "seeker";
export type UiRole = AppRole | "admin";
export type DbRole = "host" | "renter" | "admin" | "user";

const APP_TO_DB: Record<AppRole, DbRole> = {
  seeker: "renter",
  provider: "host",
};

const DB_TO_APP: Record<string, AppRole | undefined> = {
  renter: "seeker",
  host: "provider",
};

/** Map an app/UI role to the value stored in the `user_roles.role` column. */
export function appRoleToDb(role: UiRole): DbRole {
  if (role === "admin") return "admin";
  return APP_TO_DB[role];
}

/** Map a DB role back to the app-side role. Returns undefined for values
 *  the app doesn't surface (e.g. 'user'). 'admin' is returned as-is. */
export function dbRoleToApp(role: string): UiRole | undefined {
  if (role === "admin") return "admin";
  return DB_TO_APP[role];
}
