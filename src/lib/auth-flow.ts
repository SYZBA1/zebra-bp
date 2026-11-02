export type Portal = "user" | "expert" | "admin";
export const loginPath = (portal: Portal) => portal === "user" ? "/auth" : `/${portal}/login`;
export function portalDestination(portal: Portal, roles: string[]) {
  if (portal === "admin") return roles.includes("admin") ? "/admin" : "/auth";
  if (portal === "expert") return roles.includes("expert") ? "/expert" : "/expert/login";
  return "/studio";
}
export function emailReturnUrl(portal: Portal, recovery = false) {
  return `${window.location.origin}/${recovery ? "reset-password" : "auth/callback"}?portal=${portal}`;
}
export function readPortal(search: string): Portal {
  const value = new URLSearchParams(search).get("portal");
  return value === "expert" || value === "admin" ? value : "user";
}