const DATA_KEY = "hvac_state";

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store"
    }
  });
}

export async function onRequestGet({ env }) {
  if (!env.HVAC_DATA) {
    return json({ error: "KV binding HVAC_DATA غير موجود" }, 500);
  }

  const data = await env.HVAC_DATA.get(DATA_KEY, "json");

  return json(data || {
    customDB: "{}",
    customCodes: "{}",
    history: "[]",
    catalogs: "[]",
    updatedAt: 0
  });
}

export async function onRequestPost({ request, env }) {
  if (!env.HVAC_DATA) {
    return json({ error: "KV binding HVAC_DATA غير موجود" }, 500);
  }

  try {
    const body = await request.json();

    const data = {
      customDB: typeof body.customDB === "string"
        ? body.customDB
        : JSON.stringify(body.customDB || {}),
      customCodes: typeof body.customCodes === "string"
        ? body.customCodes
        : JSON.stringify(body.customCodes || {}),
      history: typeof body.history === "string"
        ? body.history
        : JSON.stringify(body.history || []),
      catalogs: typeof body.catalogs === "string"
        ? body.catalogs
        : JSON.stringify(body.catalogs || []),
      updatedAt: Number(body.updatedAt) || Date.now()
    };

    await env.HVAC_DATA.put(DATA_KEY, JSON.stringify(data));

    return json({ ok: true, updatedAt: data.updatedAt });
  } catch (error) {
    return json({
      error: "بيانات غير صالحة",
      details: error.message
    }, 400);
  }
}
