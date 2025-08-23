const express = require("express");
const router = express.Router();

const DocenteController = require("../controllers/docenteController");
const { pool } = require("../config/database");
const { verifyToken } = require("../middleware/auth");

// Ruta para registrar docente
router.post("/registrar-docente", async (req, res) => {
  const pool = req.app.locals.pool;
  const datos = req.body;

  const resultado = await DocenteController.registrarCompleto(pool, datos);

  if (resultado.success) {
    res.status(201).json(resultado);
  } else {
    res.status(400).json(resultado);
  }
});

// Ruta para listar docentes con cursos
router.get("/lista-docentes/:anio?", async (req, res) => {
  try {
    const anio = req.params.anio ? parseInt(req.params.anio) : null;

    // Validar que el año sea un número válido si se proporciona
    if (anio && (isNaN(anio) || anio < 2000 || anio > 2100)) {
      return res.status(400).json({
        success: false,
        message: "El año debe ser un número válido entre 2000 y 2100",
      });
    }

    const resultado = await DocenteController.listarConCursos(pool, anio);
    if (resultado.success) {
      res.json(resultado);
    } else {
      res.status(500).json(resultado);
    }
  } catch (error) {
    console.error("Error en la ruta de listar docentes con cursos:", error);
    res.status(500).json({
      success: false,
      message: "Error interno del servidor",
      error: {
        message: error.message,
        stack: error.stack,
      },
    });
  }
});

// Ruta para obtener datos del docente por año
router.get('/datos/:anio', DocenteController.getDatosDocentePorAnio);

// Ruta para exportar datos del docente a Excel
router.get('/exportar/:anio', DocenteController.exportarDatosDocenteExcel);

// Ruta para que el docente vea los alumnos de los grados que enseña por año
router.get("/alumnos-matriculados/:anio", verifyToken, DocenteController.listarAlumnosMatriculados);

// Ruta para que el docente autenticado vea solo sus cursos y datos por año
router.get("/mis-cursos/:anio", verifyToken, DocenteController.misCursosPorAnio);

// Ruta para registrar asistencia de un alumno
router.post("/registrar-asistencia", verifyToken, DocenteController.registrarAsistencia);

// Ruta para exportar asistencia a Excel por fecha, curso y grado
router.get("/exportar-asistencia", verifyToken, DocenteController.exportarAsistenciaExcel);

// Ruta para listar asistencias por fecha, curso y grado
router.get("/listar-asistencias", verifyToken, DocenteController.listarAsistencias);

module.exports = router;
