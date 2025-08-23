const PersonaModel = require("../models/Persona");
const UserModel = require("../models/User");
const DocenteModel = require("../models/Docente");
const DocenteCursoModel = require("../models/docenteCurso");
const { withTransaction } = require("../config/database");
const bcrypt = require("bcryptjs");
const pool = require("../config/database");
const ExcelJS = require('exceljs');

const docenteController = {
  generarUsername(nombre, ap_p, fecha_nacimiento) {
    // Obtener el primer nombre
    const primerNombre = nombre.split(' ')[0].toLowerCase();
    // Obtener el primer apellido
    const primerApellido = ap_p.split(' ')[0].toLowerCase();
    // Obtener el año de nacimiento
    const año = fecha_nacimiento.split('-')[0];
    // Combinar todo
    return `${primerNombre}${primerApellido}${año}`;
  },

  generarPassword(nombre, ap_p, ap_m, dni, fecha_nacimiento) {
    // Obtener iniciales
    const nombreInicial = nombre.charAt(0).toUpperCase();
    const ap_pInicial = ap_p.charAt(0).toUpperCase();
    const ap_mInicial = ap_m.charAt(0).toUpperCase();
    // Obtener últimos 4 dígitos del DNI
    const dniFinal = dni.slice(-4);
    // Formatear la fecha
    const fecha = new Date(fecha_nacimiento);
    const dia = fecha.getDate().toString().padStart(2, "0");
    const mes = (fecha.getMonth() + 1).toString().padStart(2, "0");
    const anio = fecha.getFullYear();

    return `${nombreInicial}${ap_pInicial}${ap_mInicial}${dniFinal}${dia}${mes}${anio}`;
  },

  async registrarCompleto(pool, datos) {
    try {
      // Usamos la función withTransaction para hacer todo atomizado
      const resultado = await withTransaction(async (connection) => {
        const {
          dni,
          nombre,
          ap_p,
          ap_m,
          fecha_nacimiento,
          role_id,
          cursos_asignados,
          email,
        } = datos;

        // Generar username y password automáticamente
        const username = this.generarUsername(nombre, ap_p, fecha_nacimiento);
        const password = this.generarPassword(
          nombre,
          ap_p,
          ap_m,
          dni,
          fecha_nacimiento
        );

        // Encriptar la contraseña
        const salt = await bcrypt.genSalt(10);
        const passwordEncriptada = await bcrypt.hash(password, salt);

        // 1. Validar si la persona ya existe
        const personaExistente = await PersonaModel.buscarPorDni(
          connection,
          dni
        );
        if (personaExistente) {
          return {
            success: false,
            message: "La persona con este DNI ya existe.",
          };
        }

        // 2. Insertar en persona
        const id_persona = await PersonaModel.crear(
          connection,
          dni,
          nombre,
          ap_p,
          ap_m,
          fecha_nacimiento
        );

        // 3. Insertar en users
        await UserModel.crear(connection, {
          username,
          email,
          password: passwordEncriptada,
          role_id,
          id_persona,
        });

        // 4. Insertar en docente
        const id_docente = await DocenteModel.crear(connection, id_persona);

        // 5. Insertar cursos asignados
        for (const { idCurso, idGrado } of cursos_asignados) {
          await DocenteCursoModel.crear(
            connection,
            id_docente,
            idCurso,
            idGrado
          );
        }

        return {
          success: true,
          message: "Docente registrado con éxito.",
          credenciales: {
            username,
            password,
            email,
          },
        };
      });

      return resultado;
    } catch (error) {
      console.error("Error al registrar docente:", error);
      return {
        success: false,
        message: "Error interno.",
        error: {
          message: error.message,
          stack: error.stack,
        },
      };
    }
  },

  async obtenerDatosCompletos(pool, id_docente) {
    try {
      const connection = await pool.getConnection();
      try {
        const docente = await DocenteModel.obtenerDatosCompletos(
          connection,
          id_docente
        );

        if (!docente) {
          return {
            success: false,
            message: "Docente no encontrado.",
          };
        }

        return {
          success: true,
          data: docente,
        };
      } finally {
        connection.release();
      }
    } catch (error) {
      console.error("Error al obtener datos del docente:", error);
      return {
        success: false,
        message: "Error al obtener datos del docente.",
        error: {
          message: error.message,
          stack: error.stack,
        },
      };
    }
  },

  async listarTodosConCursos(pool, anio = null) {
    try {
      const connection = await pool.getConnection();
      try {
        const docentes = await DocenteModel.listarTodosConCursos(
          connection,
          anio
        );

        return {
          success: true,
          data: docentes,
          anio: anio || new Date().getFullYear(),
        };
      } finally {
        connection.release();
      }
    } catch (error) {
      console.error("Error al listar docentes:", error);
      return {
        success: false,
        message: "Error al listar docentes.",
        error: {
          message: error.message,
          stack: error.stack,
        },
      };
    }
  },

  async asignarCursos(pool, id_docente, cursos) {
    try {
      const connection = await pool.getConnection();
      try {
        await DocenteModel.asignarCursos(connection, id_docente, cursos);
        return {
          success: true,
          message: "Cursos asignados correctamente",
        };
      } finally {
        connection.release();
      }
    } catch (error) {
      console.error("Error al asignar cursos:", error);
      return {
        success: false,
        message: "Error al asignar cursos",
        error: {
          message: error.message,
          stack: error.stack,
        },
      };
    }
  },

  async insertarCursosPrueba(pool) {
    try {
      const connection = await pool.getConnection();
      try {
        await DocenteModel.insertarCursosPrueba(connection);
        return {
          success: true,
          message: "Cursos de prueba insertados correctamente",
        };
      } finally {
        connection.release();
      }
    } catch (error) {
      console.error("Error al insertar cursos de prueba:", error);
      return {
        success: false,
        message: "Error al insertar cursos de prueba",
        error: {
          message: error.message,
          stack: error.stack,
        },
      };
    }
  },

  async listarConCursos(pool, anio = null) {
    try {
      const connection = await pool.getConnection();
      try {
        const rows = await DocenteModel.obtenerDocentesConCursos(
          connection,
          anio
        );

        // Agrupar por docente
        const docentesMap = {};
        for (const row of rows) {
          if (!docentesMap[row.docente_id]) {
            docentesMap[row.docente_id] = {
              docente_id: row.docente_id,
              dni: row.dni,
              nombre_completo: row.nombre_completo,
              fecha_registro: row.created_at,
              cursos: [],
            };
          }

          if (row.curso && row.grado) {
            docentesMap[row.docente_id].cursos.push({
              curso: row.curso,
              grado: row.grado,
            });
          }
        }

        const docentes = Object.values(docentesMap);

        return {
          success: true,
          data: docentes,
          anio: anio || "todos",
        };
      } finally {
        connection.release();
      }
    } catch (error) {
      console.error("Error al obtener docentes con cursos:", error);
      return {
        success: false,
        message: "Error al obtener docentes con cursos",
        error: {
          message: error.message,
          stack: error.stack,
        },
      };
    }
  },

  // Obtener datos del docente por año
  getDatosDocentePorAnio: async (req, res) => {
    const connection = await pool.getConnection();
    try {
      const { anio } = req.params;
      const { docente_id } = req.query;

      if (!anio || !docente_id) {
        return res.status(400).json({
          message: "Se requiere el año y el ID del docente"
        });
      }

      // Consulta para obtener los datos del docente
      const [docente] = await connection.query(
        `SELECT 
          d.id,
          d.nombre,
          d.apellido,
          d.apellido_materno,
          d.dni,
          d.email,
          d.telefono,
          d.fecha_registro,
          d.estado
        FROM docente d
        WHERE d.id = ?`,
        [docente_id]
      );

      if (!docente || docente.length === 0) {
        return res.status(404).json({
          message: "No se encontraron datos para el docente en el año especificado"
        });
      }

      // Estructurar la respuesta
      const respuesta = {
        docente: {
          id: docente[0].id,
          nombre: docente[0].nombre,
          apellido: docente[0].apellido,
          apellido_materno: docente[0].apellido_materno,
          dni: docente[0].dni,
          email: docente[0].email,
          telefono: docente[0].telefono,
          fecha_registro: docente[0].fecha_registro,
          estado: docente[0].estado
        }
      };

      res.json(respuesta);
    } catch (error) {
      console.error("Error al obtener datos del docente:", error);
      res.status(500).json({
        message: "Error al obtener los datos del docente"
      });
    } finally {
      connection.release();
    }
  },

  // Exportar datos del docente a Excel
  exportarDatosDocenteExcel: async (req, res) => {
    const connection = await pool.getConnection();
    try {
      const { anio } = req.params;

      if (!anio) {
        return res.status(400).json({
          message: "Se requiere el año"
        });
      }

      // Obtener datos completos de todos los docentes del año
      const [docentes] = await connection.query(
        `SELECT 
          d.id,
          p.nombre,
          p.ap_p as apellido_paterno,
          p.ap_m as apellido_materno,
          p.dni,
          p.fecha_nacimiento,
          u.email,
          d.created_at as fecha_registro,
          GROUP_CONCAT(
            DISTINCT
            CONCAT(c.nombre, ' - ', g.descripcion)
            SEPARATOR ', '
          ) as cursos
        FROM docente d
        INNER JOIN persona p ON d.id_persona = p.id
        INNER JOIN users u ON u.id_persona = p.id
        LEFT JOIN docente_curso dc ON d.id = dc.id_docente
        LEFT JOIN curso c ON dc.id_curso = c.id
        LEFT JOIN grado g ON dc.id_grado = g.id
        WHERE YEAR(d.created_at) = ?
        GROUP BY d.id, p.id, u.id
        ORDER BY d.id DESC`,
        [anio]
      );

      if (!docentes || docentes.length === 0) {
        return res.status(404).json({
          message: `No se encontraron docentes para el año ${anio}`
        });
      }

      // Crear un nuevo libro de Excel
      const workbook = new ExcelJS.Workbook();
      
      // Hoja 1: Información de Docentes
      const infoDocentes = workbook.addWorksheet('Docentes');
      
      // Definir las columnas
      infoDocentes.columns = [
        { header: 'Año', key: 'anio', width: 10 },
        { header: 'ID', key: 'id', width: 10 },
        { header: 'Nombre', key: 'nombre', width: 20 },
        { header: 'Apellido Paterno', key: 'apellido_paterno', width: 20 },
        { header: 'Apellido Materno', key: 'apellido_materno', width: 20 },
        { header: 'DNI', key: 'dni', width: 15 },
        { header: 'Fecha de Nacimiento', key: 'fecha_nacimiento', width: 20 },
        { header: 'Email', key: 'email', width: 30 },
        { header: 'Fecha de Registro', key: 'fecha_registro', width: 20 },
        { header: 'Cursos', key: 'cursos', width: 40 }
      ];

      // Estilo para el encabezado
      infoDocentes.getRow(1).font = { bold: true };
      infoDocentes.getRow(1).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFD3D3D3' }
      };

      // Agregar los datos
      docentes.forEach(docente => {
        infoDocentes.addRow({
          anio: anio,
          id: docente.id,
          nombre: docente.nombre,
          apellido_paterno: docente.apellido_paterno,
          apellido_materno: docente.apellido_materno,
          dni: docente.dni,
          fecha_nacimiento: new Date(docente.fecha_nacimiento).toLocaleDateString(),
          email: docente.email,
          fecha_registro: new Date(docente.fecha_registro).toLocaleDateString(),
          cursos: docente.cursos || 'Sin cursos asignados'
        });
      });

      // Configurar respuesta
      res.setHeader(
        'Content-Type',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      );
      res.setHeader(
        'Content-Disposition',
        `attachment; filename=docentes_${anio}.xlsx`
      );

      // Enviar el archivo
      await workbook.xlsx.write(res);
      res.end();

    } catch (error) {
      console.error("Error al exportar datos de los docentes:", error);
      res.status(500).json({
        message: "Error al exportar los datos de los docentes"
      });
    } finally {
      connection.release();
    }
  },

  // Listar alumnos matriculados por docente y año, opcionalmente por grado
  async listarAlumnosMatriculados(req, res) {
    const connection = await pool.getConnection();
    try {
      const { anio } = req.params;
      // Permitir id_grado por query o params
      const id_grado = req.query.id_grado || req.params.id_grado;
      const id_persona = req.user.id_persona;
      if (!anio) {
        return res.status(400).json({
          success: false,
          message: "El año es obligatorio."
        });
      }
      // Buscar el docente por id_persona
      const docente = await DocenteModel.buscarPorIdPersona(connection, id_persona);
      if (!docente) {
        return res.status(404).json({
          success: false,
          message: "No se encontró el docente."
        });
      }
      // Buscar los grados que enseña el docente ese año
      const [grados] = await connection.query(
        `SELECT DISTINCT dc.id_grado, g.descripcion
         FROM docente_curso dc
         JOIN grado g ON g.id = dc.id_grado
         WHERE dc.id_docente = ? AND YEAR(dc.created_at) = ?`,
        [docente.id, anio]
      );
      if (!grados || grados.length === 0) {
        return res.status(200).json({
          success: true,
          data: [],
          message: "El docente no tiene grados asignados en ese año."
        });
      }
      // Si se especifica un grado, validar que el docente lo tenga asignado
      if (id_grado) {
        const gradoAsignado = grados.find(g => g.id_grado == id_grado);
        if (!gradoAsignado) {
          return res.status(403).json({
            success: false,
            message: "No tiene permiso para ver los alumnos de ese grado en ese año."
          });
        }
        // Buscar alumnos solo de ese grado
        const [alumnos] = await connection.query(
          `SELECT
            e.id AS alumno_id,
            p.dni AS alumno_dni,
            p.nombre AS alumno_nombre,
            p.ap_p AS alumno_apellido_paterno,
            p.ap_m AS alumno_apellido_materno,
            p.fecha_nacimiento,
            g.descripcion AS grado,
            m.fecha_matricula
          FROM alumno e
          JOIN persona p ON e.id_persona = p.id
          JOIN matricula m ON m.id_alumno = e.id
          JOIN grado g ON g.id = m.id_grado
          WHERE YEAR(m.fecha_matricula) = ? AND g.id = ?
          ORDER BY p.ap_p, p.ap_m, p.nombre
          `,
          [anio, id_grado]
        );
        return res.status(200).json({
          success: true,
          data: [{ grado: gradoAsignado.descripcion, id_grado, alumnos }],
          anio
        });
      }
      // Si no se especifica grado, mostrar todos como antes
      const resultado = [];
      for (const grado of grados) {
        const [alumnos] = await connection.query(
          `SELECT
            e.id AS alumno_id,
            p.dni AS alumno_dni,
            p.nombre AS alumno_nombre,
            p.ap_p AS alumno_apellido_paterno,
            p.ap_m AS alumno_apellido_materno,
            p.fecha_nacimiento,
            g.descripcion AS grado,
            m.fecha_matricula
          FROM alumno e
          JOIN persona p ON e.id_persona = p.id
          JOIN matricula m ON m.id_alumno = e.id
          JOIN grado g ON g.id = m.id_grado
          WHERE YEAR(m.fecha_matricula) = ? AND g.id = ?
          ORDER BY p.ap_p, p.ap_m, p.nombre
          `,
          [anio, grado.id_grado]
        );
        resultado.push({
          grado: grado.descripcion,
          id_grado: grado.id_grado,
          alumnos
        });
      }
      return res.status(200).json({
        success: true,
        data: resultado,
        anio
      });
    } catch (error) {
      console.error("Error al listar alumnos matriculados por docente:", error);
      return res.status(500).json({
        success: false,
        message: "Error al listar alumnos matriculados por docente.",
        error: error.message
      });
    } finally {
      connection.release();
    }
  },

  // Registrar asistencia de un alumno
  async registrarAsistencia(req, res) {
    const connection = await pool.getConnection();
    try {
      const { id_alumno, id_docente_curso, fecha, asistio = true, observacion = null } = req.body;
      const id_persona = req.user.id_persona;
      if (!id_alumno || !id_docente_curso || !fecha) {
        return res.status(400).json({
          success: false,
          message: "Faltan datos obligatorios (id_alumno, id_docente_curso, fecha)"
        });
      }
      // Validar que el docente autenticado sea dueño del docente_curso
      const docente = await DocenteModel.buscarPorIdPersona(connection, id_persona);
      if (!docente) {
        return res.status(403).json({
          success: false,
          message: "No tiene permisos para registrar asistencia."
        });
      }
      const [rows] = await connection.query(
        "SELECT * FROM docente_curso WHERE id = ? AND id_docente = ?",
        [id_docente_curso, docente.id]
      );
      if (!rows || rows.length === 0) {
        return res.status(403).json({
          success: false,
          message: "No tiene permisos sobre ese curso."
        });
      }
      // Registrar asistencia
      await connection.beginTransaction();
      await connection.query(
        "INSERT INTO asistencia (id_alumno, id_docente_curso, fecha, asistio, observacion) VALUES (?, ?, ?, ?, ?)",
        [id_alumno, id_docente_curso, fecha, asistio, observacion]
      );
      await connection.commit();
      return res.status(201).json({
        success: true,
        message: "Asistencia registrada correctamente."
      });
    } catch (error) {
      await connection.rollback();
      console.error("Error al registrar asistencia:", error);
      return res.status(500).json({
        success: false,
        message: "Error al registrar asistencia.",
        error: error.message
      });
    } finally {
      connection.release();
    }
  },

  // Exportar asistencia a Excel por fecha, curso y grado (los tres obligatorios)
  async exportarAsistenciaExcel(req, res) {
    const connection = await pool.getConnection();
    try {
      const { fecha, id_grado, id_curso } = req.query;
      const id_persona = req.user.id_persona;
      if (!fecha || !id_grado || !id_curso) {
        return res.status(400).json({
          success: false,
          message: "Debe proporcionar fecha, id_grado e id_curso."
        });
      }
      // Validar docente
      const docente = await DocenteModel.buscarPorIdPersona(connection, id_persona);
      if (!docente) {
        return res.status(403).json({
          success: false,
          message: "No tiene permisos para exportar asistencia."
        });
      }
      // Buscar el id_docente_curso correspondiente
      const [rowsCurso] = await connection.query(
        `SELECT dc.id, c.nombre AS nombre_curso, g.descripcion AS nombre_grado
         FROM docente_curso dc
         JOIN curso c ON c.id = dc.id_curso
         JOIN grado g ON g.id = dc.id_grado
         WHERE dc.id_docente = ? AND dc.id_curso = ? AND dc.id_grado = ?`,
        [docente.id, id_curso, id_grado]
      );
      if (!rowsCurso || rowsCurso.length === 0) {
        return res.status(403).json({
          success: false,
          message: "No tiene asignado ese curso y grado."
        });
      }
      const id_docente_curso = rowsCurso[0].id;
      const nombreCurso = rowsCurso[0].nombre_curso;
      const nombreGrado = rowsCurso[0].nombre_grado;
      // Obtener asistencias
      const [asistencias] = await connection.query(
        `SELECT a.*, p.dni, p.nombre, p.ap_p, p.ap_m
         FROM asistencia a
         JOIN alumno al ON al.id = a.id_alumno
         JOIN persona p ON p.id = al.id_persona
         WHERE a.id_docente_curso = ? AND a.fecha = ?
         ORDER BY p.ap_p, p.ap_m, p.nombre`,
        [id_docente_curso, fecha]
      );
      if (!asistencias || asistencias.length === 0) {
        return res.status(404).json({
          success: false,
          message: "No hay asistencias registradas para esos filtros."
        });
      }
      // Crear Excel
      const workbook = new ExcelJS.Workbook();
      const sheet = workbook.addWorksheet('Asistencia');
      sheet.columns = [
        { header: 'DNI', key: 'dni', width: 12 },
        { header: 'Nombre', key: 'nombre', width: 20 },
        { header: 'Apellido Paterno', key: 'ap_p', width: 18 },
        { header: 'Apellido Materno', key: 'ap_m', width: 18 },
        { header: 'Curso', key: 'curso', width: 20 },
        { header: 'Grado', key: 'grado', width: 12 },
        { header: 'Fecha', key: 'fecha', width: 12 },
        { header: 'Asistió', key: 'asistio', width: 10 },
        { header: 'Observación', key: 'observacion', width: 25 }
      ];
      asistencias.forEach(a => {
        sheet.addRow({
          dni: a.dni,
          nombre: a.nombre,
          ap_p: a.ap_p,
          ap_m: a.ap_m,
          curso: nombreCurso,
          grado: nombreGrado,
          fecha: a.fecha,
          asistio: a.asistio ? 'Sí' : 'No',
          observacion: a.observacion || ''
        });
      });
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      let nombreArchivo = `asistencia_${fecha}_${nombreGrado}_${nombreCurso}`;
      res.setHeader('Content-Disposition', `attachment; filename=${nombreArchivo}.xlsx`);
      await workbook.xlsx.write(res);
      res.end();
    } catch (error) {
      console.error("Error al exportar asistencia:", error);
      res.status(500).json({
        success: false,
        message: "Error al exportar asistencia.",
        error: error.message
      });
    } finally {
      connection.release();
    }
  },

  // Listar asistencias por fecha, curso y grado
  async listarAsistencias(req, res) {
    const connection = await pool.getConnection();
    try {
      const { fecha, id_grado, id_curso } = req.query;
      const id_persona = req.user.id_persona;
      if (!fecha || !id_grado || !id_curso) {
        return res.status(400).json({
          success: false,
          message: "Debe proporcionar fecha, id_grado e id_curso."
        });
      }
      // Validar docente
      const docente = await DocenteModel.buscarPorIdPersona(connection, id_persona);
      if (!docente) {
        return res.status(403).json({
          success: false,
          message: "No tiene permisos para ver asistencias."
        });
      }
      // Buscar el id_docente_curso correspondiente
      const [rowsCurso] = await connection.query(
        `SELECT dc.id
         FROM docente_curso dc
         WHERE dc.id_docente = ? AND dc.id_curso = ? AND dc.id_grado = ?`,
        [docente.id, id_curso, id_grado]
      );
      if (!rowsCurso || rowsCurso.length === 0) {
        return res.status(403).json({
          success: false,
          message: "No tiene asignado ese curso y grado."
        });
      }
      const id_docente_curso = rowsCurso[0].id;
      // Obtener asistencias
      const [asistencias] = await connection.query(
        `SELECT a.*, p.dni, p.nombre, p.ap_p, p.ap_m
         FROM asistencia a
         JOIN alumno al ON al.id = a.id_alumno
         JOIN persona p ON p.id = al.id_persona
         WHERE a.id_docente_curso = ? AND a.fecha = ?
         ORDER BY p.ap_p, p.ap_m, p.nombre`,
        [id_docente_curso, fecha]
      );
      return res.status(200).json({
        success: true,
        data: asistencias
      });
    } catch (error) {
      console.error("Error al listar asistencias:", error);
      res.status(500).json({
        success: false,
        message: "Error al listar asistencias.",
        error: error.message
      });
    } finally {
      connection.release();
    }
  },

  // Obtener los cursos y grados del docente autenticado por año
  async misCursosPorAnio(req, res) {
    const connection = await pool.getConnection();
    try {
      const { anio } = req.params;
      const id_persona = req.user.id_persona;
      if (!anio) {
        return res.status(400).json({
          success: false,
          message: "El año es obligatorio."
        });
      }
      // Buscar el docente por id_persona
      const docente = await DocenteModel.buscarPorIdPersona(connection, id_persona);
      if (!docente) {
        return res.status(404).json({
          success: false,
          message: "No se encontró el docente."
        });
      }
      // Buscar los cursos y grados asignados ese año
      const [cursos] = await connection.query(
        `SELECT dc.id AS id_docente_curso, c.id AS id_curso, c.nombre AS curso, g.id AS id_grado, g.descripcion AS grado
         FROM docente_curso dc
         JOIN curso c ON c.id = dc.id_curso
         JOIN grado g ON g.id = dc.id_grado
         WHERE dc.id_docente = ? AND YEAR(dc.created_at) = ?
         ORDER BY g.descripcion, c.nombre`,
        [docente.id, anio]
      );
      // Buscar datos personales del docente
      const [datos] = await connection.query(
        `SELECT p.dni, p.nombre, p.ap_p, p.ap_m
         FROM persona p
         WHERE p.id = ?`,
        [docente.id_persona]
      );
      return res.status(200).json({
        success: true,
        docente: {
          id_docente: docente.id,
          ...datos[0]
        },
        cursos
      });
    } catch (error) {
      console.error("Error al obtener cursos del docente autenticado:", error);
      res.status(500).json({
        success: false,
        message: "Error al obtener cursos del docente.",
        error: error.message
      });
    } finally {
      connection.release();
    }
  }
};

module.exports = docenteController;
