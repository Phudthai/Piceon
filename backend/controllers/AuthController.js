/**
 * Auth Controller
 * Handles user registration, login, and profile
 */

const BaseController = require('./BaseController');
const User = require('../models/User');
const { generateToken } = require('../middleware/auth');

class AuthController extends BaseController {
  /**
   * Register a new user
   * POST /api/auth/register
   */
  register = this.asyncHandler(async (req, res) => {
    const { username, email, password } = req.body;

    // Check if email already exists
    const existingEmail = await User.findByEmail(email);
    if (existingEmail) {
      return this.error(res, 'Email already in use', 400);
    }

    // Check if username already exists
    const existingUsername = await User.findByUsername(username);
    if (existingUsername) {
      return this.error(res, 'Username already taken', 400);
    }

    // Create user
    const user = await User.createUser({ username, email, password });

    // Generate JWT token
    const token = generateToken({ userId: user.id });

    // Set token in httpOnly cookie
    res.cookie('picoen-access-token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    });

    return this.success(
      res,
      {
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          gems: user.gems,
          gold: user.gold
        },
        token
      },
      'User registered successfully',
      201
    );
  });

  /**
   * Login user
   * POST /api/auth/login
   */
  login = this.asyncHandler(async (req, res) => {
    const { email, password } = req.body;

    // Find user by email
    const user = await User.findByEmail(email);
    if (!user) {
      return this.error(res, 'Invalid email or password', 401);
    }

    // Verify password
    const isPasswordValid = await User.verifyPassword(password, user.password);
    if (!isPasswordValid) {
      return this.error(res, 'Invalid email or password', 401);
    }

    // Generate JWT token
    const token = generateToken({ userId: user.id });

    // Set token in httpOnly cookie
    res.cookie('picoen-access-token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    });

    // Get user profile without password
    const profile = await User.getProfile(user.id);

    return this.success(
      res,
      {
        user: profile,
        token
      },
      'Login successful'
    );
  });

  /**
   * Get current user profile
   * GET /api/auth/profile
   */
  getProfile = this.asyncHandler(async (req, res) => {
    const userId = req.user.id;

    // Get user with stats
    const user = await User.getUserWithStats(userId);

    if (!user) {
      return this.notFound(res, 'User not found');
    }

    return this.success(res, user, 'Profile retrieved successfully');
  });

  /**
   * Get user resources
   * GET /api/auth/resources
   */
  getResources = this.asyncHandler(async (req, res) => {
    const userId = req.user.id;

    const user = await User.findById(userId);

    if (!user) {
      return this.notFound(res, 'User not found');
    }

    return this.success(
      res,
      {
        gems: user.gems,
        gold: user.gold,
        inventory_slots: user.inventory_slots,
        pity_counter: user.pity_counter
      },
      'Resources retrieved successfully'
    );
  });

  /**
   * Logout user
   * POST /api/auth/logout
   */
  logout = this.asyncHandler(async (req, res) => {
    // Clear token cookie
    res.clearCookie('picoen-access-token');

    return this.success(res, null, 'Logout successful');
  });
}

module.exports = new AuthController();
