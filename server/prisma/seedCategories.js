// prisma/seed.js
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding transactions...");

  // -------------------------------------------------
  // 1. Fetch an existing user to assign transactions
  // -------------------------------------------------
  let user1 = await prisma.user.findFirst({
    where: { role: "ADMIN" },
  });

  if (!user1) {
    // if no admin exists, create one
    user1 = await prisma.user.create({
      data: {
        name: "Default Admin",
        email: "admin@slog.com",
        password: "admin123",
        role: "ADMIN",
      },
    });
    console.log("Created fallback admin user.");
  }

  // -------------------------------------------------
  // 2. Fetch all categories + their subcategories
  // -------------------------------------------------
  const categories = await prisma.category.findMany({
    include: { subcategories: true },
  });

  if (categories.length === 0) {
    console.log("❌ No categories found. Cannot seed transactions.");
    return;
  }

  // Prepare subcategory list
  const allSubcategories = categories.flatMap((c) =>
    c.subcategories.map((s) => ({
      id: s.id,
      parentId: c.id, // main category
    }))
  );

  if (allSubcategories.length === 0) {
    console.log("❌ No subcategories found. Cannot seed transactions.");
    return;
  }

  // -------------------------------------------------
  // 3. Helper for random subcategory
  // -------------------------------------------------
  function getRandomSub() {
    return allSubcategories[
      Math.floor(Math.random() * allSubcategories.length)
    ];
  }

  // -------------------------------------------------
  // 4. Create 20 mock transactions
  // -------------------------------------------------
  const transactions = [];

  for (let i = 0; i < 20; i++) {
    const sub = getRandomSub();

    transactions.push({
      type: "DEBIT",
      amount: (Math.random() * 5000 + 500).toFixed(2),
      categoryId: sub.parentId,
      subcategoryId: sub.id,
      createdById: user1.id,
      date: new Date(Date.now() - Math.random() * 20 * 86400000),
      note: `Mock transaction ${i + 1}`,
    });
  }

  await prisma.transaction.createMany({ data: transactions });

  console.log("✨ Created 20 new mock transactions.");
  console.log("🌱 Seeding completed!");
}

// Run Seeder
main()
  .then(() => prisma.$disconnect())
  .catch((err) => {
    console.error(err);
    prisma.$disconnect();
    process.exit(1);
  });
