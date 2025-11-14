// controllers/categoriesController.js
const prisma = require('../prismaClient');

/**
 * Helper: climb parents to ensure we don't create cycles when changing parent.
 * Returns true if candidateParentId is a descendant of categoryId (would create a cycle).
 */
async function isDescendant(categoryId, candidateParentId) {
  if (!candidateParentId) return false;
  let currentId = candidateParentId;
  while (currentId) {
    if (currentId === categoryId) return true;
    const row = await prisma.category.findUnique({
      where: { id: currentId },
      select: { parentId: true },
    });
    currentId = row ? row.parentId : null;
  }
  return false;
}

/**
 * CREATE single category (top-level or subcategory when parentId provided)
 * Body: { name, parentId?, meta? }
 */
async function createCategory(req, res, next) {
  try {
    const { name, parentId, meta } = req.body;
    if (!name) return res.status(400).json({ error: 'name required' });

    if (parentId) {
      const parent = await prisma.category.findUnique({ where: { id: Number(parentId) }});
      if (!parent) return res.status(400).json({ error: 'parent category not found' });
    }

    const category = await prisma.category.create({
      data: {
        name,
        parentId: parentId ? Number(parentId) : null,
        meta: meta ?? null,
      }
    });

    return res.status(201).json(category);
  } catch (err) {
    next(err);
  }
}

/**
 * BULK create subcategories for a given parent
 * Body: { parentId, names: ["a","b", ...], metaByName? }
 */
async function addSubcategories(req, res, next) {
  try {
    const { parentId, names } = req.body;
    if (!parentId) return res.status(400).json({ error: 'parentId required' });
    if (!Array.isArray(names) || names.length === 0) {
      return res.status(400).json({ error: 'names must be a non-empty array' });
    }

    const parent = await prisma.category.findUnique({ where: { id: Number(parentId) }});
    if (!parent) return res.status(400).json({ error: 'parent category not found' });

    const created = await prisma.category.createMany({
      data: names.map(n => ({ name: n, parentId: Number(parentId) })),
      skipDuplicates: true, // optional: skip duplicates
    });

    // Fetch created children to return (safer than assuming count)
    const children = await prisma.category.findMany({
      where: { parentId: Number(parentId) },
      orderBy: { name: 'asc' }
    });

    return res.status(201).json({ parent: parentId, children });
  } catch (err) {
    next(err);
  }
}

/**
 * GET single category with parent and immediate subcategories
 * Params: :id
 */
async function getCategory(req, res, next) {
  try {
    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ error: 'invalid id' });

    const category = await prisma.category.findUnique({
      where: { id },
      include: {
        parent: true,
        subcategories: { orderBy: { name: 'asc' } }
      }
    });

    if (!category) return res.status(404).json({ error: 'category not found' });
    return res.json(category);
  } catch (err) {
    next(err);
  }
}

/**
 * LIST categories
 * Query:
 *   topOnly=true   -> only parentId = null (top-level)
 *   includeAll=true -> include subcategories in each item (default true)
 */
async function listCategories(req, res, next) {
  try {
    const { topOnly, includeAll } = req.query;
    const where = topOnly === 'true' ? { parentId: null } : undefined;
    const include = includeAll === 'false' ? undefined : { subcategories: { orderBy: { name: 'asc' } } };

    const categories = await prisma.category.findMany({
      where,
      include,
      orderBy: { name: 'asc' }
    });

    return res.json(categories);
  } catch (err) {
    next(err);
  }
}

/**
 * List subcategories for a parent
 * Query / Route: /categories/:id/subcategories or ?parentId=#
 */
async function listSubcategories(req, res, next) {
  try {
    const parentId = req.params.id ? Number(req.params.id) : (req.query.parentId ? Number(req.query.parentId) : null);
    if (!parentId) return res.status(400).json({ error: 'parentId required' });

    const parent = await prisma.category.findUnique({ where: { id: parentId }});
    if (!parent) return res.status(404).json({ error: 'parent not found' });

    const subs = await prisma.category.findMany({ where: { parentId }, orderBy: { name: 'asc' } });
    return res.json(subs);
  } catch (err) {
    next(err);
  }
}

/**
 * UPDATE category (name, meta, parentId)
 * Params: :id
 * Body: { name?, meta?, parentId? }
 * - prevents setting parentId to itself or descendant (no cycles)
 */
async function updateCategory(req, res, next) {
  try {
    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ error: 'invalid id' });

    const { name, meta, parentId } = req.body;

    const existing = await prisma.category.findUnique({ where: { id }});
    if (!existing) return res.status(404).json({ error: 'category not found' });

    if (parentId !== undefined && parentId !== null) {
      const pIdNum = Number(parentId);
      if (pIdNum === id) return res.status(400).json({ error: 'cannot set parentId to itself' });

      const parentExists = await prisma.category.findUnique({ where: { id: pIdNum }});
      if (!parentExists) return res.status(400).json({ error: 'parent category not found' });

      const wouldCycle = await isDescendant(id, pIdNum);
      if (wouldCycle) return res.status(400).json({ error: 'invalid parentId: would create cycle' });
    }

    const updated = await prisma.category.update({
      where: { id },
      data: {
        name: name ?? undefined,
        meta: (meta === undefined) ? undefined : meta,
        parentId: parentId === undefined ? undefined : (parentId === null ? null : Number(parentId)),
      },
    });

    return res.json(updated);
  } catch (err) {
    next(err);
  }
}

/**
 * DELETE category
 * Params: :id
 * Query: ?force=true
 *
 * Behavior:
 *  - if category has subcategories or linked expenses -> block unless force=true
 *  - if force=true -> delete all related expenses (category & its subcategories), delete subcategories, then delete category (in a transaction)
 */
async function deleteCategory(req, res, next) {
  try {
    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ error: 'invalid id' });

    const force = req.query.force === 'true';

    // Find immediate children
    const children = await prisma.category.findMany({ where: { parentId: id }, select: { id: true }});
    const childIds = children.map(c => c.id);

    // Count expenses linked directly to this category or its subcategories
    const expensesCount = await prisma.expense.count({
      where: {
        OR: [
          { categoryId: id },
          ...(childIds.length ? [{ subcategoryId: { in: childIds } }] : [])
        ]
      }
    });

    if ((childIds.length > 0 || expensesCount > 0) && !force) {
      return res.status(400).json({
        error: 'category has subcategories or linked expenses. Use ?force=true to delete and cascade.',
        details: { subcategoriesCount: childIds.length, linkedExpenses: expensesCount }
      });
    }

    // If force, perform cascading deletion inside transaction
    if (force) {
      await prisma.$transaction(async (tx) => {
        // delete expenses linked to subcategories or this category
        await tx.expense.deleteMany({
          where: {
            OR: [
              { categoryId: id },
              ...(childIds.length ? [{ subcategoryId: { in: childIds } }] : [])
            ]
          }
        });

        // delete subcategories
        if (childIds.length) {
          await tx.category.deleteMany({ where: { id: { in: childIds } }});
        }

        // delete the category itself
        await tx.category.delete({ where: { id }});
      });

      return res.json({ message: 'category and related data deleted (force=true)' });
    }

    // If no children and no expenses, safe to delete
    await prisma.category.delete({ where: { id }});
    return res.json({ message: 'category deleted' });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  createCategory,
  addSubcategories,
  getCategory,
  listCategories,
  listSubcategories,
  updateCategory,
  deleteCategory
};
