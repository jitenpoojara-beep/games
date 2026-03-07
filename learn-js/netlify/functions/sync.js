const https = require("https");

const BLOB_HOST = "jsonblob.com";
const BLOB_PATH = "/api/jsonBlob";

function makeRequest(method, path, body) {
  return new Promise(function (resolve, reject) {
    var options = {
      hostname: BLOB_HOST,
      path: path,
      method: method,
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json"
      }
    };

    var req = https.request(options, function (res) {
      var data = "";
      res.on("data", function (chunk) { data += chunk; });
      res.on("end", function () {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body: data
        });
      });
    });

    req.on("error", reject);
    if (body) req.write(body);
    req.end();
  });
}

exports.handler = async function (event) {
  var headers = {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, PUT, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type"
  };

  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 200, headers: headers, body: "" };
  }

  var id = event.queryStringParameters && event.queryStringParameters.id;

  try {
    // CREATE new room
    if (event.httpMethod === "POST" && !id) {
      var r = await makeRequest("POST", BLOB_PATH, event.body || "[]");
      var loc = r.headers["location"] || "";
      var blobId = loc ? loc.split("/").pop() : null;
      return { statusCode: 200, headers: headers, body: JSON.stringify({ id: blobId }) };
    }

    if (!id) {
      return { statusCode: 400, headers: headers, body: JSON.stringify({ error: "Missing id" }) };
    }

    // READ room data
    if (event.httpMethod === "GET") {
      var r2 = await makeRequest("GET", BLOB_PATH + "/" + id, null);
      if (r2.statusCode !== 200) {
        return { statusCode: r2.statusCode, headers: headers, body: JSON.stringify({ error: "Not found" }) };
      }
      return { statusCode: 200, headers: headers, body: r2.body };
    }

    // UPDATE room data
    if (event.httpMethod === "PUT") {
      await makeRequest("PUT", BLOB_PATH + "/" + id, event.body);
      return { statusCode: 200, headers: headers, body: JSON.stringify({ ok: true }) };
    }

    return { statusCode: 405, headers: headers, body: JSON.stringify({ error: "Method not allowed" }) };
  } catch (e) {
    return { statusCode: 500, headers: headers, body: JSON.stringify({ error: e.message }) };
  }
};
