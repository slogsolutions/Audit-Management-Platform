require('dotenv').config();
const express = require('express');
const cors = require('cors');

const usersRoute = require('./routes/users');
const categoriesRoute = require('./routes/categories');
const transactionsRoute = require('./routes/transactions');
const reportsRoute = require('./routes/reports');
const authRoutes = require('./routes/auth');
const invoicesRoute = require('./routes/invoices');
const errorHandler = require('./middlewares/errorHandler');

const app = express();
app.use(cors());
app.use(express.json());

// routes
app.use('/api/auth', authRoutes);
app.use('/api/users', usersRoute);
app.use('/api/categories', categoriesRoute);
app.use('/api/transactions', transactionsRoute);
app.use('/api/reports', reportsRoute);
app.use('/api/invoices', invoicesRoute);

// health
app.get('/health', (req, res) => res.json({ ok: true }));

// error middleware
app.use(errorHandler);

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`Server listening on ${PORT}`));
