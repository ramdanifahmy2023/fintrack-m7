import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Bar,
  BarChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  Cell,
} from 'recharts';
import { format, subMonths, startOfMonth, endOfMonth } from 'date-fns';
import { id as localeID } from 'date-fns/locale';
import { formatCurrency } from '@/lib/utils';

interface MonthlySummary {
  month: string;
  income: number;
  expense: number;
}

interface CategoryExpense {
  name: string;
  value: number;
  color: string;
}

const COLORS = ['#6366F1', '#8B5CF6', '#EC4899', '#F59E0B', '#10B981', '#3B82F6'];

export default function Reports() {
  const { user } = useAuth();
  const [monthlyData, setMonthlyData] = useState<MonthlySummary[]>([]);
  const [categoryData, setCategoryData] = useState<CategoryExpense[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchReportData();
    }
  }, [user]);

  const fetchReportData = async () => {
    setLoading(true);
    try {
      // 1. Data untuk Grafik Batang (6 Bulan Terakhir)
      const monthlyPromises = [];
      for (let i = 5; i >= 0; i--) {
        const date = subMonths(new Date(), i);
        const startDate = startOfMonth(date).toISOString();
        const endDate = endOfMonth(date).toISOString();
        
        monthlyPromises.push(
          supabase
            .from('transactions')
            .select('type, amount')
            .eq('user_id', user!.id)
            .gte('transaction_date', startDate)
            .lte('transaction_date', endDate)
        );
      }
      
      const monthlyResults = await Promise.all(monthlyPromises);

      const summaryData = monthlyResults.map((result, i) => {
        const date = subMonths(new Date(), 5 - i);
        const monthName = format(date, 'MMM', { locale: localeID });
        
        const income = result.data?.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0) || 0;
        const expense = result.data?.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0) || 0;
        
        return { month: monthName, income, expense };
      });
      setMonthlyData(summaryData);

      // 2. Data untuk Grafik Lingkaran (Bulan Ini)
      const currentMonthStart = startOfMonth(new Date()).toISOString();
      const { data: currentMonthTransactions, error } = await supabase
        .from('transactions')
        .select('amount, categories(name, color)')
        .eq('user_id', user!.id)
        .eq('type', 'expense')
        .gte('transaction_date', currentMonthStart);
        
      if (error) throw error;

      const expenseByCategory: { [key: string]: { value: number, color: string } } = {};
      currentMonthTransactions.forEach(t => {
        const categoryName = t.categories?.name || 'Lain-lain';
        if (!expenseByCategory[categoryName]) {
          expenseByCategory[categoryName] = { value: 0, color: t.categories?.color || '#8884d8' };
        }
        expenseByCategory[categoryName].value += t.amount;
      });

      const pieData = Object.keys(expenseByCategory).map(key => ({
        name: key,
        value: expenseByCategory[key].value,
        color: expenseByCategory[key].color,
      }));
      setCategoryData(pieData);

    } catch (error) {
      console.error('Error fetching report data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Laporan Keuangan</h1>
        <p className="text-muted-foreground">
          Visualisasikan data keuangan Anda untuk wawasan yang lebih baik.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Pemasukan vs. Pengeluaran (6 Bulan Terakhir)</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={monthlyData}>
                <XAxis dataKey="month" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `${formatCurrency(Number(value))}`} />
                <Tooltip formatter={(value) => formatCurrency(Number(value))} cursor={{ fill: 'hsl(var(--muted))' }} />
                <Legend iconType="circle" />
                <Bar dataKey="income" name="Pemasukan" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                <Bar dataKey="expense" name="Pengeluaran" fill="hsl(var(--destructive))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Rincian Pengeluaran Bulan Ini</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={categoryData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                  nameKey="name"
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                >
                  {categoryData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color || COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                <Legend iconType="circle" />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}