const express = require('express');
const router = express.Router();
const { 
  totalBalance, 
  userExpenses,
  categorySummary,
  timeSeries,
  dashboardReport
} = require('../controllers/reportsController');

// Placeholder auth middleware
const auth = (req, res, next) => {
  return next();
};

router.get('/balance', auth, totalBalance);
router.get('/user-expenses', auth, userExpenses);
router.get('/category-summary', auth, categorySummary);
router.get('/time-series', auth, timeSeries);
router.get('/dashboard', auth, dashboardReport);

module.exports = router;
