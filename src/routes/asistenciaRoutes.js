const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/auth');
const {
  marcarAsistencia,
  obtenerAsistenciasPorDocente,
  obtenerAsistenciasPorAlumno,
  obtenerFaltasParaJustificar
} = require('../controllers/asistenciaController');

// Rutas para docentes
router.post('/marcar', verifyToken, marcarAsistencia);
router.get('/docente', verifyToken, obtenerAsistenciasPorDocente);

// Rutas para alumnos
router.get('/alumno', verifyToken, obtenerAsistenciasPorAlumno);
router.get('/faltas-justificar', verifyToken, obtenerFaltasParaJustificar);

module.exports = router; 