const express = require('express');
const multer = require('multer');
const router = express.Router();
const { verifyToken } = require('../middleware/auth');
const {
  crearJustificacion,
  obtenerJustificacionesAlumno,
  obtenerJustificacionesDocente,
  obtenerTodasJustificaciones,
  obtenerJustificacionPorId,
  actualizarEstadoJustificacion,
  eliminarJustificacion
} = require('../controllers/justificacionController');

// Configurar multer para subir archivos
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB máximo
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Solo se permiten archivos PDF'), false);
    }
  }
});

// Rutas para alumnos
router.post('/crear', verifyToken, upload.single('pdf'), crearJustificacion);
router.get('/mis-justificaciones', verifyToken, obtenerJustificacionesAlumno);
router.get('/:id', verifyToken, obtenerJustificacionPorId);

// Rutas para docentes
router.get('/docente/justificaciones', verifyToken, obtenerJustificacionesDocente);
router.put('/:id/estado', verifyToken, actualizarEstadoJustificacion);

// Rutas para admin
router.get('/admin/todas', verifyToken, obtenerTodasJustificaciones);
router.delete('/:id', verifyToken, eliminarJustificacion);

module.exports = router; 