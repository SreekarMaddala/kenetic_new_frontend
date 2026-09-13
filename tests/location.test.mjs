import test from "node:test";
import assert from "node:assert/strict";
import { captureLocation, attendanceMapUrl } from "../src/lib/location.ts";

test("map links accept real coordinates including zero and reject invalid locations", () => {
  assert.equal(
    attendanceMapUrl({ latitude: 0, longitude: 0 }),
    "https://www.google.com/maps/search/?api=1&query=0%2C0",
  );
  for (const location of [
    undefined,
    {},
    { latitude: 91, longitude: 0 },
    { latitude: "12", longitude: 77 },
  ])
    assert.equal(attendanceMapUrl(location), null);
});

test("capture requests a fresh fix and reports permission errors", async (t) => {
  const navigatorDescriptor = Object.getOwnPropertyDescriptor(globalThis, "navigator");
  const windowDescriptor = Object.getOwnPropertyDescriptor(globalThis, "window");
  t.after(() => {
    if (navigatorDescriptor) Object.defineProperty(globalThis, "navigator", navigatorDescriptor);
    else delete globalThis.navigator;
    if (windowDescriptor) Object.defineProperty(globalThis, "window", windowDescriptor);
    else delete globalThis.window;
  });
  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: { isSecureContext: true },
  });
  const geolocation = {
    getCurrentPosition(success, _error, options) {
      assert.equal(options.maximumAge, 0);
      assert.equal(options.enableHighAccuracy, true);
      success({ coords: { latitude: 12, longitude: 77, accuracy: 10 } });
    },
  };
  Object.defineProperty(globalThis, "navigator", { configurable: true, value: { geolocation } });
  assert.deepEqual(await captureLocation(), { latitude: 12, longitude: 77, accuracy: 10 });
  geolocation.getCurrentPosition = (_success, error) => error({ code: 1 });
  await assert.rejects(captureLocation(), /permission was denied/);
  geolocation.getCurrentPosition = (_success, error) => error({ code: 3 });
  await assert.rejects(captureLocation(), /timed out/);
});
