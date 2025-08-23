const db = require('../config/database');

class PeriodoPagoas {
    static async findByAnio(anio) {
        try {
            const [rows] = await db.pool.query(
                'SELECT costo_matricula, costo_cuotas FROM periodos_cuotas WHERE anio = ?',
                [anio]
            );
            return rows[0];
        } catch (error) {
            throw error;
        }
    }

    static async create(periodoData) {
        try {
            const { anio, costo_matricula, costo_cuotas } = periodoData;
            const [result] = await db.pool.query(
                'INSERT INTO periodos_cuotas (anio, costo_matricula, costo_cuotas) VALUES (?, ?, ?)',
                [anio, costo_matricula, costo_cuotas]
            );
            return result.insertId;
        } catch (error) {
            throw error;
        }
    }

    static async getAll() {
        try {
            const [rows] = await db.pool.query('SELECT * FROM periodos_cuotas');
            return rows;
        } catch (error) {
            throw error;
        }
    }
}

module.exports = PeriodoPagoas;
