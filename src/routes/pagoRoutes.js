const express = require('express');
const router = express.Router();
const { generarPagoCuota, webhookMercadoPago } = require('../controllers/pagoController');
const { verifyToken } = require('../middleware/auth');

router.post('/mercadopago/cuota', verifyToken, generarPagoCuota);

// Webhook de Mercado Pago (no requiere autenticación)
router.post('/mercadopago/webhook', webhookMercadoPago);

module.exports = router; 