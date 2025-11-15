const express = require('express');
const router = express.Router();
const {
  createInvoice,
  getAllInvoices,
  getInvoiceById,
  getOpenInvoices,
  updateInvoice,
  deleteInvoice,
  syncInvoicesFromExternal
} = require('../controllers/invoicesController');

// Placeholder auth middleware
const auth = (req, res, next) => {
  return next();
};

router.post('/', auth, createInvoice);
router.get('/', auth, getAllInvoices);
router.get('/open', auth, getOpenInvoices);
router.get('/:id', auth, getInvoiceById);
router.patch('/:id', auth, updateInvoice);
router.delete('/:id', auth, deleteInvoice);
router.post('/sync', auth,syncInvoicesFromExternal);

module.exports = router;
