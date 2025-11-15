// This is your existing Prisma client import
const prisma = require('../prismaClient'); 
const { Decimal } = require('@prisma/client/runtime/library');

// --- ADDED ---
// We add axios to make HTTP requests to your Django API
const axios = require('axios');

// POST /api/invoices
async function createInvoice(req, res, next) {
  try {
    const { invoiceNumber, expectedAmount, clientName, dueDate } = req.body;
    
    if (!invoiceNumber || !expectedAmount) {
      return res.status(400).json({ error: 'Invoice number and expected amount are required.' });
    }

    const invoice = await prisma.invoice.create({
      data: {
        invoiceNumber,
        expectedAmount,
        clientName,
        dueDate: dueDate ? new Date(dueDate) : null,
      },
    });

    res.status(201).json(invoice);
  } catch (error) {
    if (error.code === 'P2002') {
      return res.status(400).json({ error: 'Invoice number already exists' });
    }
    res.status(500).json({ error: 'Failed to create invoice', details: error.message });
  }
}

// GET /api/invoices
async function getAllInvoices(req, res, next) {
  try {
    const invoices = await prisma.invoice.findMany({
      include: { payments: true },
      orderBy: { createdAt: 'desc' }
    });

    // Calculate totals for each invoice
    const invoicesWithTotals = invoices.map(invoice => {
      const totalPaid = invoice.payments.reduce((sum, payment) => {
        return sum.add(new Decimal(payment.amount));
      }, new Decimal(0));
      
      const balanceDue = new Decimal(invoice.expectedAmount).sub(totalPaid);
      
      return {
        ...invoice,
        totalPaid: totalPaid.toString(),
        balanceDue: balanceDue.toString(),
        isPaid: balanceDue.lessThanOrEqualTo(0)
      };
    });

    res.status(200).json(invoicesWithTotals);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch invoices', details: error.message });
  }
}

// GET /api/invoices/:id
async function getInvoiceById(req, res, next) {
  try {
    const { id } = req.params;
    const invoice = await prisma.invoice.findUnique({
      where: { id: parseInt(id) },
      include: { payments: true },
    });

    if (!invoice) {
      return res.status(404).json({ error: 'Invoice not found' });
    }

    const totalPaid = invoice.payments.reduce((sum, payment) => {
      return sum.add(new Decimal(payment.amount));
    }, new Decimal(0));
    
    const balanceDue = new Decimal(invoice.expectedAmount).sub(totalPaid);

    res.status(200).json({ 
      ...invoice, 
      totalPaid: totalPaid.toString(), 
      balanceDue: balanceDue.toString() 
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch invoice', details: error.message });
  }
}

// GET /api/invoices/open
async function getOpenInvoices(req, res, next) {
  try {
    const allInvoices = await prisma.invoice.findMany({
      include: { payments: true },
      orderBy: { createdAt: 'desc' }
    });

    const openInvoices = allInvoices.map(invoice => {
      const totalPaid = invoice.payments.reduce((sum, payment) => {
        return sum.add(new Decimal(payment.amount));
      }, new Decimal(0));
      
      const balanceDue = new Decimal(invoice.expectedAmount).sub(totalPaid);
      
      // Round to 2 decimal places
      const balanceDueRounded = parseFloat(balanceDue.toFixed(2));
      
      return {
        ...invoice,
        totalPaid: totalPaid.toString(),
        balanceDue: balanceDueRounded.toString(),
      };
    }).filter(invoice => {
      // Only include invoices with balance > 1 (allowing 1 rupee tolerance for rounding)
      const balance = parseFloat(invoice.balanceDue);
      return balance > 1;
    });

    res.status(200).json(openInvoices);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch open invoices', details: error.message });
  }
}

// PATCH /api/invoices/:id
async function updateInvoice(req, res, next) {
  try {
    const { id } = req.params;
    const { invoiceNumber, expectedAmount, clientName, dueDate } = req.body;

    const invoice = await prisma.invoice.update({
      where: { id: parseInt(id) },
      data: {
        ...(invoiceNumber && { invoiceNumber }),
        ...(expectedAmount && { expectedAmount }),
        ...(clientName !== undefined && { clientName }),
        ...(dueDate && { dueDate: new Date(dueDate) }),
      },
      include: { payments: true }
    });

    res.json(invoice);
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Invoice not found' });
    }
    res.status(500).json({ error: 'Failed to update invoice', details: error.message });
  }
}

// DELETE /api/invoices/:id
async function deleteInvoice(req, res, next) {
  try {
    const { id } = req.params;
    await prisma.invoice.delete({
      where: { id: parseInt(id) }
    });
    res.json({ message: 'Invoice deleted successfully' });
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Invoice not found' });
    }
    res.status(500).json({ error: 'Failed to delete invoice', details: error.message });
  }
}

// --- NEW FUNCTION ADDED ---
// POST /api/invoices/sync
// This is the function your "Refresh" button will call.
async function syncInvoicesFromExternal(req, res) {
  console.log("entered")
  try {
    // 1. Fetch invoices from your Django API
    const response = await axios.get(
      // --- UPDATE THIS URL ---
      'https://invoice.slogsolutions.com/api/v1/get-invoices', 
      {
        headers: {
          // --- UPDATE THIS KEY ---
          'Authorization': 'your-very-secret-key-12345'
        }
      }
    );

    const externalInvoices = response.data; // This is the array of invoices
    let syncCount = 0;

    // 2. Loop through each invoice and map the fields
    for (const extInvoice of externalInvoices) {
      
      // --- This is the custom mapping you requested ---
      const combinedClientName = `${extInvoice.client_name}\n${extInvoice.client_address}`;
      
      const invoiceData = {
        externalId:     String(extInvoice.id),
        invoiceNumber:  extInvoice.invoice_number,
        expectedAmount: new Decimal(extInvoice.total_amount),
        clientName:     combinedClientName,
        dueDate:        extInvoice.invoice_date ? new Date(extInvoice.invoice_date) : null
      };

      // 3. "Upsert" the data into your PostgreSQL database
      // It uses the 'prisma' client from the top of the file
      await prisma.invoice.upsert({
        where: {
          externalId: invoiceData.externalId, // Find using the Django ID
        },
        update: {
          invoiceNumber:  invoiceData.invoiceNumber,
          expectedAmount: invoiceData.expectedAmount,
          clientName:     invoiceData.clientName,
          dueDate:        invoiceData.dueDate,
        },
        create: {
          externalId:     invoiceData.externalId,
          invoiceNumber:  invoiceData.invoiceNumber,
          expectedAmount: invoiceData.expectedAmount,
          clientName:     invoiceData.clientName,
          dueDate:        invoiceData.dueDate,
        }
      });
      syncCount++;
    }

    res.status(200).json({ 
      message: "Sync complete", 
      synced: syncCount 
    });

  } catch (error) {
    console.error("Sync failed:", error);
    res.status(500).json({ error: 'Failed to sync invoices', details: error.message });
  }
}


// --- MODULE EXPORTS (MODIFIED) ---
// Add the new function to the exports
module.exports = {
  createInvoice,
  getAllInvoices,
  getInvoiceById,
  getOpenInvoices,
  updateInvoice,
  deleteInvoice,
  syncInvoicesFromExternal // <-- The new function is added here
};