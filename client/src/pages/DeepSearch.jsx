import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../api/axios';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Search, Filter, Calendar, Tag, User, ArrowUpRight, ArrowDownRight,
  IndianRupee, TrendingUp, TrendingDown, BarChart3, PieChart, LineChart,
  Download, X, ChevronDown, ChevronUp, FileSpreadsheet
} from 'lucide-react';
import { toast } from 'sonner';
import dayjs from 'dayjs';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import { formatCurrency } from '@/lib/formatNumber';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import TimeSeriesChart from '../components/TimeSeriesChart';
import StackedBarChart from '../components/StackedBarChart';
import DonutChart from '../components/DonutChart';

async function fetchTransactions({
  companyId = 1,
  type,
  categoryId,
  subcategoryId,
  userId,
  from,
  to,
  search,
  limit = 10000
} = {}) {
  const params = { companyId, limit };
  if (type && type !== 'all') params.type = type;
  if (categoryId) params.categoryId = categoryId;
  if (subcategoryId) params.subcategoryId = subcategoryId;
  if (userId) params.userId = userId;
  if (from) params.from = from;
  if (to) params.to = to;
  if (search) params.search = search;

  const res = await api.get('/transactions', { params });
  return res.data;
}

async function fetchCategories() {
  const res = await api.get('/categories', { params: { includeAll: true } });
  return res.data?.categories ?? res.data ?? [];
}

async function fetchUsers() {
  const res = await api.get('/users');
  return res.data ?? [];
}

export default function DeepSearch() {
  const companyId = 1;

  // Filter states
  const [typeFilter, setTypeFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [subcategoryFilter, setSubcategoryFilter] = useState('');
  const [userFilter, setUserFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [showFilters, setShowFilters] = useState(true);

  const { data, isLoading, error } = useQuery({
    queryKey: ['deepSearch', companyId, typeFilter, categoryFilter, subcategoryFilter, userFilter, dateFrom, dateTo, searchTerm],
    queryFn: () => fetchTransactions({
      companyId,
      type: typeFilter,
      categoryId: categoryFilter,
      subcategoryId: subcategoryFilter,
      userId: userFilter,
      from: dateFrom,
      to: dateTo,
      search: searchTerm
    }),
    enabled: true // Always fetch when filters change
  });

  const { data: categories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: fetchCategories
  });

  const { data: users = [] } = useQuery({
    queryKey: ['users'],
    queryFn: fetchUsers
  });

  const topLevelCategories = categories.filter(cat => !cat.parentId);
  const filterSubcategories = categoryFilter
    ? categories.filter(cat => cat.parentId === Number(categoryFilter))
    : [];

  // Calculate totals from filtered transactions
  const calculations = useMemo(() => {
    const transactions = data?.transactions || [];
    
    const totalCredits = transactions
      .filter(t => t.type === 'CREDIT')
      .reduce((sum, t) => sum + Number(t.amount || 0), 0);
    
    const totalDebits = transactions
      .filter(t => t.type === 'DEBIT')
      .reduce((sum, t) => sum + Number(t.amount || 0), 0);
    
    const balance = totalCredits - totalDebits;
    const transactionCount = transactions.length;
    const creditCount = transactions.filter(t => t.type === 'CREDIT').length;
    const debitCount = transactions.filter(t => t.type === 'DEBIT').length;

    // Time series data (daily)
    const dailyData = {};
    transactions.forEach(t => {
      const key = dayjs(t.date).format('YYYY-MM-DD');
      if (!dailyData[key]) {
        dailyData[key] = { date: key, credits: 0, debits: 0, net: 0 };
      }
      const amount = Number(t.amount || 0);
      if (t.type === 'CREDIT') {
        dailyData[key].credits += amount;
      } else {
        dailyData[key].debits += amount;
      }
      dailyData[key].net = dailyData[key].credits - dailyData[key].debits;
    });

    // Monthly breakdown
    const monthlyData = {};
    transactions.forEach(t => {
      const key = dayjs(t.date).format('YYYY-MM');
      if (!monthlyData[key]) {
        monthlyData[key] = { month: key, credits: 0, debits: 0 };
      }
      const amount = Number(t.amount || 0);
      if (t.type === 'CREDIT') {
        monthlyData[key].credits += amount;
      } else {
        monthlyData[key].debits += amount;
      }
    });

    // Category breakdown
    const categoryData = {};
    transactions.forEach(t => {
      const catName = t.category?.name || 'Uncategorized';
      if (!categoryData[catName]) {
        categoryData[catName] = 0;
      }
      categoryData[catName] += Number(t.amount || 0);
    });

    return {
      totalCredits,
      totalDebits,
      balance,
      transactionCount,
      creditCount,
      debitCount,
      timeSeries: Object.values(dailyData).sort((a, b) => a.date.localeCompare(b.date)),
      monthlyBreakdown: Object.values(monthlyData).sort((a, b) => a.month.localeCompare(b.month)),
      categoryBreakdown: Object.entries(categoryData).map(([name, value]) => ({ name, value }))
    };
  }, [data]);

  function clearFilters() {
    setSearchTerm('');
    setTypeFilter('all');
    setCategoryFilter('');
    setSubcategoryFilter('');
    setUserFilter('');
    setDateFrom('');
    setDateTo('');
  }

  function onExportCSV() {
    const transactions = data?.transactions || [];
    if (transactions.length === 0) {
      toast.error('No data to export');
      return;
    }

    const rows = transactions.map(t => ({
      Date: dayjs(t.date).format('YYYY-MM-DD'),
      Type: t.type,
      Amount: Number(t.amount),
      Category: t.category?.name || 'Uncategorized',
      Subcategory: t.subcategory?.name || '-',
      User: t.createdBy?.name || 'Unknown',
      Note: t.note || '-',
      'Reconciliation Note': t.reconciliationNote || '-',
      Invoice: t.invoice?.invoiceNumber || '-'
    }));

    const csv = Papa.unparse(rows);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `deep-search-${dayjs().format('YYYY-MM-DD')}-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('CSV exported successfully');
  }

  function onExportExcel() {
    const transactions = data?.transactions || [];
    if (transactions.length === 0) {
      toast.error('No data to export');
      return;
    }

    try {
      // Prepare transaction data
      const transactionRows = transactions.map(t => ({
        'Date': dayjs(t.date).format('YYYY-MM-DD'),
        'Type': t.type,
        'Amount': Number(t.amount),
        'Category': t.category?.name || 'Uncategorized',
        'Subcategory': t.subcategory?.name || '-',
        'User': t.createdBy?.name || 'Unknown',
        'Note': t.note || '-',
        'Reconciliation Note': t.reconciliationNote || '-',
        'Invoice Number': t.invoice?.invoiceNumber || '-',
        'Invoice Client': t.invoice?.clientName || '-'
      }));

      // Create Summary Sheet
      const summaryData = [
        ['Deep Search Export Summary'],
        [''],
        ['Export Date', dayjs().format('YYYY-MM-DD HH:mm:ss')],
        [''],
        ['Filters Applied:'],
        ['Type', typeFilter === 'all' ? 'All' : typeFilter],
        ['Category', selectedCategory?.name || 'All'],
        ['Subcategory', selectedSubcategory?.name || 'All'],
        ['User', selectedUser?.name || 'All'],
        ['Date From', dateFrom ? dayjs(dateFrom).format('YYYY-MM-DD') : 'All'],
        ['Date To', dateTo ? dayjs(dateTo).format('YYYY-MM-DD') : 'All'],
        ['Search Term', searchTerm || 'None'],
        [''],
        ['Calculations:'],
        ['Total Credits', formatCurrency(calculations.totalCredits)],
        ['Total Debits', formatCurrency(calculations.totalDebits)],
        ['Net Balance', formatCurrency(calculations.balance)],
        ['Total Transactions', calculations.transactionCount],
        ['Credit Transactions', calculations.creditCount],
        ['Debit Transactions', calculations.debitCount],
        [''],
        ['Category Breakdown:'],
        ['Category', 'Total Amount']
      ];

      // Add category breakdown
      calculations.categoryBreakdown.forEach(cat => {
        summaryData.push([cat.name, formatCurrency(cat.value)]);
      });

      // Create workbook
      const wb = XLSX.utils.book_new();

      // Create Transactions sheet
      const wsTransactions = XLSX.utils.json_to_sheet(transactionRows);
      
      // Set column widths for Transactions sheet
      wsTransactions['!cols'] = [
        { wch: 12 }, // Date
        { wch: 10 }, // Type
        { wch: 15 }, // Amount
        { wch: 20 }, // Category
        { wch: 20 }, // Subcategory
        { wch: 15 }, // User
        { wch: 30 }, // Note
        { wch: 30 }, // Reconciliation Note
        { wch: 15 }, // Invoice Number
        { wch: 20 }  // Invoice Client
      ];

      // Create Summary sheet
      const wsSummary = XLSX.utils.aoa_to_sheet(summaryData);
      
      // Set column widths for Summary sheet
      wsSummary['!cols'] = [
        { wch: 25 }, // Label
        { wch: 30 }  // Value
      ];

      // Merge cells for title in Summary sheet
      if (!wsSummary['!merges']) wsSummary['!merges'] = [];
      wsSummary['!merges'].push({ s: { r: 0, c: 0 }, e: { r: 0, c: 1 } });

      // Add sheets to workbook
      XLSX.utils.book_append_sheet(wb, wsSummary, 'Summary');
      XLSX.utils.book_append_sheet(wb, wsTransactions, 'Transactions');

      // Generate Excel file
      const fileName = `deep-search-${dayjs().format('YYYY-MM-DD')}-${Date.now()}.xlsx`;
      XLSX.writeFile(wb, fileName);
      
      toast.success('Excel file exported successfully!');
    } catch (error) {
      console.error('Excel export error:', error);
      toast.error('Failed to export Excel file');
    }
  }

  const hasActiveFilters = typeFilter !== 'all' || categoryFilter || subcategoryFilter || userFilter || dateFrom || dateTo || searchTerm;
  const selectedCategory = topLevelCategories.find(c => c.id === Number(categoryFilter));
  const selectedSubcategory = filterSubcategories.find(s => s.id === Number(subcategoryFilter));
  const selectedUser = users.find(u => u.id === Number(userFilter));

  if (error) console.error('Deep search error', error);

  return (
    <div className="space-y-6 animate-in fade-in-0 duration-500">
      {/* Header */}
      <Card className="bg-gradient-to-r from-blue-500 via-blue-600 to-teal-500 text-white shadow-xl">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Search className="h-8 w-8" />
              <div>
                <CardTitle className="text-2xl font-bold">Deep Search & Analytics</CardTitle>
                <p className="text-blue-100 text-sm mt-1">Advanced filtering with detailed calculations and visualizations</p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={onExportCSV}
                className="bg-white/10 text-white border-white/20 hover:bg-white/20"
              >
                <Download className="h-4 w-4 mr-2" />
                Export CSV
              </Button>
              <Button
                variant="outline"
                onClick={onExportExcel}
                className="bg-white/10 text-white border-white/20 hover:bg-white/20"
              >
                <FileSpreadsheet className="h-4 w-4 mr-2" />
                Export Excel
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Filters */}
      <Card className="shadow-lg border-0">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Search Filters</CardTitle>
            <div className="flex items-center gap-2">
              {hasActiveFilters && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearFilters}
                  className="text-red-600 hover:text-red-700"
                >
                  <X className="h-4 w-4 mr-1" />
                  Clear All
                </Button>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowFilters(!showFilters)}
              >
                <Filter className="h-4 w-4 mr-2" />
                {showFilters ? 'Hide' : 'Show'} Filters
                {showFilters ? <ChevronUp className="h-4 w-4 ml-2" /> : <ChevronDown className="h-4 w-4 ml-2" />}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Quick Search */}
          <div className="mb-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by note, user name, category, or any text..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {/* Advanced Filters */}
          {showFilters && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 pt-4 border-t">
              {/* Type Filter */}
              <div className="space-y-2">
                <Label className="text-sm font-semibold">Type</Label>
                <select
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value)}
                  className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
                >
                  <option value="all">All Types</option>
                  <option value="CREDIT">Credit</option>
                  <option value="DEBIT">Debit</option>
                </select>
              </div>

              {/* Category Filter */}
              <div className="space-y-2">
                <Label className="text-sm font-semibold">Category</Label>
                <Select
                  value={categoryFilter || "all"}
                  onValueChange={(value) => {
                    setCategoryFilter(value === "all" ? '' : value);
                    setSubcategoryFilter('');
                  }}
                >
                  <SelectTrigger className="w-full h-10 bg-white dark:bg-gray-900">
                    <SelectValue placeholder="All Categories" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    {topLevelCategories.map(cat => (
                      <SelectItem key={cat.id} value={String(cat.id)}>
                        {cat.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Subcategory Filter */}
              {categoryFilter && filterSubcategories.length > 0 && (
                <div className="space-y-2">
                  <Label className="text-sm font-semibold">Subcategory</Label>
                  <Select
                    value={subcategoryFilter || "all"}
                    onValueChange={(value) => setSubcategoryFilter(value === "all" ? '' : value)}
                  >
                    <SelectTrigger className="w-full h-10 bg-white dark:bg-gray-900">
                      <SelectValue placeholder="All Subcategories" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Subcategories</SelectItem>
                      {filterSubcategories.map(sub => (
                        <SelectItem key={sub.id} value={String(sub.id)}>
                          {sub.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* User Filter */}
              <div className="space-y-2">
                <Label className="text-sm font-semibold">User</Label>
                <Select
                  value={userFilter || "all"}
                  onValueChange={(value) => setUserFilter(value === "all" ? '' : value)}
                >
                  <SelectTrigger className="w-full h-10 bg-white dark:bg-gray-900">
                    <SelectValue placeholder="All Users" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Users</SelectItem>
                    {users.map(u => (
                      <SelectItem key={u.id} value={String(u.id)}>
                        {u.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Date From */}
              <div className="space-y-2">
                <Label className="text-sm font-semibold">Date From</Label>
                <Input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="h-10"
                />
              </div>

              {/* Date To */}
              <div className="space-y-2">
                <Label className="text-sm font-semibold">Date To</Label>
                <Input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="h-10"
                />
              </div>
            </div>
          )}

          {/* Active Filters Summary */}
          {hasActiveFilters && (
            <div className="mt-4 pt-4 border-t">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm font-medium text-muted-foreground">Active Filters:</span>
                {typeFilter !== 'all' && (
                  <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded-full text-xs">
                    Type: {typeFilter}
                  </span>
                )}
                {selectedCategory && (
                  <span className="px-2 py-1 bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 rounded-full text-xs">
                    Category: {selectedCategory.name}
                  </span>
                )}
                {selectedSubcategory && (
                  <span className="px-2 py-1 bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300 rounded-full text-xs">
                    Subcategory: {selectedSubcategory.name}
                  </span>
                )}
                {selectedUser && (
                  <span className="px-2 py-1 bg-orange-100 dark:bg-orange-900 text-orange-700 dark:text-orange-300 rounded-full text-xs">
                    User: {selectedUser.name}
                  </span>
                )}
                {dateFrom && (
                  <span className="px-2 py-1 bg-teal-100 dark:bg-teal-900 text-teal-700 dark:text-teal-300 rounded-full text-xs">
                    From: {dayjs(dateFrom).format('MMM DD, YYYY')}
                  </span>
                )}
                {dateTo && (
                  <span className="px-2 py-1 bg-teal-100 dark:bg-teal-900 text-teal-700 dark:text-teal-300 rounded-full text-xs">
                    To: {dayjs(dateTo).format('MMM DD, YYYY')}
                  </span>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="relative overflow-hidden border-0 shadow-lg">
          <div className="absolute inset-0 bg-gradient-to-br from-green-500 to-emerald-600 opacity-5" />
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Credits</CardTitle>
            <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center shadow-md">
              <ArrowUpRight className="h-5 w-5 text-white" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {formatCurrency(calculations.totalCredits)}
            </div>
            <div className="text-xs text-muted-foreground mt-2">
              {calculations.creditCount} transactions
            </div>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden border-0 shadow-lg">
          <div className="absolute inset-0 bg-gradient-to-br from-red-500 to-rose-600 opacity-5" />
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Debits</CardTitle>
            <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-red-500 to-rose-600 flex items-center justify-center shadow-md">
              <ArrowDownRight className="h-5 w-5 text-white" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {formatCurrency(calculations.totalDebits)}
            </div>
            <div className="text-xs text-muted-foreground mt-2">
              {calculations.debitCount} transactions
            </div>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden border-0 shadow-lg">
          <div className={`absolute inset-0 bg-gradient-to-br ${calculations.balance >= 0 ? 'from-blue-500 to-blue-600' : 'from-red-500 to-red-600'} opacity-5`} />
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Net Balance</CardTitle>
            <div className={`h-10 w-10 rounded-lg bg-gradient-to-br ${calculations.balance >= 0 ? 'from-blue-500 to-blue-600' : 'from-red-500 to-red-600'} flex items-center justify-center shadow-md`}>
              <IndianRupee className="h-5 w-5 text-white" />
            </div>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${calculations.balance >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
              {formatCurrency(calculations.balance)}
            </div>
            <div className="text-xs text-muted-foreground mt-2">
              {calculations.balance >= 0 ? 'Positive' : 'Negative'} balance
            </div>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden border-0 shadow-lg">
          <div className="absolute inset-0 bg-gradient-to-br from-purple-500 to-violet-600 opacity-5" />
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Transactions</CardTitle>
            <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-purple-500 to-violet-600 flex items-center justify-center shadow-md">
              <TrendingUp className="h-5 w-5 text-white" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {calculations.transactionCount}
            </div>
            <div className="text-xs text-muted-foreground mt-2">
              Matching your filters
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Visualizations */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Time Series Chart */}
        <Card className="shadow-lg border-0">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <LineChart className="h-5 w-5" />
              Net Balance Over Time
            </CardTitle>
          </CardHeader>
          <CardContent>
            {calculations.timeSeries.length > 0 ? (
              <TimeSeriesChart data={calculations.timeSeries} />
            ) : (
              <div className="h-64 flex items-center justify-center text-muted-foreground">
                No data available for the selected filters
              </div>
            )}
          </CardContent>
        </Card>

        {/* Monthly Breakdown */}
        <Card className="shadow-lg border-0">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Credits vs Debits (Monthly)
            </CardTitle>
          </CardHeader>
          <CardContent>
            {calculations.monthlyBreakdown.length > 0 ? (
              <StackedBarChart data={calculations.monthlyBreakdown} />
            ) : (
              <div className="h-64 flex items-center justify-center text-muted-foreground">
                No data available for the selected filters
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Category Breakdown */}
      {calculations.categoryBreakdown.length > 0 && (
        <Card className="shadow-lg border-0">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PieChart className="h-5 w-5" />
              Distribution by Category
            </CardTitle>
          </CardHeader>
          <CardContent>
            <DonutChart data={calculations.categoryBreakdown} />
          </CardContent>
        </Card>
      )}

      {/* Transactions List */}
      <Card className="shadow-lg border-0">
        <CardHeader>
          <CardTitle>Matching Transactions ({calculations.transactionCount})</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto" />
              <p className="text-muted-foreground mt-4">Loading transactions...</p>
            </div>
          ) : data?.transactions?.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              No transactions found matching your filters
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b bg-gray-50 dark:bg-gray-800">
                    <th className="text-left py-3 px-4 font-semibold text-sm">Date</th>
                    <th className="text-left py-3 px-4 font-semibold text-sm">User</th>
                    <th className="text-left py-3 px-4 font-semibold text-sm">Type</th>
                    <th className="text-left py-3 px-4 font-semibold text-sm">Amount</th>
                    <th className="text-left py-3 px-4 font-semibold text-sm">Category</th>
                    <th className="text-left py-3 px-4 font-semibold text-sm">Subcategory</th>
                    <th className="text-left py-3 px-4 font-semibold text-sm">Note</th>
                  </tr>
                </thead>
                <tbody>
                  {data?.transactions?.map(tx => (
                    <tr key={tx.id} className="border-b hover:bg-muted/50 transition-colors">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          <span>{dayjs(tx.date).format('MMM DD, YYYY')}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-muted-foreground" />
                          <span>{tx.createdBy?.name || 'Unknown'}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          {tx.type === 'CREDIT' ? (
                            <ArrowUpRight className="h-4 w-4 text-green-600" />
                          ) : (
                            <ArrowDownRight className="h-4 w-4 text-red-600" />
                          )}
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            tx.type === 'CREDIT' 
                              ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300' 
                              : 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300'
                          }`}>
                            {tx.type}
                          </span>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <IndianRupee className="h-4 w-4 text-muted-foreground" />
                          <span className="font-bold">
                            {formatCurrency(tx.amount)}
                          </span>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <Tag className="h-4 w-4 text-muted-foreground" />
                          <span>{tx.category?.name || 'Uncategorized'}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span className="text-muted-foreground">
                          {tx.subcategory?.name || '-'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-muted-foreground">
                        {tx.note || tx.reconciliationNote || '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
