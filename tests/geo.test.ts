import test from "node:test";
import assert from "node:assert/strict";
import { distanceMeters, maxLocationAccuracyMeters, stationAccessRadiusMeters, stationsWithinRadius } from "../lib/geo.ts";
import { assertStationAccessLocation } from "../lib/stations/location-access.ts";

test("distanceMeters returns zero for identical coordinates", () => {
  assert.equal(distanceMeters({ lat: 30.0444, lng: 31.2357 }, { lat: 30.0444, lng: 31.2357 }), 0);
});

test("stationsWithinRadius keeps only stations inside the access radius and sorts nearest first", () => {
  const origin = { lat: 0, lng: 0 };
  const stations = [
    { coordinates: { lat: 0, lng: 0.0015 }, stationId: "outside" },
    { coordinates: { lat: 0, lng: 0.0005 }, stationId: "near" },
    { coordinates: { lat: 0, lng: 0.0001 }, stationId: "nearest" },
    { stationId: "missing-location" },
  ];
  const result = stationsWithinRadius(stations, origin, stationAccessRadiusMeters);

  assert.deepEqual(
    result.map((entry) => entry.station.stationId),
    ["nearest", "near"],
  );
  assert.ok(result.every((entry) => entry.distanceMeters <= stationAccessRadiusMeters));
});

test("assertStationAccessLocation rejects stations outside the access radius", () => {
  assert.throws(
    () =>
      assertStationAccessLocation(
        { coordinates: { lat: 0, lng: 0 } },
        { lat: 0, lng: 0.0015 },
      ),
    { code: "STATION_ACCESS_OUT_OF_RANGE" },
  );
});

test("assertStationAccessLocation accepts GPS accuracy at the configured threshold", () => {
  assert.deepEqual(
    assertStationAccessLocation(
      { coordinates: { lat: 30.0444, lng: 31.2357 } },
      { accuracyMeters: maxLocationAccuracyMeters, lat: 30.0444, lng: 31.2357 },
    ),
    { distanceMeters: 0 },
  );
});

test("assertStationAccessLocation rejects GPS accuracy worse than fifty meters", () => {
  assert.equal(maxLocationAccuracyMeters, 50);
  assert.throws(
    () =>
      assertStationAccessLocation(
        { coordinates: { lat: 30.0444, lng: 31.2357 } },
        { accuracyMeters: maxLocationAccuracyMeters + 1, lat: 30.0444, lng: 31.2357 },
      ),
    { code: "STATION_ACCESS_LOCATION_ACCURACY_LOW" },
  );
});
