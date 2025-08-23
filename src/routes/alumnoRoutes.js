const express = require("express");
const {
  listarAlumnosConApoderados,
  verMiAsistencia,
  obtenerMisDatos,
  obtenerDatosEstudiante,
  editarDatosEstudiante,
} = require("../controllers/alumnoController");
const { verifyToken, isDirector } = require("../middleware/auth");
const router = express.Router();

// Rutas públicas
router.get("/lista-alumnos/:anio/:grado", listarAlumnosConApoderados);

// Rutas protegidas (requieren autenticación)
router.get("/mi-asistencia", verifyToken, verMiAsistencia);
router.get("/mis-datos", verifyToken, obtenerMisDatos);

// Rutas para directores (requieren autenticación y rol de director)
router.get("/estudiante/:id", verifyToken, isDirector, obtenerDatosEstudiante);
router.put("/estudiante/:id", verifyToken, isDirector, editarDatosEstudiante);

module.exports = router;
