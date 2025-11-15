const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

// --- 1. Define All Category Data ---

// Your CREDIT categories
const creditCategoriesData = [
  {
    name: "Services Revenue",
    subcategories: [
      { name: "Software Development Project" },
      { name: "Consulting Fees" },
      { name: "Monthly Retainers" },
      { name: "Maintenance & Support" },
    ],
  },
  {
    name: "Education Revenue",
    subcategories: [
      { name: "Corporate Training (B2B)" },
      { name: "Course Sales (B2C)" },
      { name: "Workshop & Bootcamp Fees" },
    ],
  },
  {
    name: "Product Revenue",
    subcategories: [
      { name: "SaaS Subscriptions" }, 
      { name: "License Sales" }
    ],
  },
  {
    name: "Financing & Capital",
    subcategories: [
      { name: "Equity Investment (VC/Angel)" },
      { name: "Director/Owner Loan" },
      { name: "Bank Loan" },
      { name: "Grants Received" },
    ],
  },
  {
    name: "Other Income",
    subcategories: [
      { name: "Interest Received" },
      { name: "Sale of Assets" },
      { name: "Vendor Refunds" },
      { name: "Affiliate Revenue" },
    ],
  },
];

// Example DEBIT categories
const debitCategoriesData = [
  {
    name: "Operational Expenses",
    subcategories: [
      { name: "Office Rent" },
      { name: "Utilities (Electric, Water)" },
      { name: "Software Subscriptions (SaaS)" },
      { name: "Office Supplies" },
    ],
  },
  {
    name: "Team & Payroll",
    subcategories: [
      { name: "Employee Salaries" },
      { name: "Contractor Fees" },
      { name: "Team Events & Perks" },
      { name: "Training & Development" },
    ],
  },
  {
    name: "Business & Travel",
    subcategories: [
      { name: "Client Dinners" },
      { name: "Flights" },
      { name: "Hotels" },
      { name: "Legal & Consulting Fees" },
    ],
  },
];

// --- 2. Seeder Helper Functions ---

/**
 * Seeds all categories and subcategories using the corrected findFirst/create method.
 */
async function seedCategories() {
  console.log("🌱 Seeding categories...");

  const allCategoryData = [
    ...creditCategoriesData,
    ...debitCategoriesData
  ];

  for (const catData of allCategoryData) {
    // 1. Manually find the PARENT category (where parentId is null)
    let parentCategory = await prisma.category.findFirst({
      where: {
        name: catData.name,
        parentId: null,
      },
    });

    // 2. If it doesn't exist, create it
    if (!parentCategory) {
      parentCategory = await prisma.category.create({
        data: {
          name: catData.name,
          parentId: null,
        },
      });
    }

    // 3. Loop and upsert all subcategories
    if (catData.subcategories && catData.subcategories.length > 0) {
      for (const subData of catData.subcategories) {
        await prisma.category.upsert({
          where: {
            name_parentId: { // This is safe because parentId is not null
              name: subData.name,
              parentId: parentCategory.id,
            },
          },
          update: {},
          create: {
            name: subData.name,
            parentId: parentCategory.id,
          },
        });
      }
    }
  }
  console.log("✨ Categories seeded successfully.");
}

/**
 * Seeds mock invoices and transactions (both CREDIT and DEBIT).
 */
async function seedInvoicesAndTransactions() {
  console.log("🌱 Seeding invoices and transactions...");

  // 1. Get user
  let user1 = await prisma.user.findFirst({
    where: { role: "ADMIN" },
  });

  if (!user1) {
    user1 = await prisma.user.create({
      data: {
        name: "Default Admin",
        email: "admin@slog.com",
        password: "admin123", // Note: Use a hashed password in production
        role: "ADMIN",
      },
    });
    console.log("Created fallback admin user.");
  }

  // 2. Clear old mock data
  await prisma.transaction.deleteMany({
    where: { note: { startsWith: "Mock" } },
  });
  await prisma.invoice.deleteMany({
    where: { clientName: { startsWith: "Mock Client" } },
  });
  console.log("🧹 Cleared old mock data.");


  // 3. Create 5 mock invoices
  const invoiceData = [];
  for (let i = 1; i <= 5; i++) {
    invoiceData.push({
      invoiceNumber: `INV-2025-00${i}`,
      expectedAmount: (Math.random() * 50000 + 10000).toFixed(2),
      clientName: `Mock Client ${i}`,
      dueDate: new Date(Date.now() + i * 5 * 86400000), // Due in 5, 10, 15... days
    });
  }
  
  // We must create them one-by-one to get their IDs back
  const createdInvoices = [];
  for (const data of invoiceData) {
    const invoice = await prisma.invoice.create({ data });
    createdInvoices.push(invoice);
  }
  console.log(`✨ Created ${createdInvoices.length} mock invoices.`);


  // 4. Fetch all categories + subcategories
  const categories = await prisma.category.findMany({
    include: { subcategories: true },
  });

  // 5. Separate subcategories into CREDIT and DEBIT lists
  const creditCategoryNames = creditCategoriesData.map((c) => c.name);
  const debitCategoryNames = debitCategoriesData.map((c) => c.name);

  const allSubcategories = categories.flatMap((c) =>
    c.subcategories.map((s) => ({
      id: s.id,
      parentId: c.id,
      parentName: c.name,
    }))
  );

  const creditSubs = allSubcategories.filter((s) =>
    creditCategoryNames.includes(s.parentName)
  );
  const debitSubs = allSubcategories.filter((s) =>
    debitCategoryNames.includes(s.parentName)
  );

  if (creditSubs.length === 0 || debitSubs.length === 0) {
    console.error("❌ No subcategories found. Did category seeding fail?");
    return;
  }

  // 6. Helpers for random subs
  function getRandomCreditSub() {
    return creditSubs[Math.floor(Math.random() * creditSubs.length)];
  }
  function getRandomDebitSub() {
    return debitSubs[Math.floor(Math.random() * debitSubs.length)];
  }

  // 7. Create mock transactions
  const transactions = [];

  // Create 10 CREDIT transactions LINKED to invoices
  for (let i = 0; i < 10; i++) {
    const sub = getRandomCreditSub();
    // Pick a random invoice
    const invoice = createdInvoices[i % createdInvoices.length];
    
    transactions.push({
      type: "CREDIT",
      // Pay a portion of the invoice
      amount: (Number(invoice.expectedAmount) / 2).toFixed(2), 
      categoryId: sub.parentId,
      subcategoryId: sub.id,
      createdById: user1.id,
      date: new Date(Date.now() - Math.random() * 10 * 86400000), // in the last 10 days
      note: `Mock Payment for ${invoice.invoiceNumber}`,
      invoiceId: invoice.id, // <-- LINK THE INVOICE
    });
  }

  // Create 10 more CREDIT transactions NOT linked to invoices
  for (let i = 0; i < 10; i++) {
    const sub = getRandomCreditSub();
    transactions.push({
      type: "CREDIT",
      amount: (Math.random() * 5000 + 1000).toFixed(2),
      categoryId: sub.parentId,
      subcategoryId: sub.id,
      createdById: user1.id,
      date: new Date(Date.now() - Math.random() * 30 * 86400000), // 30 days
      note: `Mock Credit Transaction ${i + 1}`,
      invoiceId: null, // <-- No invoice
    });
  }

  // Create 20 DEBIT transactions
  for (let i = 0; i < 20; i++) {
    const sub = getRandomDebitSub();
    transactions.push({
      type: "DEBIT",
      amount: (Math.random() * 5000 + 500).toFixed(2),
      categoryId: sub.parentId,
      subcategoryId: sub.id,
      createdById: user1.id,
      date: new Date(Date.now() - Math.random() * 30 * 86400000), // 30 days
      note: `Mock Debit Transaction ${i + 1}`,
    });
  }
  
  await prisma.transaction.createMany({ data: transactions });

  console.log("✨ Created 20 new mock CREDIT transactions (10 linked to invoices).");
  console.log("✨ Created 20 new mock DEBIT transactions.");
}

// --- 3. Run Seeder ---

async function main() {
  await seedCategories();
  await seedInvoicesAndTransactions();
  console.log("🌱 Seeding completed!");
}

main()
  .then(() => prisma.$disconnect())
  .catch((err) => {
    console.error(err);
    prisma.$disconnect();
    process.exit(1);
  });