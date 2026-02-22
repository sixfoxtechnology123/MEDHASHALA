const crypto = require("crypto");

const ITERATIONS = 100000;
const KEY_LENGTH = 64;
const DIGEST = "sha512";

exports.hashPassword = (password) => {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto
    .pbkdf2Sync(password, salt, ITERATIONS, KEY_LENGTH, DIGEST)
    .toString("hex");
  return `pbkdf2$${ITERATIONS}$${salt}$${hash}`;
};

exports.verifyPassword = (password, storedPassword) => {
  if (!storedPassword || typeof storedPassword !== "string") return false;

  if (!storedPassword.startsWith("pbkdf2$")) {
    return storedPassword === password;
  }

  const parts = storedPassword.split("$");
  if (parts.length !== 4) return false;

  const [, iterationsStr, salt, originalHash] = parts;
  const iterations = Number(iterationsStr);
  if (!iterations || !salt || !originalHash) return false;

  const computedHash = crypto
    .pbkdf2Sync(password, salt, iterations, KEY_LENGTH, DIGEST)
    .toString("hex");

  return crypto.timingSafeEqual(
    Buffer.from(originalHash, "hex"),
    Buffer.from(computedHash, "hex")
  );
};
