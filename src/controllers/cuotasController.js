const Cuota = require('../models/Cuota');

class CuotasController {
  // Listar cuotas del alumno autenticado
  static async listarCuotasAlumno(req, res) {
    try {
      const idPersona = req.user.id_persona;
      if (!idPersona) {
        return res.status(400).json({ status: false, message: 'No se pudo identificar al usuario' });
      }
      const cuotas = await Cuota.listarPorIdPersona(idPersona);
      if (!cuotas || cuotas.length === 0) {
        return res.status(404).json({ status: false, message: 'No se encontraron cuotas para este alumno' });
      }
      return res.status(200).json({ status: true, data: cuotas });
    } catch (error) {
      console.error('Error al listar cuotas del alumno:', error);
      return res.status(500).json({ status: false, message: 'Error al listar cuotas', error: error.message });
    }
  }

  // Obtener cuotas completas por DNI y año
  static async obtenerCuotasPorDniYAnio(req, res) {
    try {
      // Verificar que el usuario sea director (role_id = 1)
      if (req.user.role_id !== 1) {
        return res.status(403).json({ 
          status: false, 
          message: 'Acceso denegado. Solo el director puede ver las cuotas de los estudiantes.' 
        });
      }

      const { dni, anio } = req.params;
      
      if (!dni || !anio) {
        return res.status(400).json({ 
          status: false, 
          message: 'El DNI y el año son obligatorios' 
        });
      }

      // Validar formato del DNI (8 dígitos)
      if (!/^\d{8}$/.test(dni)) {
        return res.status(400).json({ 
          status: false, 
          message: 'El DNI debe tener 8 dígitos' 
        });
      }

      // Validar formato del año (4 dígitos)
      if (!/^\d{4}$/.test(anio)) {
        return res.status(400).json({ 
          status: false, 
          message: 'El año debe tener 4 dígitos' 
        });
      }

      const cuotas = await Cuota.obtenerCuotasCompletasPorDniYAnio(dni, anio);
      
      if (!cuotas || cuotas.length === 0) {
        return res.status(404).json({ 
          status: false, 
          message: `No se encontraron cuotas para el DNI ${dni} en el año ${anio}` 
        });
      }

      // Formatear la respuesta para mejor legibilidad
      const cuotasFormateadas = cuotas.map(cuota => ({
        // Datos del estudiante
        estudiante: {
          dni: cuota.dni,
          nombre: cuota.nombre,
          apellido_paterno: cuota.ap_p,
          apellido_materno: cuota.ap_m,
          fecha_nacimiento: cuota.fecha_nacimiento
        },
        // Datos de la matrícula
        matricula: {
          id: cuota.id_matricula,
          fecha: cuota.fecha_matricula,
          dni_entregado: cuota.dni_entregado === 1,
          certificado_estudios: cuota.certificado_estudios === 1
        },
        // Datos del grado
        grado: {
          id: cuota.id_grado,
          descripcion: cuota.grado
        },
        // Datos de las cuotas
        cuotas: {
          id: cuota.id_cuota,
          matricula: {
            monto: cuota.matricula_precio,
            estado: cuota.matricula_estado === 1 ? 'PAGADO' : 'PENDIENTE'
          },
          cuotas_mensuales: [
            { numero: 1, monto: cuota.c1, estado: cuota.c1_estado === 1 ? 'PAGADO' : 'PENDIENTE' },
            { numero: 2, monto: cuota.c2, estado: cuota.c2_estado === 1 ? 'PAGADO' : 'PENDIENTE' },
            { numero: 3, monto: cuota.c3, estado: cuota.c3_estado === 1 ? 'PAGADO' : 'PENDIENTE' },
            { numero: 4, monto: cuota.c4, estado: cuota.c4_estado === 1 ? 'PAGADO' : 'PENDIENTE' },
            { numero: 5, monto: cuota.c5, estado: cuota.c5_estado === 1 ? 'PAGADO' : 'PENDIENTE' },
            { numero: 6, monto: cuota.c6, estado: cuota.c6_estado === 1 ? 'PAGADO' : 'PENDIENTE' },
            { numero: 7, monto: cuota.c7, estado: cuota.c7_estado === 1 ? 'PAGADO' : 'PENDIENTE' },
            { numero: 8, monto: cuota.c8, estado: cuota.c8_estado === 1 ? 'PAGADO' : 'PENDIENTE' },
            { numero: 9, monto: cuota.c9, estado: cuota.c9_estado === 1 ? 'PAGADO' : 'PENDIENTE' },
            { numero: 10, monto: cuota.c10, estado: cuota.c10_estado === 1 ? 'PAGADO' : 'PENDIENTE' }
          ]
        },
        // Resumen de pagos
        resumen: {
          total_matricula: cuota.matricula_precio,
          total_cuotas: cuota.c1 + cuota.c2 + cuota.c3 + cuota.c4 + cuota.c5 + 
                       cuota.c6 + cuota.c7 + cuota.c8 + cuota.c9 + cuota.c10,
          matricula_pagada: cuota.matricula_estado === 1,
          cuotas_pagadas: [cuota.c1_estado, cuota.c2_estado, cuota.c3_estado, cuota.c4_estado, cuota.c5_estado,
                          cuota.c6_estado, cuota.c7_estado, cuota.c8_estado, cuota.c9_estado, cuota.c10_estado]
                            .filter(estado => estado === 1).length
        },
        // Fechas de registro
        fechas: {
          creado: cuota.created_at,
          actualizado: cuota.updated_at
        }
      }));

      return res.status(200).json({ 
        status: true, 
        message: `Cuotas encontradas para el estudiante con DNI ${dni} en el año ${anio}`,
        data: cuotasFormateadas 
      });
    } catch (error) {
      console.error('Error al obtener cuotas por DNI y año:', error);
      return res.status(500).json({ 
        status: false, 
        message: 'Error al obtener las cuotas', 
        error: error.message 
      });
    }
  }

  // Marcar cuota como pagada
  static async marcarCuotaComoPagada(req, res) {
    try {
      // Verificar que el usuario sea director (role_id = 1)
      if (req.user.role_id !== 1) {
        return res.status(403).json({ 
          status: false, 
          message: 'Acceso denegado. Solo el director puede marcar cuotas como pagadas.' 
        });
      }

      const { dni_estudiante, anio, tipo_cuota, pagado } = req.body;
      
      if (!dni_estudiante || !anio || !tipo_cuota) {
        return res.status(400).json({ 
          status: false, 
          message: 'El DNI del estudiante, año y tipo de cuota son obligatorios' 
        });
      }

      // Validar formato del DNI (8 dígitos)
      if (!/^\d{8}$/.test(dni_estudiante)) {
        return res.status(400).json({ 
          status: false, 
          message: 'El DNI debe tener 8 dígitos' 
        });
      }

      // Validar formato del año (4 dígitos)
      if (!/^\d{4}$/.test(anio)) {
        return res.status(400).json({ 
          status: false, 
          message: 'El año debe tener 4 dígitos' 
        });
      }

      // Validar que el tipo de cuota sea válido
      const tiposValidos = ['matricula', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', 
                           'c1', 'c2', 'c3', 'c4', 'c5', 'c6', 'c7', 'c8', 'c9', 'c10'];
      
      if (!tiposValidos.includes(tipo_cuota.toLowerCase())) {
        return res.status(400).json({ 
          status: false, 
          message: 'Tipo de cuota no válido. Debe ser: matricula, 1-10, o c1-c10' 
        });
      }

      // El estado pagado es opcional, por defecto true (marcar como pagada)
      const nuevoEstado = pagado !== undefined ? pagado : true;

      // Primero obtener las cuotas del estudiante para verificar que existe
      const cuotasEstudiante = await Cuota.obtenerCuotasCompletasPorDniYAnio(dni_estudiante, anio);
      
      if (!cuotasEstudiante || cuotasEstudiante.length === 0) {
        return res.status(404).json({ 
          status: false, 
          message: `No se encontraron cuotas para el estudiante con DNI ${dni_estudiante} en el año ${anio}` 
        });
      }

      // Tomar la primera cuota (la más reciente)
      const cuotaAActualizar = cuotasEstudiante[0];
      const idCuota = cuotaAActualizar.id_cuota;

      // Actualizar el estado de la cuota
      await Cuota.actualizarEstadoCuota(idCuota, tipo_cuota, nuevoEstado);

      // Obtener la cuota actualizada para mostrar en la respuesta
      const cuotaActualizada = await Cuota.obtenerCuotaPorId(idCuota);
      
      if (!cuotaActualizada) {
        return res.status(404).json({ 
          status: false, 
          message: 'No se pudo obtener la información de la cuota actualizada' 
        });
      }

      // Formatear la respuesta con información clara del estudiante
      const respuesta = {
        estudiante: {
          dni: cuotaActualizada.dni,
          nombre: cuotaActualizada.nombre,
          apellido_paterno: cuotaActualizada.ap_p,
          apellido_materno: cuotaActualizada.ap_m,
          nombre_completo: `${cuotaActualizada.nombre} ${cuotaActualizada.ap_p} ${cuotaActualizada.ap_m}`
        },
        grado: cuotaActualizada.grado,
        fecha_matricula: cuotaActualizada.fecha_matricula,
        cuota_actualizada: {
          id: cuotaActualizada.id,
          tipo: tipo_cuota,
          estado: nuevoEstado ? 'PAGADO' : 'PENDIENTE',
          accion: nuevoEstado ? 'MARCADA COMO PAGADA' : 'MARCADA COMO PENDIENTE'
        },
        estados_actuales: {
          matricula: {
            estado: cuotaActualizada.matricula_estado === 1 ? 'PAGADO' : 'PENDIENTE',
            monto: cuotaActualizada.matricula_precio
          },
          c1: {
            estado: cuotaActualizada.c1_estado === 1 ? 'PAGADO' : 'PENDIENTE',
            monto: cuotaActualizada.c1
          },
          c2: {
            estado: cuotaActualizada.c2_estado === 1 ? 'PAGADO' : 'PENDIENTE',
            monto: cuotaActualizada.c2
          },
          c3: {
            estado: cuotaActualizada.c3_estado === 1 ? 'PAGADO' : 'PENDIENTE',
            monto: cuotaActualizada.c3
          },
          c4: {
            estado: cuotaActualizada.c4_estado === 1 ? 'PAGADO' : 'PENDIENTE',
            monto: cuotaActualizada.c4
          },
          c5: {
            estado: cuotaActualizada.c5_estado === 1 ? 'PAGADO' : 'PENDIENTE',
            monto: cuotaActualizada.c5
          },
          c6: {
            estado: cuotaActualizada.c6_estado === 1 ? 'PAGADO' : 'PENDIENTE',
            monto: cuotaActualizada.c6
          },
          c7: {
            estado: cuotaActualizada.c7_estado === 1 ? 'PAGADO' : 'PENDIENTE',
            monto: cuotaActualizada.c7
          },
          c8: {
            estado: cuotaActualizada.c8_estado === 1 ? 'PAGADO' : 'PENDIENTE',
            monto: cuotaActualizada.c8
          },
          c9: {
            estado: cuotaActualizada.c9_estado === 1 ? 'PAGADO' : 'PENDIENTE',
            monto: cuotaActualizada.c9
          },
          c10: {
            estado: cuotaActualizada.c10_estado === 1 ? 'PAGADO' : 'PENDIENTE',
            monto: cuotaActualizada.c10
          }
        },
        resumen: {
          total_matricula: cuotaActualizada.matricula_precio,
          total_cuotas: cuotaActualizada.c1 + cuotaActualizada.c2 + cuotaActualizada.c3 + 
                       cuotaActualizada.c4 + cuotaActualizada.c5 + cuotaActualizada.c6 + 
                       cuotaActualizada.c7 + cuotaActualizada.c8 + cuotaActualizada.c9 + cuotaActualizada.c10,
          matricula_pagada: cuotaActualizada.matricula_estado === 1,
          cuotas_pagadas: [cuotaActualizada.c1_estado, cuotaActualizada.c2_estado, cuotaActualizada.c3_estado, 
                          cuotaActualizada.c4_estado, cuotaActualizada.c5_estado, cuotaActualizada.c6_estado,
                          cuotaActualizada.c7_estado, cuotaActualizada.c8_estado, cuotaActualizada.c9_estado, 
                          cuotaActualizada.c10_estado].filter(estado => estado === 1).length
        }
      };

      return res.status(200).json({ 
        status: true, 
        message: `Cuota ${tipo_cuota} de ${cuotaActualizada.nombre} ${cuotaActualizada.ap_p} (DNI: ${dni_estudiante}) marcada como ${nuevoEstado ? 'PAGADA' : 'PENDIENTE'} exitosamente`,
        data: respuesta 
      });
    } catch (error) {
      console.error('Error al marcar cuota como pagada:', error);
      return res.status(500).json({ 
        status: false, 
        message: 'Error al actualizar el estado de la cuota', 
        error: error.message 
      });
    }
  }
}

module.exports = CuotasController; 