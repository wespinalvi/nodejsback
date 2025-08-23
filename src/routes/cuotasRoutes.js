const express = require('express');
const router = express.Router();
const CuotasController = require('../controllers/cuotasController');
const { verifyToken } = require('../middleware/auth');

// Ruta para listar cuotas del alumno autenticado
router.get('/mi-cuota', verifyToken, CuotasController.listarCuotasAlumno);

// Ruta para obtener cuotas completas por DNI y año (protegida - solo director)
router.get('/estudiante/:dni/:anio', verifyToken, CuotasController.obtenerCuotasPorDniYAnio);

// Ruta para marcar cuota como pagada (protegida - solo director)
router.put('/marcar-pagada', verifyToken, CuotasController.marcarCuotaComoPagada);

module.exports = router; 