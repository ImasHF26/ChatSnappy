// userModel.couchbase.js
// npm i couchbase bcryptjs

const couchbase = require("couchbase");
const bcrypt = require("bcryptjs");

const BUCKET_NAME = process.env.CB_BUCKET || "app";
const SCOPE_NAME = process.env.CB_SCOPE || "_default";
const COLLECTION_NAME = process.env.CB_COLLECTION || "users";

const USER_DOC_PREFIX = "user::";

// Connexion Couchbase, à appeler au démarrage de l’app
async function initCouchbase() {
  const cluster = await couchbase.connect(process.env.CB_CONNSTR, {
    username: process.env.CB_USERNAME,
    password: process.env.CB_PASSWORD,
  });

  const bucket = cluster.bucket(BUCKET_NAME);
  const scope = bucket.scope(SCOPE_NAME);
  const users = scope.collection(COLLECTION_NAME);

  return { cluster, bucket, users };
}

// Validations proches de ton schéma Mongoose
function validateUserInput({ username, email, password }) {
  if (!username || username.length < 3 || username.length > 20) {
    throw new Error("username doit contenir entre 3 et 20 caractères");
  }
  if (!email || email.length > 50) {
    throw new Error("email est requis, max 50 caractères");
  }
  if (!password || password.length < 8) {
    throw new Error("password doit contenir au moins 8 caractères");
  }
}

function buildUserDoc({ username, email, passwordHash, avatarImage = "" }) {
  return {
    type: "user",
    username,
    email,
    password: passwordHash,
    isAvatarImageSet: Boolean(avatarImage),
    avatarImage,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

// Utilitaires de clés
function userKeyFromUsername(username) {
  return `${USER_DOC_PREFIX}${username.toLowerCase()}`;
}

// Unicité email via doc d’index
// Clé: email::<emailLower> => { type:"userEmail", username:"..." }
function emailKey(email) {
  return `email::${email.toLowerCase()}`;
}

async function ensureUniqueEmail(usersCollection, email, username) {
  const key = emailKey(email);

  try {
    await usersCollection.insert(key, {
      type: "userEmail",
      username: username.toLowerCase(),
      createdAt: new Date().toISOString(),
    });
  } catch (e) {
    if (e instanceof couchbase.DocumentExistsError) {
      throw new Error("email déjà utilisé");
    }
    throw e;
  }
}

async function createUser({ users }, { username, email, password, avatarImage = "" }) {
  validateUserInput({ username, email, password });

  const userId = userKeyFromUsername(username);
  const passwordHash = await bcrypt.hash(password, 10);

  // 1) Réserver l’email (unicité)
  await ensureUniqueEmail(users, email, username);

  // 2) Créer le user (unicité username via key)
  const doc = buildUserDoc({ username, email, passwordHash, avatarImage });

  try {
    await users.insert(userId, doc);
    return { id: userId, ...doc, password: undefined };
  } catch (e) {
    // rollback email si username déjà pris
    try {
      await users.remove(emailKey(email));
    } catch (_) {}

    if (e instanceof couchbase.DocumentExistsError) {
      throw new Error("username déjà utilisé");
    }
    throw e;
  }
}

async function getUserByUsername({ users }, username) {
  const key = userKeyFromUsername(username);
  const res = await users.get(key);
  const user = res.content;
  delete user.password;
  return { id: key, ...user };
}

async function verifyLogin({ users }, usernameOrEmail, password) {
  // Si c’est un email, on récupère username via doc email::...
  let username = usernameOrEmail;

  if (usernameOrEmail.includes("@")) {
    const emailDoc = await users.get(emailKey(usernameOrEmail));
    username = emailDoc.content.username;
  }

  const key = userKeyFromUsername(username);
  const res = await users.get(key);
  const user = res.content;

  const ok = await bcrypt.compare(password, user.password);
  if (!ok) throw new Error("identifiants invalides");

  delete user.password;
  return { id: key, ...user };
}

async function updateAvatar({ users }, username, avatarImage) {
  const key = userKeyFromUsername(username);

  await users.mutateIn(key, [
    couchbase.MutateInSpec.upsert("avatarImage", avatarImage),
    couchbase.MutateInSpec.upsert("isAvatarImageSet", true),
    couchbase.MutateInSpec.upsert("updatedAt", new Date().toISOString()),
  ]);

  return getUserByUsername({ users }, username);
}

module.exports = {
  initCouchbase,
  createUser,
  getUserByUsername,
  verifyLogin,
  updateAvatar,
};
