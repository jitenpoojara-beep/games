const BLOB_URL = "https://jsonblob.com/api/jsonBlob";

exports.handler = async (event) => {
  const headers = {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, PUT, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type"
  };

  // Handle CORS preflight
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 200, headers, body: "" };
  }

  const id = event.queryStringParameters && event.queryStringParameters.id;

  try {
    // CREATE new room
    if (event.httpMethod === "POST" && !id) {
      const r = await fetch(BLOB_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Accept": "application/json" },
        body: event.body || "[]"
      });
      const loc = r.headers.get("location");
      const blobId = loc ? loc.split("/").pop() : null;
      return { statusCode: 200, headers, body: JSON.stringify({ id: blobId }) };
    }

    if (!id) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: "Missing id" }) };
    }

    // READ room data
    if (event.httpMethod === "GET") {
      const r = await fetch(BLOB_URL + "/" + id, {
        headers: { "Accept": "application/json" }
      });
      if (!r.ok) {
        return { statusCode: r.status, headers, body: JSON.stringify({ error: "Not found" }) };
      }
      const data = await r.text();
      return { statusCode: 200, headers, body: data };
    }

    // UPDATE room data
    if (event.httpMethod === "PUT") {
      await fetch(BLOB_URL + "/" + id, {
        method: "PUT",
        headers: { "Content-Type": "application/json", "Accept": "application/json" },
        body: event.body
      });
      return { statusCode: 200, headers, body: JSON.stringify({ ok: true }) };
    }

    return { statusCode: 405, headers, body: JSON.stringify({ error: "Method not allowed" }) };
  } catch (e) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: e.message }) };
  }
};
