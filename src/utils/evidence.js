// src/utils/evidence.js

export async function collectClientEvidence() {
  const now = new Date().toISOString();

  const evidence = {
    capturedAt: now,

    userAgent: navigator.userAgent || "",
    language: navigator.language || "",
    platform: navigator.platform || "",
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "",
    timezoneOffsetMinutes: new Date().getTimezoneOffset(),

    screen: {
      width: window.screen?.width ?? null,
      height: window.screen?.height ?? null,
      devicePixelRatio: window.devicePixelRatio ?? null,
    },

    viewport: {
      innerWidth: window.innerWidth ?? null,
      innerHeight: window.innerHeight ?? null,
    },

    permissions: await getPermissionStates(),
    geo: await getGeoEvidence(),
  };

  return evidence;
}

async function getPermissionStates() {
  const result = { supported: !!navigator.permissions };

  result.camera = "unknown";
  result.microphone = "unknown";
  result.geolocation = "unknown";

  if (!navigator.permissions?.query) return result;

  try {
    const cam = await navigator.permissions.query({ name: "camera" });
    result.camera = cam.state;
  } catch {}

  try {
    const mic = await navigator.permissions.query({ name: "microphone" });
    result.microphone = mic.state;
  } catch {}

  try {
    const geo = await navigator.permissions.query({ name: "geolocation" });
    result.geolocation = geo.state;
  } catch {}

  return result;
}

function getGeoEvidence() {
  return new Promise((resolve) => {
    if (!navigator.geolocation) return resolve({ supported: false });

    navigator.geolocation.getCurrentPosition(
      (pos) =>
        resolve({
          supported: true,
          allowed: true,
          lat: pos.coords.latitude,
          lon: pos.coords.longitude,
          accuracyMeters: pos.coords.accuracy,
          timestamp: pos.timestamp,
        }),
      (err) =>
        resolve({
          supported: true,
          allowed: false,
          error: { code: err.code, message: err.message },
        }),
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 0 }
    );
  });
}

export async function sendEvidence(caseId) {
  const data = await collectClientEvidence();

  const r = await fetch("/api/case/evidence", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ caseId, data }),
  });

  const out = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(out?.error || `Failed evidence (HTTP ${r.status})`);

  return out;
}
