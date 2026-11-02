import { describe, expect, it } from "vitest";
import { emailReturnUrl, loginPath, portalDestination, readPortal } from "./auth-flow";

describe("portal permissions and email returns", () => {
  it("never sends a regular user to admin", () => {
    expect(portalDestination("admin", [])).toBe("/auth");
    expect(portalDestination("admin", ["expert"])).toBe("/auth");
    expect(portalDestination("admin", ["admin"])).toBe("/admin");
  });
  it("requires approval before expert access", () => {
    expect(portalDestination("expert", [])).toBe("/expert/login");
    expect(portalDestination("expert", ["admin"])).toBe("/expert/login");
    expect(portalDestination("expert", ["expert"])).toBe("/expert");
  });
  it("keeps confirmation on a public same-origin page", () => {
    expect(emailReturnUrl("expert")).toBe(`${window.location.origin}/auth/callback?portal=expert`);
    expect(emailReturnUrl("admin", true)).toBe(`${window.location.origin}/reset-password?portal=admin`);
    expect(loginPath(readPortal("?portal=user"))).toBe("/auth");
    expect(loginPath(readPortal("?portal=admin"))).toBe("/admin/login");
    expect(readPortal("?portal=https://other.example")).toBe("user");
  });
});