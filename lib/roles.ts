export function isReadOnlyRole(role: string | null | undefined) {
  return role === "auditor" || role === "technologist";
}
