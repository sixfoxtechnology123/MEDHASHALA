const jwt = require("jsonwebtoken");
const User = require("../models/User");
const { verifyPassword } = require("../utils/password");

const JWT_SECRET = process.env.JWT_SECRET || "dev_jwt_secret_change_me";

exports.login = async (req, res) => {
  try {
    const { userid, email, password } = req.body;
    const identifier = userid || email;

    if (!identifier || !password) {
      return res.status(400).json({ message: "Userid and password are required" });
    }

    const user = await User.findOne({
      $or: [{ name: identifier }, { email: identifier }],
    });
    if (!user || !verifyPassword(password, user.password)) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const token = jwt.sign(
      { id: user._id, role: user.role, email: user.email },
      JWT_SECRET,
      { expiresIn: "1d" }
    );

    return res.status(200).json({
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    return res.status(500).json({ message: "Login failed", error: error.message });
  }
};
