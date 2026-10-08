export function checkAccessCode(value: unknown) {
  const expected = process.env.PPA_ACCESS_CODE;
  if (!expected) return true;
  return typeof value === "string" && value === expected;
}
