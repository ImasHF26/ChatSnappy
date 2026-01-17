// messageModel.couchbase.js
// npm i couchbase

const couchbase = require("couchbase");

const BUCKET_NAME = process.env.CB_BUCKET || "app";
const SCOPE_NAME = process.env.CB_SCOPE || "_default";
const USERS_COLLECTION = process.env.CB_USERS_COLLECTION || "users";
const MESSAGES_COLLECTION = process.env.CB_MESSAGES_COLLECTION || "messages";

const MSG_PREFIX = "msg::";

async function initCouchbase() {
  const cluster = await couchbase.connect(process.env.CB_CONNSTR, {
    username: process.env.CB_USERNAME,
    password: process.env.CB_PASSWORD,
  });

  const bucket = cluster.bucket(BUCKET_NAME);
  const scope = bucket.scope(SCOPE_NAME);

  return {
    cluster,
    usersCol: scope.collection(USERS_COLLECTION),
    messagesCol: scope.collection(MESSAGES_COLLECTION),
  };
}

function messageKey() {
  // clé simple, assez unique pour un chat
  return `${MSG_PREFIX}${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function validateMessageInput({ text, users, senderId }) {
  if (!text || !text.trim()) throw new Error("message.text requis");
  if (!Array.isArray(users) || users.length < 2) throw new Error("users doit être un tableau de 2+ ids");
  if (!senderId) throw new Error("senderId requis");
}

async function createMessage({ messagesCol }, { text, users, senderId }) {
  validateMessageInput({ text, users, senderId });

  const now = new Date().toISOString();
  const key = messageKey();

  const doc = {
    type: "message",
    message: { text: text.trim() },
    users,
    senderId,
    createdAt: now,
    updatedAt: now,
  };

  await messagesCol.insert(key, doc);
  return { id: key, ...doc };
}

async function getMessagesBetween({ cluster }, userAId, userBId) {
  // On suppose users contient les 2 ids
  const q = `
    SELECT META(m).id AS id, m.*
    FROM \`${BUCKET_NAME}\`.\`${SCOPE_NAME}\`.\`${MESSAGES_COLLECTION}\` AS m
    WHERE m.type = "message"
      AND ARRAY_CONTAINS(m.users, $userA)
      AND ARRAY_CONTAINS(m.users, $userB)
    ORDER BY m.createdAt ASC
  `;

  const res = await cluster.query(q, { parameters: { userA: userAId, userB: userBId } });
  return res.rows;
}

async function deleteMessage({ messagesCol }, messageId) {
  await messagesCol.remove(messageId);
  return { ok: true };
}

module.exports = {
  initCouchbase,
  createMessage,
  getMessagesBetween,
  deleteMessage,
};
