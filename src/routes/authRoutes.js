const express = require("express");
const router = express.Router();
const {
  register,
  login,
  changePassword,
  logout,
} = require("../controllers/authController");
const { verifyToken } = require("../middleware/auth");

// Rutas públicas
router.post("/register", register);
router.post("/login", login);

// Rutas protegidas (requieren token válido)
router.post("/change-password", changePassword);
router.post("/logout", verifyToken, logout);

module.exports = router;
