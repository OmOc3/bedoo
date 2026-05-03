import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { updateClientStationAccessSchema } from "@/lib/validation/client-orders";
import { createDailyWorkReportSchema } from "@/lib/validation/daily-reports";
import { updateAppSettingsSchema } from "@/lib/validation/settings";
import { updateShiftPayrollSchema } from "@/lib/validation/shifts";

describe("mobile API validation contracts", () => {
  it("accepts manager settings payloads and normalizes support email", () => {
    const result = updateAppSettingsSchema.safeParse({
      clientDailyStationOrderLimit: 25,
      maintenanceEnabled: false,
      maintenanceMessage: "صيانة ليلية",
      supportEmail: "SUPPORT@ECOPEST.EXAMPLE",
      supportHours: "9:00 - 17:00",
      supportPhone: "+20 100 000 0000",
    });

    assert.equal(result.success, true);
    if (result.success) {
      assert.equal(result.data.supportEmail, "support@ecopest.example");
    }
  });

  it("rejects invalid mobile settings limits", () => {
    const result = updateAppSettingsSchema.safeParse({
      clientDailyStationOrderLimit: 1001,
      maintenanceEnabled: true,
    });

    assert.equal(result.success, false);
  });

  it("requires salary amount before marking a shift as paid", () => {
    assert.equal(
      updateShiftPayrollSchema.safeParse({
        salaryStatus: "paid",
        shiftId: "shift-1",
      }).success,
      false,
    );

    assert.equal(
      updateShiftPayrollSchema.safeParse({
        salaryAmount: "150",
        salaryStatus: "paid",
        shiftId: "shift-1",
      }).success,
      true,
    );
  });

  it("validates daily work reports for mobile technicians and managers", () => {
    assert.equal(
      createDailyWorkReportSchema.safeParse({
        reportDate: "2026-05-03",
        stationIds: ["station-1", "station-2"],
        summary: "تمت مراجعة المحطات اليومية",
      }).success,
      true,
    );

    assert.equal(
      createDailyWorkReportSchema.safeParse({
        reportDate: "2026-05-03",
        stationIds: Array.from({ length: 51 }, (_, index) => `station-${index}`),
        summary: "تمت مراجعة المحطات اليومية",
      }).success,
      false,
    );
  });

  it("limits station access updates for client accounts", () => {
    assert.equal(
      updateClientStationAccessSchema.safeParse({
        clientUid: "client-1",
        stationIds: ["station-1", "station-2"],
      }).success,
      true,
    );

    assert.equal(
      updateClientStationAccessSchema.safeParse({
        clientUid: "client-1",
        stationIds: Array.from({ length: 501 }, (_, index) => `station-${index}`),
      }).success,
      false,
    );
  });
});
