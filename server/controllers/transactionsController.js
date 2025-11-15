// controllers/transactionsController.js
const prisma = require('../prismaClient');
const { Decimal } = require('@prisma/client/runtime/library');


// async function createTransaction(req, res, next) {
//   try {
//     const {
//       createdById,
//       type,
//       amount,
//       categoryId,
//       subcategoryId,
//       note,
//       employee,
//       reference,
//       date,
//       extraDetails,
//       invoiceId,
//       reconciliationNote
//     } = req.body;
//        console.log(  createdById,
//       type,
//       amount,
//       categoryId,
//       subcategoryId,
//       note,
//       employee,
//       reference,
//       date,
//       extraDetails,
//       invoiceId,
//       reconciliationNote)

//     if (!createdById || !type || !amount || !categoryId) {
//       return res.status(400).json({ error: 'createdById, type, amount, categoryId are required' });
//     }
//     console.log("2")
//     if (!['credit', 'debit'].includes(type)) {
//       return res.status(400).json({ error: 'type must be credit or debit' });
//     }
//      console.log("3")
//     // Validate user
//     const user = await prisma.user.findUnique({ where: { id: Number(createdById) }});
//     if (!user) return res.status(400).json({ error: 'createdBy user not found' });
//       console.log("4")
//     // Validate category (primary)
//     const category = await prisma.category.findUnique({ where: { id: Number(categoryId) }});
//     if (!category) return res.status(400).json({ error: 'category not found' });
//    console.log("5")
//     // If subcategory provided, validate it and ensure it is child of categoryId
//     if (subcategoryId) {
//       const sub = await prisma.category.findUnique({ where: { id: Number(subcategoryId) }});
//       if (!sub) return res.status(400).json({ error: 'subcategory not found' });
//       // ensure sub.parentId equals categoryId (enforce hierarchy)
//       if (sub.parentId !== Number(categoryId)) {
//         return res.status(400).json({ error: 'subcategory is not a child of the provided category' });
//       }
//     }

//     // Validate invoice if provided
//     if (invoiceId) {
//       const invoice = await prisma.invoice.findUnique({ where: { id: Number(invoiceId) }});
//       if (!invoice) return res.status(400).json({ error: 'invoice not found' });
//     }

//     const tx = await prisma.transaction.create({
//       data: {
//         createdById: Number(createdById),
//         type,
//         amount: amount.toString(),
//         categoryId: Number(categoryId),
//         subcategoryId: subcategoryId ? Number(subcategoryId) : null,
//         note,
//         employee,
//         reference,
//         extraDetails: extraDetails || null,
//         date: date ? new Date(date) : undefined,
//         invoiceId: invoiceId ? Number(invoiceId) : null,
//         reconciliationNote: reconciliationNote || null
//       },
//       include: {
//         category: true,
//         subcategory: true,
//         createdBy: true,
//         invoice: true
//       }
//     });

//     res.json(tx);
//   } catch (err) {
//     console.log(err,"error from createTransaction")
//     next(err);
//   }
// }

async function createTransaction(req, res, next) {
  try {
    const {
      createdById,
      type,
      amount,
      categoryId,
      subcategoryId,
      note,
      employee,
      reference,
      date,
      extraDetails,
      invoiceId,
      reconciliationNote
    } = req.body;
 

    if (!createdById || !type || !amount || !categoryId) {
      return res.status(400).json({ error: 'createdById, type, amount, categoryId are required' });
    }
//     console.log("2")

    // --- THIS IS THE FIX ---
    // Check for UPPERCASE to match your Prisma Enum
    if (!['CREDIT', 'DEBIT'].includes(type)) {
      return res.status(400).json({ error: 'type must be CREDIT or DEBIT' });
    }
    // --- END OF FIX ---

//      console.log("3")
    // Validate user
    const user = await prisma.user.findUnique({ where: { id: Number(createdById) }});
    if (!user) return res.status(400).json({ error: 'createdBy user not found' });
//       console.log("4")
    // Validate category (primary)
    const category = await prisma.category.findUnique({ where: { id: Number(categoryId) }});
    if (!category) return res.status(400).json({ error: 'category not found' });
//    console.log("5")
    // If subcategory provided, validate it and ensure it is child of categoryId
    if (subcategoryId) {
      const sub = await prisma.category.findUnique({ where: { id: Number(subcategoryId) }});
      if (!sub) return res.status(400).json({ error: 'subcategory not found' });
      // ensure sub.parentId equals categoryId (enforce hierarchy)
      if (sub.parentId !== Number(categoryId)) {
        return res.status(400).json({ error: 'subcategory is not a child of the provided category' });
      }
    }

    // Validate invoice if provided
    if (invoiceId) {
      const invoice = await prisma.invoice.findUnique({ where: { id: Number(invoiceId) }});
      if (!invoice) return res.status(400).json({ error: 'invoice not found' });
    }

    const tx = await prisma.transaction.create({
      data: {
        createdById: Number(createdById),
        type, // This will correctly be "CREDIT" or "DEBIT"
        amount: amount.toString(),
        categoryId: Number(categoryId),
        subcategoryId: subcategoryId ? Number(subcategoryId) : null,
        note,
        employee,
        reference,
        extraDetails: extraDetails || null,
        date: date ? new Date(date) : undefined,
        invoiceId: invoiceId ? Number(invoiceId) : null,
        reconciliationNote: reconciliationNote || null
      },
      include: {
        category: true,
        subcategory: true,
        createdBy: true,
        invoice: true
      }
    });

    res.json(tx);
  } catch (err) {
    console.log(err,"error from createTransaction")
    next(err);
  }
}

async function getTransactions(req, res, next) {
  try {
    const {
      userId, from, to, type, categoryId, subcategoryId, search, limit = 50, skip = 0, invoiceId,
      sortBy = 'date', sortOrder = 'desc'
    } = req.query;

    const where = {};
    if (userId) where.createdById = Number(userId);
    if (type) where.type = type;
    if (categoryId) where.categoryId = Number(categoryId);
    if (subcategoryId) where.subcategoryId = Number(subcategoryId);
    if (invoiceId) where.invoiceId = Number(invoiceId);
    if (from || to) where.date = {};
    if (from) where.date.gte = new Date(from);
    if (to) where.date.lte = new Date(to);
    
    // Enhanced search - includes user name search
    if (search) {
      where.OR = [
        { note: { contains: search, mode: 'insensitive' } },
        { employee: { contains: search, mode: 'insensitive' } },
        { reference: { contains: search, mode: 'insensitive' } },
        { reconciliationNote: { contains: search, mode: 'insensitive' } },
        { createdBy: { name: { contains: search, mode: 'insensitive' } } },
        { category: { name: { contains: search, mode: 'insensitive' } } },
        { subcategory: { name: { contains: search, mode: 'insensitive' } } }
      ];
    }

    // Sorting
    const orderBy = {};
    if (sortBy === 'amount') {
      orderBy.amount = sortOrder === 'asc' ? 'asc' : 'desc';
    } else if (sortBy === 'type') {
      orderBy.type = sortOrder === 'asc' ? 'asc' : 'desc';
    } else {
      orderBy.date = sortOrder === 'asc' ? 'asc' : 'desc';
    }

    const [transactions, total] = await Promise.all([
      prisma.transaction.findMany({
        where,
        orderBy,
        take: Number(limit),
        skip: Number(skip),
        include: {
          category: true,
          subcategory: true,
          createdBy: true,
          invoice: true
        }
      }),
      prisma.transaction.count({ where })
    ]);

    res.json({ total, transactions });
  } catch (err) {
    next(err);
  }
}

async function getTransactionById(req, res, next) {
  try {
    const { id } = req.params;
    const tx = await prisma.transaction.findUnique({
      where: { id: Number(id) },
      include: {
        category: true,
        subcategory: true,
        createdBy: true,
        invoice: true
      }
    });
    if (!tx) return res.status(404).json({ error: 'Transaction not found' });
    res.json(tx);
  } catch (err) {
    next(err);
  }
}

async function updateTransaction(req, res, next) {
  try {
    const { id } = req.params;
    const data = { ...req.body };
    if (data.amount) data.amount = data.amount.toString();

    // If updating category/subcategory, validate
    if (data.categoryId) {
      const category = await prisma.category.findUnique({ where: { id: Number(data.categoryId) }});
      if (!category) return res.status(400).json({ error: 'category not found' });
    }
    if (data.subcategoryId) {
      const sub = await prisma.category.findUnique({ where: { id: Number(data.subcategoryId) }});
      if (!sub) return res.status(400).json({ error: 'subcategory not found' });
    }

    // Validate invoice if provided
    if (data.invoiceId) {
      const invoice = await prisma.invoice.findUnique({ where: { id: Number(data.invoiceId) }});
      if (!invoice) return res.status(400).json({ error: 'invoice not found' });
    }

    const tx = await prisma.transaction.update({
      where: { id: Number(id) },
      data,
      include: {
        category: true,
        subcategory: true,
        createdBy: true,
        invoice: true
      }
    });
    res.json(tx);
  } catch (err) {
    next(err);
  }
}

async function deleteTransaction(req, res, next) {
  try {
    const { id } = req.params;
    await prisma.transaction.delete({ where: { id: Number(id) }});
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  createTransaction,
  getTransactions,
  getTransactionById,
  updateTransaction,
  deleteTransaction
};
