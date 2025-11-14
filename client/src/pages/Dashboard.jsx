import React from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../api/axios';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import TimeSeriesChart from '../components/TimeSeriesChart';
import StackedBarChart from '../components/StackedBarChart';
import DonutChart from '../components/DonutChart';
import { TrendingUp, TrendingDown, DollarSign, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import dayjs from 'dayjs';

async function fetchAllTransactions(companyId = 1) {
  const res = await api.get('/transactions', { params: { companyId, limit: 1000 } });
  return res.data;
}

export default function Dashboard() {
  const companyId = 1;

  const { data: txResp, isLoading, error } = useQuery({
    queryKey: ['dashboardTx', companyId],
    queryFn: () => fetchAllTransactions(companyId),
    staleTime: 1000 * 60 * 2
  });

  if (error) {
    console.error('Dashboard fetch error', error);
  }

  const transactions = txResp?.transactions || [];

  // Calculate metrics
  const timeSeries = {};
  transactions.forEach(t => {
    const d = dayjs(t.date).format('YYYY-MM-DD');
    timeSeries[d] = (timeSeries[d] || 0) + (t.type === 'credit' ? Number(t.amount) : -Number(t.amount));
  });
  const timeSeriesData = Object.entries(timeSeries).sort().map(([date, net]) => ({ date, net }));

  const monthly = {};
  transactions.forEach(t => {
    const m = dayjs(t.date).format('YYYY-MM');
    monthly[m] = monthly[m] || { credits: 0, debits: 0 };
    if (t.type === 'credit') monthly[m].credits += Number(t.amount);
    else monthly[m].debits += Number(t.amount);
  });
  const stackedData = Object.entries(monthly).map(([month, v]) => ({ month, ...v }));

  const cat = {};
  transactions.forEach(t => {
    const name = t.category?.name || 'Uncategorized';
    cat[name] = (cat[name] || 0) + Number(t.amount);
  });
  const donut = Object.entries(cat).map(([name, value]) => ({ name, value }));

  const totalCredits = transactions.filter(t => t.type === 'credit').reduce((s, t) => s + Number(t.amount), 0);
  const totalDebits = transactions.filter(t => t.type === 'debit').reduce((s, t) => s + Number(t.amount), 0);
  const opening = txResp?.openingBalance ?? 0;
  const balance = opening + totalCredits - totalDebits;

  const stats = [
    {
      title: 'Total Balance',
      value: `₹${balance.toLocaleString()}`,
      change: '+12.5%',
      trend: 'up',
      icon: DollarSign,
      gradient: 'from-blue-500 to-blue-600'
    },
    {
      title: 'Total Credits',
      value: `₹${totalCredits.toLocaleString()}`,
      change: '+8.2%',
      trend: 'up',
      icon: ArrowUpRight,
      gradient: 'from-green-500 to-emerald-600'
    },
    {
      title: 'Total Debits',
      value: `₹${totalDebits.toLocaleString()}`,
      change: '-3.1%',
      trend: 'down',
      icon: ArrowDownRight,
      gradient: 'from-red-500 to-rose-600'
    },
    {
      title: 'Transactions',
      value: transactions.length.toString(),
      change: '+15.3%',
      trend: 'up',
      icon: TrendingUp,
      gradient: 'from-purple-500 to-violet-600'
    }
  ];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto" />
          <p className="text-muted-foreground">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, idx) => {
          const Icon = stat.icon;
          return (
            <Card key={idx} className="relative overflow-hidden border-0 shadow-lg hover:shadow-xl transition-shadow">
              <div className={`absolute inset-0 bg-gradient-to-br ${stat.gradient} opacity-5`} />
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">{stat.title}</CardTitle>
                <div className={`h-10 w-10 rounded-lg bg-gradient-to-br ${stat.gradient} flex items-center justify-center`}>
                  <Icon className="h-5 w-5 text-white" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stat.value}</div>
                <div className={`flex items-center gap-1 text-xs mt-2 ${stat.trend === 'up' ? 'text-green-600' : 'text-red-600'}`}>
                  {stat.trend === 'up' ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                  <span>{stat.change}</span>
                  <span className="text-muted-foreground">from last month</span>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle>Net Balance Over Time</CardTitle>
          </CardHeader>
          <CardContent>
            <TimeSeriesChart data={timeSeriesData} />
          </CardContent>
        </Card>

        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle>Credits vs Debits</CardTitle>
          </CardHeader>
          <CardContent>
            <StackedBarChart data={stackedData} />
          </CardContent>
        </Card>
      </div>

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle>Expense by Category</CardTitle>
        </CardHeader>
        <CardContent>
          <DonutChart data={donut} />
        </CardContent>
      </Card>
    </div>
  );
}
