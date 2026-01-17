const express = require("express");
const cors = require("cors");
const socket = require("socket.io");
require("dotenv").config();

const { initCouchbase } = require("./db/couchbase");
const authRoutes = require("./routes/auth");
const messageRoutes = require("./routes/messages");

const app = express();

app.use(cors());
app.use(express.json());

app.get("/ping", (_req, res) => {
  res.json({ msg: "Ping Successful" });
});

app.use("/api/auth", authRoutes);
app.use("/api/messages", messageRoutes);

let server;
let io;

async function start() {
  try {
    const cb = await initCouchbase({
      connStr: process.env.CB_CONNSTR,
      username: process.env.CB_USERNAME,
      password: process.env.CB_PASSWORD,
      bucket: process.env.CB_BUCKET,
      scope: process.env.CB_SCOPE,
      usersCollection: process.env.CB_USERS_COLLECTION,
      messagesCollection: process.env.CB_MESSAGES_COLLECTION,
    });

    app.locals.couchbase = cb;
    console.log("Couchbase ready");

    if (!server) {
      server = app.listen(process.env.PORT, () => {
        console.log(`Server started on ${process.env.PORT}`);
      });

      io = socket(server, {
        cors: {
          origin: "http://localhost:3000",
          credentials: true,
        },
      });

      global.onlineUsers = new Map();

      io.on("connection", (sock) => {
        sock.on("add-user", (userId) => {
          onlineUsers.set(userId, sock.id);
        });

        sock.on("send-msg", (data) => {
          const sendUserSocket = onlineUsers.get(data.to);
          if (sendUserSocket) {
            sock.to(sendUserSocket).emit("msg-recieve", data.msg);
          }
        });
      });
    }
  } catch (err) {
    console.error("Couchbase not ready, retrying in 3s:", err.message);
    setTimeout(start, 3000);
  }
}

start();

process.on("unhandledRejection", (err) => {
  console.error("unhandledRejection:", err);
});

process.on("uncaughtException", (err) => {
  console.error("uncaughtException:", err);
});
