const express = require("express");
const router = express.Router();
const {
  register,
  login,
  changePassword,
} = require("../controllers/authController");
const { verifyToken } = require("../middleware/auth");
const MatriculaController = require("../controllers/matriculaController");

// Rutas públicas
router.post("/matricula", MatriculaController.registrarMatricula);

module.exports = router;
