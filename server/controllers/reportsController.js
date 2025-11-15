// controllers/reportsController.js
const prisma = require('../prismaClient');
const { Decimal } = require('@prisma/client/runtime/library');
const dayjs = require('dayjs'); // Add this

// GET /api/reports/balance - Comprehensive balance report
async function totalBalance(req, res, next) {
  try {
    const { from, to, userId, categoryId } = req.query;

    const where = {};
    
    // Date filter
    if (from || to) {
      where.date = {};
      if (from) where.date.gte = new Date(from);
      if (to) where.date.lte = new Date(to);
    }

    // User filter
    if (userId) where.createdById = Number(userId);
    
    // Category filter
    if (categoryId) where.categoryId = Number(categoryId);

    // Aggregate credits and debits
    const [creditsResult, debitsResult, totalTransactions] = await Promise.all([
      prisma.transaction.aggregate({
        where: { ...where, type: 'CREDIT' },
        _sum: { amount: true },
        _count: true
      }),
      prisma.transaction.aggregate({
        where: { ...where, type: 'DEBIT' },
        _sum: { amount: true },
        _count: true
      }),
      prisma.transaction.count({ where })
    ]);

    const totalCredits = parseFloat(Number(creditsResult._sum.amount || 0).toFixed(2));
    const totalDebits = parseFloat(Number(debitsResult._sum.amount || 0).toFixed(2));
    const balance = parseFloat((totalCredits - totalDebits).toFixed(2));
    const creditCount = creditsResult._count || 0;
    const debitCount = debitsResult._count || 0;

    // Calculate average transaction amounts
    const avgCredit = parseFloat((creditCount > 0 ? totalCredits / creditCount : 0).toFixed(2));
    const avgDebit = parseFloat((debitCount > 0 ? totalDebits / debitCount : 0).toFixed(2));

    res.json({
      totalCredits,
      totalDebits,
      balance,
      creditCount,
      debitCount,
      totalTransactions,
      avgCredit,
      avgDebit,
      filters: { from, to, userId, categoryId }
    });
  } catch (err) {
    next(err);
  }
}

// GET /api/reports/user-expenses - User-wise expense breakdown
async function userExpenses(req, res, next) {
  try {
    const { from, to } = req.query;

    const where = {};
    if (from || to) {
      where.date = {};
      if (from) where.date.gte = new Date(from);
      if (to) where.date.lte = new Date(to);
    }

    const result = await prisma.transaction.groupBy({
      by: ['createdById', 'type'],
      where,
      _sum: { amount: true },
      _count: true
    });

    // Get user details
    const userIds = [...new Set(result.map(r => r.createdById))];
    const users = await prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, name: true, email: true }
    });

    const userMap = {};
    users.forEach(u => userMap[u.id] = u);

    const out = {};
    for (const r of result) {
      const uid = r.createdById;
      if (!out[uid]) {
        out[uid] = {
          userId: uid,
          userName: userMap[uid]?.name || 'Unknown',
          userEmail: userMap[uid]?.email || null,
          totalCredit: 0,
          totalDebit: 0,
          creditCount: 0,
          debitCount: 0,
          balance: 0
        };
      }
      if (r.type === 'CREDIT') {
        out[uid].totalCredit = Number(r._sum.amount || 0);
        out[uid].creditCount = r._count || 0;
      }
      if (r.type === 'DEBIT') {
        out[uid].totalDebit = Number(r._sum.amount || 0);
        out[uid].debitCount = r._count || 0;
      }
      out[uid].balance = out[uid].totalCredit - out[uid].totalDebit;
    }

    res.json(Object.values(out));
  } catch (err) {
    next(err);
  }
}

// GET /api/reports/category-summary - Category-wise breakdown
async function categorySummary(req, res, next) {
  try {
    const { from, to } = req.query;

    const where = {};
    if (from || to) {
      where.date = {};
      if (from) where.date.gte = new Date(from);
      if (to) where.date.lte = new Date(to);
    }

    const result = await prisma.transaction.groupBy({
      by: ['categoryId', 'type'],
      where,
      _sum: { amount: true },
      _count: true
    });

    // Get category details
    const categoryIds = [...new Set(result.map(r => r.categoryId))];
    const categories = await prisma.category.findMany({
      where: { id: { in: categoryIds } },
      select: { id: true, name: true, parentId: true }
    });

    const categoryMap = {};
    categories.forEach(c => categoryMap[c.id] = c);

    const out = {};
    for (const r of result) {
      const cid = r.categoryId;
      if (!out[cid]) {
        out[cid] = {
          categoryId: cid,
          categoryName: categoryMap[cid]?.name || 'Uncategorized',
          parentId: categoryMap[cid]?.parentId || null,
          totalCredit: 0,
          totalDebit: 0,
          creditCount: 0,
          debitCount: 0,
          netAmount: 0
        };
      }
      if (r.type === 'CREDIT') {
        out[cid].totalCredit = Number(r._sum.amount || 0);
        out[cid].creditCount = r._count || 0;
      }
      if (r.type === 'DEBIT') {
        out[cid].totalDebit = Number(r._sum.amount || 0);
        out[cid].debitCount = r._count || 0;
      }
      out[cid].netAmount = out[cid].totalCredit - out[cid].totalDebit;
    }

    res.json(Object.values(out));
  } catch (err) {
    next(err);
  }
}

// GET /api/reports/time-series - Daily/Monthly time series data
async function timeSeries(req, res, next) {
  try {
    const { from, to, period = 'day' } = req.query; // period: 'day' or 'month'

    const where = {};
    if (from || to) {
      where.date = {};
      if (from) where.date.gte = new Date(from);
      if (to) where.date.lte = new Date(to);
    }

    const transactions = await prisma.transaction.findMany({
      where,
      select: {
        date: true,
        type: true,
        amount: true
      },
      orderBy: { date: 'asc' }
    });

    const grouped = {};
    
    transactions.forEach(tx => {
      let key;
      if (period === 'month') {
        key = dayjs(tx.date).format('YYYY-MM');
      } else {
        key = dayjs(tx.date).format('YYYY-MM-DD');
      }

      if (!grouped[key]) {
        grouped[key] = { date: key, credits: 0, debits: 0, net: 0 };
      }

      const amount = Number(tx.amount);
      if (tx.type === 'CREDIT') {
        grouped[key].credits += amount;
      } else {
        grouped[key].debits += amount;
      }
      grouped[key].net = grouped[key].credits - grouped[key].debits;
    });

    const result = Object.values(grouped).sort((a, b) => a.date.localeCompare(b.date));

    res.json(result);
  } catch (err) {
    next(err);
  }
}

// GET /api/reports/dashboard - Comprehensive dashboard data
async function dashboardReport(req, res, next) {
  try {
    const { from, to, userId } = req.query;

    const where = {};
    if (from || to) {
      where.date = {};
      if (from) where.date.gte = new Date(from);
      if (to) where.date.lte = new Date(to);
    }
    if (userId) where.createdById = Number(userId);

    // Get all transactions with related data
    const transactions = await prisma.transaction.findMany({
      where,
      include: {
        category: true,
        subcategory: true,
        createdBy: {
          select: { id: true, name: true, email: true }
        },
        invoice: {
          select: { id: true, invoiceNumber: true }
        }
      },
      orderBy: { date: 'desc' },
      take: 1000 // Limit for performance
    });

    // Calculate aggregates with 2 decimal precision
    const totalCredits = parseFloat(
      transactions
        .filter(t => t.type === 'CREDIT')
        .reduce((sum, t) => sum + Number(t.amount), 0)
        .toFixed(2)
    );
    
    const totalDebits = parseFloat(
      transactions
        .filter(t => t.type === 'DEBIT')
        .reduce((sum, t) => sum + Number(t.amount), 0)
        .toFixed(2)
    );

    const balance = parseFloat((totalCredits - totalDebits).toFixed(2));

    // Time series (daily)
    const dailySeries = {};
    transactions.forEach(t => {
      const key = dayjs(t.date).format('YYYY-MM-DD');
      if (!dailySeries[key]) {
        dailySeries[key] = { date: key, net: 0 };
      }
      const amount = parseFloat(Number(t.amount).toFixed(2));
      dailySeries[key].net = parseFloat((dailySeries[key].net + (t.type === 'CREDIT' ? amount : -amount)).toFixed(2));
    });

    // Monthly breakdown with 2 decimals
    const monthlyData = {};
    transactions.forEach(t => {
      const key = dayjs(t.date).format('YYYY-MM');
      if (!monthlyData[key]) {
        monthlyData[key] = { month: key, credits: 0, debits: 0 };
      }
      const amount = parseFloat(Number(t.amount).toFixed(2));
      if (t.type === 'CREDIT') {
        monthlyData[key].credits = parseFloat((monthlyData[key].credits + amount).toFixed(2));
      } else {
        monthlyData[key].debits = parseFloat((monthlyData[key].debits + amount).toFixed(2));
      }
    });

    // Category breakdown with 2 decimals
    const categoryData = {};
    transactions.forEach(t => {
      const catName = t.category?.name || 'Uncategorized';
      if (!categoryData[catName]) {
        categoryData[catName] = 0;
      }
      const amount = parseFloat(Number(t.amount).toFixed(2));
      categoryData[catName] = parseFloat((categoryData[catName] + amount).toFixed(2));
    });

    res.json({
      summary: {
        totalCredits,
        totalDebits,
        balance,
        transactionCount: transactions.length,
        creditCount: transactions.filter(t => t.type === 'CREDIT').length,
        debitCount: transactions.filter(t => t.type === 'DEBIT').length
      },
      transactions: transactions.slice(0, 100), // Return latest 100 for UI
      timeSeries: Object.values(dailySeries).sort((a, b) => a.date.localeCompare(b.date)),
      monthlyBreakdown: Object.values(monthlyData).sort((a, b) => a.month.localeCompare(b.month)),
      categoryBreakdown: Object.entries(categoryData).map(([name, value]) => ({ 
        name, 
        value: parseFloat(value.toFixed(2)) 
      }))
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  totalBalance,
  userExpenses,
  categorySummary,
  timeSeries,
  dashboardReport
};
