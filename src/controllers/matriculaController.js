const { withTransaction } = require("../config/database");

const Persona = require("../models/Persona");
const Alumno = require("../models/Alumno");
const Apoderado = require("../models/Apoderado");
const Grado = require("../models/Grado");
const Matricula = require("../models/Matricula");
const Cuota = require("../models/Cuota");
const AlumnoApoderado = require("../models/AlumnoApoderado");
const User = require("../models/User");

const bcrypt = require("bcryptjs");

class MatriculaController {
  /**
   * Registra una nueva matrícula completa con datos de alumno y apoderado
   */
  static async registrarMatricula(req, res) {
    try {
      const {
        alumno_dni,
        alumno_nombre,
        alumno_ap_p,
        alumno_ap_m,
        alumno_fecha_nacimiento,
        alumno_email,

        apoderado_dni,
        apoderado_nombre,
        apoderado_ap_p,
        apoderado_ap_m,
        apoderado_fecha_nacimiento,
        apoderado_telefono,
        apoderado_relacion,

        id_grado,
        dni_entregado,
        certificado_estudios,

        matricula_precio,
        c1,
        c2,
        c3,
        c4,
        c5,
        c6,
        c7,
        c8,
        c9,
        c10,
      } = req.body;

      if (
        !alumno_dni ||
        !alumno_nombre ||
        !alumno_ap_p ||
        !alumno_ap_m ||
        !alumno_fecha_nacimiento ||
        !apoderado_dni ||
        !id_grado
      ) {
        return res.status(400).json({
          status: false,
          message: "Faltan campos obligatorios para la matrícula",
        });
      }

      const resultado = await withTransaction(async (connection) => {
        const alumnoPersonaId = await Persona.crear(
          connection,
          alumno_dni,
          alumno_nombre,
          alumno_ap_p,
          alumno_ap_m,
          alumno_fecha_nacimiento
        );

        const alumnoId = await Alumno.crear(connection, alumnoPersonaId);

        // 📌 Generar contraseña
        const getPassword = () => {
          const nombre3 = alumno_nombre.slice(0, 3).toUpperCase();
          const apP2 = alumno_ap_p.slice(0, 2).toUpperCase();
          const apM2 = alumno_ap_m.slice(0, 2).toUpperCase();
          const dni4 = alumno_dni.slice(-4);
          const year = new Date(alumno_fecha_nacimiento).getFullYear();
          return `${nombre3}${apP2}${apM2}${dni4}${year}`;
        };

        const plainPassword = getPassword();
        const hashedPassword = await bcrypt.hash(plainPassword, 10);

        // 📌 Generar username
        const getUsername = () => {
          const primerNombre = alumno_nombre.trim().split(" ")[0].toLowerCase();
          const apellidoP = alumno_ap_p.toLowerCase();
          const fecha = new Date(alumno_fecha_nacimiento);
          const dd = String(fecha.getDate()).padStart(2, "0");
          const mm = String(fecha.getMonth() + 1).padStart(2, "0");
          const yyyy = fecha.getFullYear();
          return `${primerNombre}${apellidoP}${dd}${mm}${yyyy}`;
        };

        const username = getUsername();

        // 📌 Crear usuario
        const emailFinal = alumno_email || `${alumno_dni}@correo.com`;

        await User.crear(connection, {
          id_persona: alumnoPersonaId,
          email: emailFinal,
          password: hashedPassword,
          username: username,
          role_id: 3, // Suponiendo que 3 es el rol de Alumno
        });

        const apoderadoPersonaId = await Persona.crear(
          connection,
          apoderado_dni,
          apoderado_nombre || "",
          apoderado_ap_p || "",
          apoderado_ap_m || "",
          apoderado_fecha_nacimiento || new Date().toISOString().split("T")[0]
        );

        const apoderadoId = await Apoderado.crear(
          connection,
          apoderadoPersonaId,
          apoderado_telefono || null,
          apoderado_relacion || null
        );

        const grado = await Grado.buscarPorId(connection, id_grado);
        if (!grado) {
          throw new Error(`El grado con id ${id_grado} no existe`);
        }

        const matriculaId = await Matricula.crear(
          connection,
          alumnoId,
          id_grado,
          dni_entregado === true ||
            dni_entregado === "true" ||
            dni_entregado === 1,
          certificado_estudios === true ||
            certificado_estudios === "true" ||
            certificado_estudios === 1
        );

        const montoC1 = c1 || 0;
        const matriculaPrecio = matricula_precio || 0;

        const cuotas = {
          c1: montoC1,
          c2: c2 || montoC1,
          c3: c3 || montoC1,
          c4: c4 || montoC1,
          c5: c5 || montoC1,
          c6: c6 || montoC1,
          c7: c7 || montoC1,
          c8: c8 || montoC1,
          c9: c9 || montoC1,
          c10: c10 || montoC1,
        };

        // Determinar estados de cuotas (1 si el monto es 0)
        const estados = {
          matricula: matriculaPrecio === 0 ? 1 : 0,
          c1: cuotas.c1 === 0 ? 1 : 0,
          c2: cuotas.c2 === 0 ? 1 : 0,
          c3: cuotas.c3 === 0 ? 1 : 0,
          c4: cuotas.c4 === 0 ? 1 : 0,
          c5: cuotas.c5 === 0 ? 1 : 0,
          c6: cuotas.c6 === 0 ? 1 : 0,
          c7: cuotas.c7 === 0 ? 1 : 0,
          c8: cuotas.c8 === 0 ? 1 : 0,
          c9: cuotas.c9 === 0 ? 1 : 0,
          c10: cuotas.c10 === 0 ? 1 : 0,
        };

        await Cuota.crear(
          connection,
          matriculaId,
          matriculaPrecio,
          estados.matricula,
          cuotas.c1,
          estados.c1,
          cuotas.c2,
          estados.c2,
          cuotas.c3,
          estados.c3,
          cuotas.c4,
          estados.c4,
          cuotas.c5,
          estados.c5,
          cuotas.c6,
          estados.c6,
          cuotas.c7,
          estados.c7,
          cuotas.c8,
          estados.c8,
          cuotas.c9,
          estados.c9,
          cuotas.c10,
          estados.c10
        );

        await AlumnoApoderado.crear(connection, alumnoId, apoderadoId);

        return {
          alumno_persona_id: alumnoPersonaId,
          alumno_id: alumnoId,
          apoderado_persona_id: apoderadoPersonaId,
          apoderado_id: apoderadoId,
          matricula_id: matriculaId,
          grado_id: id_grado,
          email: emailFinal,
          username: username,
          password: plainPassword,
        };
      });

      return res.status(201).json({
        status: true,
        message: "Matrícula registrada correctamente",
        data: resultado,
      });
    } catch (error) {
      console.error("Error al registrar matrícula:", error);
      return res.status(500).json({
        status: false,
        message: "Error al registrar la matrícula",
        error: error.message,
      });
    }
  }

  static async listarGrados(req, res) {
    try {
      const grados = await Grado.listar();
      return res.status(200).json({
        status: true,
        data: grados,
      });
    } catch (error) {
      console.error("Error al listar grados:", error);
      return res.status(500).json({
        status: false,
        message: "Error al listar los grados",
        error: error.message,
      });
    }
  }

  static async verificarAlumnoPorDni(req, res) {
    try {
      const { dni } = req.params;

      if (!dni) {
        return res.status(400).json({
          status: false,
          message: "El DNI es obligatorio",
        });
      }

      const persona = await Persona.buscarPorDni(dni);

      if (!persona) {
        return res.status(404).json({
          status: false,
          message: "No se encontró ninguna persona con este DNI",
          existe: false,
        });
      }

      const alumno = await Alumno.buscarPorIdPersona(persona.id);

      if (!alumno) {
        return res.status(200).json({
          status: true,
          message: "La persona existe pero no está registrada como alumno",
          existe: false,
          data: { persona },
        });
      }

      return res.status(200).json({
        status: true,
        message: "El alumno ya está registrado",
        existe: true,
        data: { alumno, persona },
      });
    } catch (error) {
      console.error("Error al verificar alumno por DNI:", error);
      return res.status(500).json({
        status: false,
        message: "Error al verificar el alumno por DNI",
        error: error.message,
      });
    }
  }
}

module.exports = MatriculaController;
