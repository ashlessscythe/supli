import { describe, expect, it } from "vitest";
import {
  auditDirectionLabel,
  classifyAuditDirection,
} from "@/lib/audit-action";

describe("classifyAuditDirection", () => {
  it("classifies receive and external order actions as in", () => {
    expect(
      classifyAuditDirection("Received 12 Rifle at Watchpoint Delta")
    ).toBe("in");
    expect(
      classifyAuditDirection("Logged external order for 4 Generator")
    ).toBe("in");
  });

  it("classifies consume, checkout, and approved request as out", () => {
    expect(classifyAuditDirection("Kiosk consumed 2 FCS")).toBe("out");
    expect(classifyAuditDirection("Checked out 1 Rifle")).toBe("out");
    expect(classifyAuditDirection("APPROVED request for 3 Armor")).toBe("out");
  });

  it("classifies unrelated actions as other", () => {
    expect(classifyAuditDirection("Created supply: Rifle")).toBe("other");
    expect(classifyAuditDirection("Updated system settings")).toBe("other");
    expect(classifyAuditDirection("DENIED request for 1 Rifle")).toBe("other");
    expect(
      classifyAuditDirection("Adjusted Rifle at Watchpoint Delta to 8")
    ).toBe("other");
  });
});

describe("auditDirectionLabel", () => {
  it("returns display labels", () => {
    expect(auditDirectionLabel("in")).toBe("In");
    expect(auditDirectionLabel("out")).toBe("Out");
    expect(auditDirectionLabel("other")).toBe("Other");
  });
});
