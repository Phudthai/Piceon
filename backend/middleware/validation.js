/**
 * Validation Middleware
 * Express-validator middleware for input validation
 */

const { body, validationResult } = require('express-validator');

/**
 * Validation result handler
 * Checks for validation errors and returns 400 if any exist
 */
const validate = (req, res, next) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array().map(err => ({
        field: err.path || err.param,
        message: err.msg
      }))
    });
  }

  next();
};

/**
 * Registration validation rules
 */
const registerValidation = [
  body('username')
    .trim()
    .isLength({ min: 3, max: 50 })
    .withMessage('Username must be between 3 and 50 characters')
    .matches(/^[a-zA-Z0-9_]+$/)
    .withMessage('Username can only contain letters, numbers, and underscores'),

  body('email')
    .trim()
    .isEmail()
    .withMessage('Must be a valid email address')
    .normalizeEmail(),

  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters long')
    .matches(/\d/)
    .withMessage('Password must contain at least one number'),

  validate
];

/**
 * Login validation rules
 */
const loginValidation = [
  body('email')
    .trim()
    .isEmail()
    .withMessage('Must be a valid email address')
    .normalizeEmail(),

  body('password')
    .notEmpty()
    .withMessage('Password is required'),

  validate
];

/**
 * Gacha pull validation
 */
const gachaPullValidation = [
  body('bannerId')
    .isInt({ min: 1 })
    .withMessage('Valid banner ID is required'),

  validate
];

/**
 * Character lock validation
 */
const characterLockValidation = [
  body('locked')
    .isBoolean()
    .withMessage('Locked must be a boolean value'),

  validate
];

/**
 * Character favorite validation
 */
const characterFavoriteValidation = [
  body('favorite')
    .isBoolean()
    .withMessage('Favorite must be a boolean value'),

  validate
];

module.exports = {
  validate,
  registerValidation,
  loginValidation,
  gachaPullValidation,
  characterLockValidation,
  characterFavoriteValidation
};
