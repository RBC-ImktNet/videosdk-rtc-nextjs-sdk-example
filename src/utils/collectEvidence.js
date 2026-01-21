// src/utils/collectEvidence.js

async function safeJsonPermissions() {
  // Permissions API pode falhar dependendo do browser/contexto
  const result = { supported: false, camera: "unknown", microphone: "unknown", geolocation: "unknown" };

  try {
    if (!navigator?.permissions?.query) return result;

    result.supported = true;

    const queryOne = async (name) => {
      try {
        const status = await navigator.permissions.query({ name });
        return status?.state || "unknown";
      } catch {
        return "unknown";
      }
    };

    result.camera = await queryOne("camera");
    result.microphone = await queryOne("microphone");
    result.geolocation = await queryOne("geolocation");

    return result;
  } catch {
    return result;
  }
}

function getTimezoneSafe() {
  try {
    // ✅ correto: precisa ser uma instância
    return Intl.DateTimeFormat().resolvedOptions().timeZone || null;
  } catch {
    return null;
  }
}

function getScreenSafe() {
  try {
    return {
      width: window?.screen?.width ?? null,
      height: window?.screen?.height ?? null,
      devicePixelRatio: window?.devicePixelRatio ?? null,
    };
  } catch {
    return { width: null, height: null, devicePixelRatio: null };
  }
}

function getViewportSafe() {
  try {
    return {
      innerWidth: window?.innerWidth ?? null,
      innerHeight: window?.innerHeight ?? null,
    };
  } catch {
    return { innerWidth: null, innerHeight: null };
  }
}

function getLangSafe() {
  try {
    return navigator?.language || (navigator?.languages?.[0] ?? null);
  } catch {
    return null;
  }
}

async function getGeoSafe({ timeoutMs = 8000 } = {}) {
  const out = { supported: false, allowed: false, coords: null, error: null };

  try {
    if (!navigator?.geolocation?.getCurrentPosition) return out;

    out.supported = true;

    const pos = await new Promise((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(resolve, reject, {
        enableHighAccuracy: false,
        timeout: timeoutMs,
        maximumAge: 0,
      });
    });

    out.allowed = true;
    out.coords = {
      latitude: pos?.coords?.latitude ?? null,
      longitude: pos?.coords?.longitude ?? null,
      accuracy: pos?.coords?.accuracy ?? null,
    };

    return out;
  } catch (e) {
    out.allowed = false;
    out.error = {
      code: e?.code ?? null,
      message: e?.message ?? String(e),
    };
    return out;
  }
}

/**
 * Coleta evidências "leves" (sem biometria)
 * - NÃO quebra se geo for negado
 * - NÃO quebra por Intl/resolvedOptions
 */
export async function collectEvidence(options = {}) {
  const {
    requireGeo = false, // se true, dá throw se geo negar
    geoTimeoutMs = 8000,
  } = options;

  const capturedAt = new Date().toISOString();

  const data = {
    capturedAt,
    userAgent: (() => {
      try { return navigator?.userAgent || null; } catch { return null; }
    })(),
    language: getLangSafe(),
    platform: (() => {
      try { return navigator?.platform || null; } catch { return null; }
    })(),
    timezone: getTimezoneSafe(),
    timezoneOffsetMinutes: (() => {
      try { return new Date().getTimezoneOffset(); } catch { return null; }
    })(),
    screen: getScreenSafe(),
    viewport: getViewportSafe(),
    permissions: await safeJsonPermissions(),
    geo: await getGeoSafe({ timeoutMs: geoTimeoutMs }),
  };

  if (requireGeo && data.geo?.allowed !== true) {
    throw new Error("Geolocalização é obrigatória para continuar (negada ou indisponível).");
  }

  // você pode acrescentar IP aqui? NÃO no client.
  // IP fica melhor no server-side (já está no serverEvidence).

  return data;
}
