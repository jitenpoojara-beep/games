var BLOB_URL = "https://jsonblob.com/api/jsonBlob/019cc982-26ae-7d46-8d38-6c6cf3de4233";

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

export default async function handler(request) {
  var headers = {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type"
  };

  if (request.method === "OPTIONS") {
    return new Response("", { headers: headers });
  }

  try {
    if (request.method === "GET") {
      var res = await fetch(BLOB_URL, {
        headers: { "Accept": "application/json" }
      });
      var data = await res.json();
      return new Response(JSON.stringify(data && data.leaderboard ? data.leaderboard : []), {
        headers: headers
      });
    }

    if (request.method === "POST") {
      var body = await request.json();
      var localScores = body.leaderboard || [];

      // Get current cloud data
      var cloudRes = await fetch(BLOB_URL, {
        headers: { "Accept": "application/json" }
      });
      var cloudData = await cloudRes.json();
      var cloudScores = cloudData && cloudData.leaderboard ? cloudData.leaderboard : [];

      // Merge
      var merged = mergeLeaderboards(localScores, cloudScores);

      // Save back
      await fetch(BLOB_URL, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ leaderboard: merged })
      });

      return new Response(JSON.stringify(merged), { headers: headers });
    }

    return new Response("Method not allowed", { status: 405, headers: headers });
  } catch(err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: headers
    });
  }
}

export var config = { path: "/api/sync" };
