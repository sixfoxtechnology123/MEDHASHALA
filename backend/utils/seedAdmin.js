const User = require("../models/User");
const { hashPassword } = require("./password");

const ADMIN_USERID = "admin";
const ADMIN_PASSWORD = "admin123";
const ADMIN_EMAIL = "admin@medhasala.local";

const seedAdmin = async () => {
  const hashedPassword = hashPassword(ADMIN_PASSWORD);

  const admin = await User.findOneAndUpdate(
    { name: ADMIN_USERID },
    {
      $set: {
        name: ADMIN_USERID,
        email: ADMIN_EMAIL,
        password: hashedPassword,
        role: "admin",
      },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  if (admin) {
    console.log("Default admin ready: userid=admin");
  }
};

module.exports = seedAdmin;
