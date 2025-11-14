// routes/categories.js
const express = require('express');
const router = express.Router();

const {
  createCategory,
  addSubcategories,
  getCategory,
  listCategories,
  listSubcategories,
  updateCategory,
  deleteCategory
} = require('../controllers/categoriesController');

// Placeholder auth middleware — replace with your real auth/roles middleware
const auth = (req, res, next) => {
  // e.g. if (!req.user) return res.status(401).send('Unauthorized')
  return next();
};

/**
 * Routes:
 *
 * POST   /api/categories                -> createCategory
 * POST   /api/categories/bulk-subcats   -> addSubcategories
 * GET    /api/categories                -> listCategories (query: topOnly=true, includeAll=false)
 * GET    /api/categories/top            -> list top-level categories (shortcut)
 * GET    /api/categories/:id            -> getCategory
 * GET    /api/categories/:id/subcats    -> listSubcategories for parent
 * PATCH  /api/categories/:id            -> updateCategory
 * DELETE /api/categories/:id            -> deleteCategory (query: force=true)
 */

// Create single category (top-level or child via parentId)
router.post('/', auth, createCategory);

// Bulk add subcategories to a parent
router.post('/bulk-subcats', auth, addSubcategories);

// List categories; query params:
//   topOnly=true -> only top-level
//   includeAll=false -> exclude subcategories in response
router.get('/', auth, listCategories);

// Shortcut to list only top-level categories
router.get('/top', auth, (req, res, next) => {
  // reuse listCategories by setting query
  req.query.topOnly = 'true';
  req.query.includeAll = req.query.includeAll ?? 'true';
  return listCategories(req, res, next);
});

// Get single category with parent & immediate subcategories
router.get('/:id', auth, getCategory);

// List subcategories of a category
router.get('/:id/subcats', auth, listSubcategories);

// Update category
router.patch('/:id', auth, updateCategory);

// Delete category. To force delete cascades linked expenses and subcategories:
// DELETE /api/categories/:id?force=true
router.delete('/:id', auth, deleteCategory);

module.exports = router;
