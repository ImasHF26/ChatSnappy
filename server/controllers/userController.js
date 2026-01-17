// controllers/userController.js (Couchbase)
const bcrypt = require("bcryptjs");

const BUCKET = process.env.CB_BUCKET || "app";
const SCOPE = process.env.CB_SCOPE || "_default";
const USERS_COLLECTION = process.env.CB_USERS_COLLECTION || "users";

// Convention clé user: user::<username>
// Si ton front envoie déjà un autre id, dis moi lequel et je l’aligne.
//const userKeyFromUsername = (username) => `user::${String(username).toLowerCase()}`;
const userKeyFromUsername = (username) =>
  `user::${String(username || "").trim().toLowerCase()}`;

/*
module.exports.login = async (req, res, next) => {
  try {
    const { username, password } = req.body;
    const { usersCol } = req.app.locals.couchbase;

    const key = userKeyFromUsername(username);

    let user;
    try {
      const r = await usersCol.get(key);
      user = r.content;
    } catch (e) {
      return res.json({ msg: "Incorrect Username or Password", status: false });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.json({ msg: "Incorrect Username or Password", status: false });
    }

    const safeUser = { ...user, _id: key };
    delete safeUser.password;

    return res.json({ status: true, user: safeUser });
  } catch (ex) {
    next(ex);
  }
};*/

module.exports.login = async (req, res, next) => {
  try {
    const { username, email, password } = req.body;
    const { usersCol } = req.app.locals.couchbase;

    const loginId = String(username || email || "").trim().toLowerCase();
    if (!loginId || !password) {
      return res.json({ msg: "Incorrect Username or Password", status: false });
    }

    let userKey;

    if (loginId.includes("@")) {
      try {
        const emailDoc = await usersCol.get(`email::${loginId}`);
        userKey = `user::${String(emailDoc.content.username).trim().toLowerCase()}`;
      } catch (_) {
        return res.json({ msg: "Incorrect Username or Password", status: false });
      }
    } else {
      userKey = `user::${loginId}`;
    }

    let user;
    try {
      const r = await usersCol.get(userKey);
      user = r.content;
    } catch (_) {
      return res.json({ msg: "Incorrect Username or Password", status: false });
    }

    const ok = await bcrypt.compare(password, user.password);
    if (!ok) {
      return res.json({ msg: "Incorrect Username or Password", status: false });
    }

    const safeUser = { ...user, _id: userKey };
    delete safeUser.password;

    return res.json({ status: true, user: safeUser });
  } catch (ex) {
    next(ex);
  }
};


module.exports.register = async (req, res, next) => {
  try {
    const { username, email, password } = req.body;
    const { usersCol } = req.app.locals.couchbase;

    const userKey = userKeyFromUsername(username);
    const emailKey = `email::${String(email).toLowerCase()}`;

    // username unique via key user::<username>
    try {
      await usersCol.get(userKey);
      return res.json({ msg: "Username already used", status: false });
    } catch (_) {}

    // email unique via doc email::<email>
    try {
      await usersCol.get(emailKey);
      return res.json({ msg: "Email already used", status: false });
    } catch (_) {}

    const hashedPassword = await bcrypt.hash(password, 10);

    const now = new Date().toISOString();
    const userDoc = {
      type: "user",
      email,
      username,
      password: hashedPassword,
      isAvatarImageSet: false,
      avatarImage: "",
      createdAt: now,
      updatedAt: now,
    };

    // réserve l’email d’abord
    await usersCol.insert(emailKey, { type: "userEmail", username: String(username).toLowerCase(), createdAt: now });

    // crée le user
    try {
      await usersCol.insert(userKey, userDoc);
    } catch (e) {
      // rollback email
      try {
        await usersCol.remove(emailKey);
      } catch (_) {}
      return res.json({ msg: "Username already used", status: false });
    }

    const safeUser = { ...userDoc, _id: userKey };
    delete safeUser.password;

    return res.json({ status: true, user: safeUser });
  } catch (ex) {
    next(ex);
  }
};

module.exports.getAllUsers = async (req, res, next) => {
  try {
    const { cluster } = req.app.locals.couchbase;
    const excludeId = req.params.id;

    const q = `
      SELECT META(u).id AS _id, u.email, u.username, u.avatarImage
      FROM \`${BUCKET}\`.\`${SCOPE}\`.\`${USERS_COLLECTION}\` AS u
      WHERE u.type = "user" AND META(u).id != $excludeId
    `;

    const r = await cluster.query(q, { parameters: { excludeId } });
    return res.json(r.rows);
  } catch (ex) {
    next(ex);
  }
};

module.exports.setAvatar = async (req, res, next) => {
  try {
    const userId = req.params.id; // attendu: "user::xxx"
    const avatarImage = req.body.image;
    const { usersCol } = req.app.locals.couchbase;
    const couchbase = require("couchbase");

    await usersCol.mutateIn(userId, [
      couchbase.MutateInSpec.upsert("isAvatarImageSet", true),
      couchbase.MutateInSpec.upsert("avatarImage", avatarImage),
      couchbase.MutateInSpec.upsert("updatedAt", new Date().toISOString()),
    ]);

    return res.json({ isSet: true, image: avatarImage });
  } catch (ex) {
    next(ex);
  }
};

module.exports.logOut = (req, res, next) => {
  try {
    if (!req.params.id) return res.json({ msg: "User id is required " });
    onlineUsers.delete(req.params.id);
    return res.status(200).send();
  } catch (ex) {
    next(ex);
  }
};
