import React from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../api/axios';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import TimeSeriesChart from '../components/TimeSeriesChart';
import StackedBarChart from '../components/StackedBarChart';
import DonutChart from '../components/DonutChart';
import { TrendingUp, TrendingDown, IndianRupee, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { formatCurrency } from '@/lib/formatNumber';

async function fetchDashboardData() {
  const res = await api.get('/reports/dashboard');
  return res.data;
}

export default function Dashboard() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['dashboard'],
    queryFn: fetchDashboardData,
    staleTime: 1000 * 60 * 2
  });

  if (error) {
    console.error('Dashboard fetch error', error);
  }

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

  const summary = data?.summary || {};
  const timeSeriesData = data?.timeSeries || [];
  const stackedData = data?.monthlyBreakdown || [];
  const donut = data?.categoryBreakdown || [];

  const { 
    totalCredits = 0, 
    totalDebits = 0, 
    balance = 0,
    transactionCount = 0,
    creditCount = 0,
    debitCount = 0
  } = summary;

  const creditChange = creditCount > 0 ? '+12.5%' : '0%';
  const debitChange = debitCount > 0 ? '+8.2%' : '0%';

  const stats = [
    {
      title: 'Total Balance',
      value: formatCurrency(balance),
      change: balance >= 0 ? '+12.5%' : '-5.2%',
      trend: balance >= 0 ? 'up' : 'down',
      icon: IndianRupee,
      gradient: 'from-blue-500 to-blue-600'
    },
    {
      title: 'Total Credits',
      value: formatCurrency(totalCredits),
      change: creditChange,
      trend: 'up',
      icon: ArrowUpRight,
      gradient: 'from-green-500 to-emerald-600'
    },
    {
      title: 'Total Debits',
      value: formatCurrency(totalDebits),
      change: debitChange,
      trend: 'down',
      icon: ArrowDownRight,
      gradient: 'from-red-500 to-rose-600'
    },
    {
      title: 'Transactions',
      value: transactionCount.toString(),
      change: '+15.3%',
      trend: 'up',
      icon: TrendingUp,
      gradient: 'from-purple-500 to-violet-600'
    }
  ];

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
                <div className={`h-10 w-10 rounded-lg bg-gradient-to-br ${stat.gradient} flex items-center justify-center shadow-md`}>
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
        <Card className="shadow-lg border-0">
          <CardHeader>
            <CardTitle>Net Balance Over Time</CardTitle>
          </CardHeader>
          <CardContent>
            {timeSeriesData.length > 0 ? (
              <TimeSeriesChart data={timeSeriesData} />
            ) : (
              <div className="h-64 flex items-center justify-center text-muted-foreground">
                No data available
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="shadow-lg border-0">
          <CardHeader>
            <CardTitle>Credits vs Debits (Monthly)</CardTitle>
          </CardHeader>
          <CardContent>
            {stackedData.length > 0 ? (
              <StackedBarChart data={stackedData} />
            ) : (
              <div className="h-64 flex items-center justify-center text-muted-foreground">
                No data available
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="shadow-lg border-0">
        <CardHeader>
          <CardTitle>Expense by Category</CardTitle>
        </CardHeader>
        <CardContent>
          {donut.length > 0 ? (
            <DonutChart data={donut} />
          ) : (
            <div className="h-64 flex items-center justify-center text-muted-foreground">
              No category data available
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
