const couchbase = require("couchbase");

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function initCouchbase(cfg) {
  const {
    connStr,
    username,
    password,
    bucket,
    scope,
    usersCollection,
    messagesCollection,
  } = cfg;

  const cluster = await couchbase.connect(connStr, { username, password });

  let b;
  let lastErr;
  for (let i = 0; i < 30; i++) {
    try {
      b = cluster.bucket(bucket);
      await b.collections().getAllScopes();
      lastErr = null;
      break;
    } catch (e) {
      lastErr = e;
      await sleep(1000);
    }
  }
  if (lastErr) throw lastErr;

  const sc = b.scope(scope);

  return {
    cluster,
    bucket: b,
    scope: sc,
    usersCol: sc.collection(usersCollection),
    messagesCol: sc.collection(messagesCollection),
  };
}

module.exports = { initCouchbase };
