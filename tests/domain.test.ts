import { describe, it, expect } from "vitest";
import { cleanText, overlaps, validateDates, validDay } from "../lib/domain";
describe("loan dates", () => {
  it("rejects impossible dates", () => {
    expect(validDay("2026-02-30")).toBe(false);
    expect(validDay("2026-13-01")).toBe(false);
  });
  it("accepts leap days only in leap years", () => {
    expect(validDay("2028-02-29")).toBe(true);
    expect(validDay("2027-02-29")).toBe(false);
  });
  it("allows a same-day loan", () =>
    expect(() => validateDates("2026-11-02", "2026-11-02", "2026-11-02")).not.toThrow());
  it("rejects reversed dates", () =>
    expect(() => validateDates("2026-11-04", "2026-11-03", "2026-11-02")).toThrow());
  it("rejects past dates", () =>
    expect(() => validateDates("2026-11-01", "2026-11-03", "2026-11-02")).toThrow());
  it("caps duration and booking horizon", () => {
    expect(() => validateDates("2026-11-02", "2026-12-03", "2026-11-02")).toThrow();
    expect(() => validateDates("2027-11-02", "2027-11-03", "2026-11-02")).toThrow();
  });
  it("treats dates as inclusive", () => {
    expect(overlaps("2026-11-02", "2026-11-04", "2026-11-04", "2026-11-05")).toBe(true);
    expect(overlaps("2026-11-02", "2026-11-03", "2026-11-04", "2026-11-05")).toBe(false);
  });
  it("trims text and rejects control characters", () => {
    expect(cleanText("  Drill  ", "Name", 2, 80)).toBe("Drill");
    expect(() => cleanText("x\u0000y", "Name", 2, 80)).toThrow();
  });
});
