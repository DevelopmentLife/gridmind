import { describe, it, expect, beforeEach } from "vitest";
import { useFeatureFlagStore } from "@/stores/featureFlagStore";
import type { FeatureFlag } from "@/types";

const MOCK_FLAGS: FeatureFlag[] = [
  {
    flagId: "ff-001",
    name: "new_dashboard",
    description: "Redesigned dashboard experience",
    status: "enabled",
    rolloutPercentage: 100,
    enabledTenants: [],
    disabledTenants: [],
    createdAt: "2025-01-01T00:00:00Z",
    updatedAt: "2025-02-01T00:00:00Z",
    updatedBy: "eng@gridmindai.dev",
    tags: ["ui", "dashboard"],
  },
  {
    flagId: "ff-002",
    name: "beta_api",
    description: "New API v2 beta endpoints",
    status: "disabled",
    rolloutPercentage: 0,
    enabledTenants: ["t-001"],
    disabledTenants: [],
    createdAt: "2025-01-10T00:00:00Z",
    updatedAt: "2025-01-15T00:00:00Z",
    updatedBy: "cto@gridmindai.dev",
    tags: ["api", "beta"],
  },
  {
    flagId: "ff-003",
    name: "cost_forecasting",
    description: "AI cost forecasting for deployments",
    status: "partial",
    rolloutPercentage: 25,
    enabledTenants: [],
    disabledTenants: [],
    createdAt: "2025-02-01T00:00:00Z",
    updatedAt: "2025-03-01T00:00:00Z",
    updatedBy: "product@gridmindai.dev",
    tags: ["ai", "billing"],
  },
];

beforeEach(() => {
  useFeatureFlagStore.setState({
    flags: [],
    selectedFlag: null,
    isLoading: false,
    isSaving: null,
    error: null,
    searchQuery: "",
  });
});

describe("featureFlagStore", () => {
  describe("setFlags", () => {
    it("stores all flags", () => {
      useFeatureFlagStore.getState().setFlags(MOCK_FLAGS);
      expect(useFeatureFlagStore.getState().flags).toHaveLength(3);
    });

    it("replaces existing flags", () => {
      useFeatureFlagStore.getState().setFlags(MOCK_FLAGS);
      useFeatureFlagStore.getState().setFlags([MOCK_FLAGS[0]!]);
      expect(useFeatureFlagStore.getState().flags).toHaveLength(1);
    });
  });

  describe("setSelectedFlag", () => {
    it("sets selected flag", () => {
      useFeatureFlagStore.getState().setFlags(MOCK_FLAGS);
      useFeatureFlagStore.getState().setSelectedFlag(MOCK_FLAGS[0]!);
      expect(useFeatureFlagStore.getState().selectedFlag?.flagId).toBe("ff-001");
    });

    it("clears selected flag with null", () => {
      useFeatureFlagStore.getState().setSelectedFlag(MOCK_FLAGS[0]!);
      useFeatureFlagStore.getState().setSelectedFlag(null);
      expect(useFeatureFlagStore.getState().selectedFlag).toBeNull();
    });
  });

  describe("updateFlag", () => {
    it("updates matching flag in list", () => {
      useFeatureFlagStore.getState().setFlags(MOCK_FLAGS);
      const updated = { ...MOCK_FLAGS[0]!, status: "disabled" as const, rolloutPercentage: 0 };
      useFeatureFlagStore.getState().updateFlag(updated);
      const flags = useFeatureFlagStore.getState().flags;
      expect(flags.find((f) => f.flagId === "ff-001")?.status).toBe("disabled");
    });

    it("preserves other flags when updating one", () => {
      useFeatureFlagStore.getState().setFlags(MOCK_FLAGS);
      const updated = { ...MOCK_FLAGS[0]!, status: "disabled" as const };
      useFeatureFlagStore.getState().updateFlag(updated);
      expect(useFeatureFlagStore.getState().flags).toHaveLength(3);
    });

    it("updates selectedFlag if it matches the updated flag", () => {
      useFeatureFlagStore.getState().setFlags(MOCK_FLAGS);
      useFeatureFlagStore.getState().setSelectedFlag(MOCK_FLAGS[0]!);
      const updated = { ...MOCK_FLAGS[0]!, status: "disabled" as const };
      useFeatureFlagStore.getState().updateFlag(updated);
      expect(useFeatureFlagStore.getState().selectedFlag?.status).toBe("disabled");
    });

    it("does not change selectedFlag if it does not match", () => {
      useFeatureFlagStore.getState().setFlags(MOCK_FLAGS);
      useFeatureFlagStore.getState().setSelectedFlag(MOCK_FLAGS[1]!);
      const updated = { ...MOCK_FLAGS[0]!, status: "disabled" as const };
      useFeatureFlagStore.getState().updateFlag(updated);
      expect(useFeatureFlagStore.getState().selectedFlag?.flagId).toBe("ff-002");
    });
  });

  describe("addFlag", () => {
    it("appends a new flag to the list", () => {
      useFeatureFlagStore.getState().setFlags(MOCK_FLAGS);
      const newFlag: FeatureFlag = {
        flagId: "ff-004",
        name: "new_flag",
        description: "A new feature flag",
        status: "disabled",
        rolloutPercentage: 0,
        enabledTenants: [],
        disabledTenants: [],
        createdAt: "2025-03-20T00:00:00Z",
        updatedAt: "2025-03-20T00:00:00Z",
        updatedBy: "eng@gridmindai.dev",
        tags: [],
      };
      useFeatureFlagStore.getState().addFlag(newFlag);
      expect(useFeatureFlagStore.getState().flags).toHaveLength(4);
      expect(useFeatureFlagStore.getState().flags.at(-1)?.flagId).toBe("ff-004");
    });
  });

  describe("loading and saving state", () => {
    it("setLoading updates isLoading", () => {
      useFeatureFlagStore.getState().setLoading(true);
      expect(useFeatureFlagStore.getState().isLoading).toBe(true);
      useFeatureFlagStore.getState().setLoading(false);
      expect(useFeatureFlagStore.getState().isLoading).toBe(false);
    });

    it("setSaving stores the flagId being saved", () => {
      useFeatureFlagStore.getState().setSaving("ff-001");
      expect(useFeatureFlagStore.getState().isSaving).toBe("ff-001");
    });

    it("setSaving can be cleared with null", () => {
      useFeatureFlagStore.getState().setSaving("ff-001");
      useFeatureFlagStore.getState().setSaving(null);
      expect(useFeatureFlagStore.getState().isSaving).toBeNull();
    });
  });

  describe("error state", () => {
    it("setError stores error message", () => {
      useFeatureFlagStore.getState().setError("Failed to fetch flags");
      expect(useFeatureFlagStore.getState().error).toBe("Failed to fetch flags");
    });

    it("setError can clear error", () => {
      useFeatureFlagStore.getState().setError("Error");
      useFeatureFlagStore.getState().setError(null);
      expect(useFeatureFlagStore.getState().error).toBeNull();
    });
  });

  describe("searchQuery", () => {
    it("setSearchQuery updates query", () => {
      useFeatureFlagStore.getState().setSearchQuery("dashboard");
      expect(useFeatureFlagStore.getState().searchQuery).toBe("dashboard");
    });
  });

  describe("getFilteredFlags", () => {
    beforeEach(() => {
      useFeatureFlagStore.getState().setFlags(MOCK_FLAGS);
    });

    it("returns all flags when search is empty", () => {
      expect(useFeatureFlagStore.getState().getFilteredFlags()).toHaveLength(3);
    });

    it("filters by name", () => {
      useFeatureFlagStore.getState().setSearchQuery("dashboard");
      const result = useFeatureFlagStore.getState().getFilteredFlags();
      expect(result).toHaveLength(1);
      expect(result[0]?.flagId).toBe("ff-001");
    });

    it("filters by description", () => {
      useFeatureFlagStore.getState().setSearchQuery("forecasting");
      const result = useFeatureFlagStore.getState().getFilteredFlags();
      expect(result).toHaveLength(1);
      expect(result[0]?.flagId).toBe("ff-003");
    });

    it("filters by tag", () => {
      useFeatureFlagStore.getState().setSearchQuery("beta");
      const result = useFeatureFlagStore.getState().getFilteredFlags();
      expect(result).toHaveLength(1);
      expect(result[0]?.flagId).toBe("ff-002");
    });

    it("is case-insensitive", () => {
      useFeatureFlagStore.getState().setSearchQuery("DASHBOARD");
      const result = useFeatureFlagStore.getState().getFilteredFlags();
      expect(result).toHaveLength(1);
    });

    it("returns empty array when no match", () => {
      useFeatureFlagStore.getState().setSearchQuery("nonexistent-flag-xyz");
      expect(useFeatureFlagStore.getState().getFilteredFlags()).toHaveLength(0);
    });
  });

  describe("getEnabledCount / getDisabledCount / getPartialCount", () => {
    beforeEach(() => {
      useFeatureFlagStore.getState().setFlags(MOCK_FLAGS);
    });

    it("counts enabled flags correctly", () => {
      expect(useFeatureFlagStore.getState().getEnabledCount()).toBe(1);
    });

    it("counts disabled flags correctly", () => {
      expect(useFeatureFlagStore.getState().getDisabledCount()).toBe(1);
    });

    it("counts partial flags correctly", () => {
      expect(useFeatureFlagStore.getState().getPartialCount()).toBe(1);
    });

    it("returns 0 when no flags loaded", () => {
      useFeatureFlagStore.setState({ flags: [] });
      expect(useFeatureFlagStore.getState().getEnabledCount()).toBe(0);
      expect(useFeatureFlagStore.getState().getDisabledCount()).toBe(0);
      expect(useFeatureFlagStore.getState().getPartialCount()).toBe(0);
    });
  });

  describe("getFlagByName", () => {
    beforeEach(() => {
      useFeatureFlagStore.getState().setFlags(MOCK_FLAGS);
    });

    it("returns flag matching name", () => {
      const flag = useFeatureFlagStore.getState().getFlagByName("new_dashboard");
      expect(flag?.flagId).toBe("ff-001");
    });

    it("returns undefined for unknown name", () => {
      const flag = useFeatureFlagStore.getState().getFlagByName("unknown_flag");
      expect(flag).toBeUndefined();
    });
  });
});
