const jwt = require('jsonwebtoken');

const verifyToken = (req, res, next) => {
    const token = req.headers['authorization']?.split(' ')[1];
    console.log('TOKEN:', token);
    console.log('JWT_SECRET:', process.env.JWT_SECRET);

    if (!token) {
        return res.status(403).json({ message: 'Token no proporcionado' });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded;
        next();
    } catch (error) {
        console.error('JWT ERROR:', error);
        return res.status(401).json({ message: 'Token inválido' });
    }
};

const checkChangePasswordRequired = async (req, res, next) => {
    if (req.user.change_password_required) {
        return res.status(403).json({ 
            message: 'Se requiere cambio de contraseña',
            requirePasswordChange: true
        });
    }
    next();
};

const isDirector = (req, res, next) => {
    // Verificar que el usuario tenga rol de director (asumiendo que role_id 1 es director)
    if (req.user.role_id !== 1) {
        return res.status(403).json({ 
            message: 'Acceso denegado. Solo los directores pueden realizar esta acción.',
            success: false
        });
    }
    next();
};

module.exports = {
    verifyToken,
    checkChangePasswordRequired,
    isDirector
}; 