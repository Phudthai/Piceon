/**
 * Auth Routes
 * /api/auth
 */

const express = require('express');
const router = express.Router();
const AuthController = require('../controllers/AuthController');
const { authenticateToken } = require('../middleware/auth');
const {
  registerValidation,
  loginValidation
} = require('../middleware/validation');

// Public routes
router.post('/register', registerValidation, AuthController.register);
router.post('/login', loginValidation, AuthController.login);

// Protected routes
router.get('/profile', authenticateToken, AuthController.getProfile);
router.get('/resources', authenticateToken, AuthController.getResources);
router.post('/logout', authenticateToken, AuthController.logout);

module.exports = router;
