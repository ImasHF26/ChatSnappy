// controllers/messageController.js (Couchbase)
const BUCKET = process.env.CB_BUCKET || "app";
const SCOPE = process.env.CB_SCOPE || "_default";
const MESSAGES_COLLECTION = process.env.CB_MESSAGES_COLLECTION || "messages";

module.exports.getMessages = async (req, res, next) => {
  try {
    const { from, to } = req.body;
    const { cluster } = req.app.locals.couchbase;

    const q = `
      SELECT META(m).id AS _id, m.senderId, m.message, m.createdAt, m.updatedAt
      FROM \`${BUCKET}\`.\`${SCOPE}\`.\`${MESSAGES_COLLECTION}\` AS m
      WHERE m.type = "message"
        AND ARRAY_CONTAINS(m.users, $from)
        AND ARRAY_CONTAINS(m.users, $to)
      ORDER BY m.updatedAt ASC
    `;

    const r = await cluster.query(q, { parameters: { from, to } });

    const projectedMessages = r.rows.map((msg) => ({
      fromSelf: String(msg.senderId) === String(from),
      message: msg.message?.text || "",
    }));

    return res.json(projectedMessages);
  } catch (ex) {
    next(ex);
  }
};

module.exports.addMessage = async (req, res, next) => {
  try {
    const { from, to, message } = req.body;
    const { messagesCol } = req.app.locals.couchbase;

    const now = new Date().toISOString();
    const key = `msg::${Date.now()}-${Math.random().toString(16).slice(2)}`;

    const doc = {
      type: "message",
      message: { text: message },
      users: [from, to],
      senderId: from,
      createdAt: now,
      updatedAt: now,
    };

    await messagesCol.insert(key, doc);

    return res.json({ msg: "Message added successfully." });
  } catch (ex) {
    next(ex);
  }
};
