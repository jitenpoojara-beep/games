var https = require("https");

var BLOB_ID = "019cc982-26ae-7d46-8d38-6c6cf3de4233";

function blobRequest(method, data) {
  return new Promise(function(resolve, reject) {
    var options = {
      hostname: "jsonblob.com",
      path: "/api/jsonBlob/" + BLOB_ID,
      method: method,
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json"
      }
    };

    var req = https.request(options, function(res) {
      var body = "";
      res.on("data", function(chunk) { body += chunk; });
      res.on("end", function() {
        try {
          resolve(JSON.parse(body));
        } catch(e) {
          resolve(null);
        }
      });
    });

    req.on("error", reject);

    if (data) {
      req.write(JSON.stringify(data));
    }
    req.end();
  });
}

function mergeLeaderboards(local, cloud) {
  var all = (cloud || []).concat(local || []);
  var seen = {};
  var unique = [];

  for (var i = 0; i < all.length; i++) {
    var e = all[i];
    var key = e.name + "|" + e.score + "|" + e.topic + "|" + e.difficulty + "|" + e.date;
    if (!seen[key]) {
      seen[key] = true;
      unique.push(e);
    }
  }

  var diffOrder = { hard: 0, medium: 1, easy: 2 };
  unique.sort(function(a, b) {
    var da = diffOrder[a.difficulty] !== undefined ? diffOrder[a.difficulty] : 3;
    var db = diffOrder[b.difficulty] !== undefined ? diffOrder[b.difficulty] : 3;
    if (da !== db) return da - db;
    return b.score - a.score;
  });

  if (unique.length > 100) unique = unique.slice(0, 100);
  return unique;
}

exports.handler = async function(event) {
  var headers = {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type"
  };

  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 200, headers: headers, body: "" };
  }

  try {
    if (event.httpMethod === "GET") {
      var data = await blobRequest("GET");
      return {
        statusCode: 200,
        headers: headers,
        body: JSON.stringify(data && data.leaderboard ? data.leaderboard : [])
      };
    }

    if (event.httpMethod === "POST") {
      var localScores = JSON.parse(event.body).leaderboard || [];

      // Get current cloud data
      var cloudData = await blobRequest("GET");
      var cloudScores = cloudData && cloudData.leaderboard ? cloudData.leaderboard : [];

      // Merge local + cloud
      var merged = mergeLeaderboards(localScores, cloudScores);

      // Save merged back to cloud
      await blobRequest("PUT", { leaderboard: merged });

      return {
        statusCode: 200,
        headers: headers,
        body: JSON.stringify(merged)
      };
    }

    return { statusCode: 405, headers: headers, body: "Method not allowed" };
  } catch(err) {
    return {
      statusCode: 500,
      headers: headers,
      body: JSON.stringify({ error: err.message })
    };
  }
};
