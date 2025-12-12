/**
 * Gacha Controller
 * Handles gacha pulls and history
 */

const BaseController = require('./BaseController');
const Gacha = require('../models/Gacha');

class GachaController extends BaseController {
  /**
   * Get all active banners
   * GET /api/gacha/banners
   */
  getBanners = this.asyncHandler(async (req, res) => {
    const banners = await Gacha.getActiveBanners();

    return this.success(
      res,
      banners,
      `Retrieved ${banners.length} active banners`
    );
  });

  /**
   * Get banner by ID
   * GET /api/gacha/banners/:id
   */
  getBannerById = this.asyncHandler(async (req, res) => {
    const { id } = req.params;

    const banner = await Gacha.getBannerById(id);

    if (!banner) {
      return this.notFound(res, 'Banner not found');
    }

    return this.success(res, banner, 'Banner retrieved successfully');
  });

  /**
   * Perform a single pull
   * POST /api/gacha/pull
   */
  singlePull = this.asyncHandler(async (req, res) => {
    const { bannerId } = req.body;
    const userId = req.user.id;

    try {
      const result = await Gacha.performSinglePull(userId, bannerId);

      return this.success(
        res,
        result,
        result.isPity ? '🎉 Pity activated! Legendary guaranteed!' : 'Character obtained!'
      );
    } catch (error) {
      if (error.message === 'Insufficient gems' || error.message === 'Insufficient gold') {
        return this.error(res, error.message, 400);
      }
      if (error.message === 'Banner not available') {
        return this.error(res, error.message, 404);
      }
      throw error;
    }
  });

  /**
   * Perform a 10x pull
   * POST /api/gacha/pull-10
   */
  multiPull = this.asyncHandler(async (req, res) => {
    const { bannerId } = req.body;
    const userId = req.user.id;

    try {
      const result = await Gacha.performMultiPull(userId, bannerId);

      const epicCount = result.characters.filter(c => c.rarity === 'Epic').length;
      const legendaryCount = result.characters.filter(c => c.rarity === 'Legendary').length;

      let message = '10x Pull completed!';
      if (legendaryCount > 0) {
        message += ` 🌟 ${legendaryCount} Legendary!`;
      }
      if (epicCount > 0) {
        message += ` ⭐ ${epicCount} Epic!`;
      }

      return this.success(res, result, message);
    } catch (error) {
      if (error.message === 'Insufficient gems' || error.message === 'Insufficient gold') {
        return this.error(res, error.message, 400);
      }
      if (error.message === 'Banner not available') {
        return this.error(res, error.message, 404);
      }
      throw error;
    }
  });

  /**
   * Get user's gacha history
   * GET /api/gacha/history
   */
  getHistory = this.asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const { page = 1, limit = 20 } = req.query;

    const offset = (page - 1) * limit;
    const history = await Gacha.getUserHistory(userId, { limit: parseInt(limit), offset });

    // Parse JSON characters_obtained field
    const parsedHistory = history.map(record => ({
      ...record,
      characters_obtained: JSON.parse(record.characters_obtained)
    }));

    return this.success(
      res,
      {
        history: parsedHistory,
        page: parseInt(page),
        limit: parseInt(limit)
      },
      'Gacha history retrieved'
    );
  });

  /**
   * Get user's pull statistics
   * GET /api/gacha/stats
   */
  getStats = this.asyncHandler(async (req, res) => {
    const userId = req.user.id;

    const stats = await Gacha.getUserPullStats(userId);

    return this.success(res, stats, 'Pull statistics retrieved');
  });
}

module.exports = new GachaController();
