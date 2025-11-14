import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../api/axios';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import Modal from '../components/Modal';
import { useForm } from 'react-hook-form';
import { Plus, Download, Edit, Trash2, Search } from 'lucide-react';
import { toast } from 'sonner';
import dayjs from 'dayjs';
import Papa from 'papaparse';

async function fetchTransactions({ companyId = 1, skip = 0, limit = 20 } = {}) {
  const res = await api.get('/transactions', { params: { companyId, skip, limit } });
  return res.data;
}

export default function Transactions() {
  const companyId = 1;
  const [page, setPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const limit = 20;
  const qc = useQueryClient();

  const { data, isLoading, error } = useQuery({
    queryKey: ['transactions', companyId, page],
    queryFn: () => fetchTransactions({ companyId, skip: (page - 1) * limit, limit }),
    keepPreviousData: true
  });

  const createMut = useMutation({
    mutationFn: payload => api.post('/transactions', payload).then(r => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['transactions', companyId] });
      toast.success('Transaction created successfully');
    },
    onError: () => toast.error('Failed to create transaction')
  });

  const updateMut = useMutation({
    mutationFn: ({ id, payload }) => api.put(`/transactions/${id}`, payload).then(r => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['transactions', companyId] });
      toast.success('Transaction updated successfully');
    },
    onError: () => toast.error('Failed to update transaction')
  });

  const deleteMut = useMutation({
    mutationFn: id => api.delete(`/transactions/${id}`).then(r => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['transactions', companyId] });
      toast.success('Transaction deleted successfully');
    },
    onError: () => toast.error('Failed to delete transaction')
  });

  const [open, setOpen] = useState(false);
  const { register, handleSubmit, reset } = useForm();

  function openCreate() {
    reset({ type: 'debit', amount: 0, date: dayjs().format('YYYY-MM-DD') });
    setOpen(true);
  }

  function openEdit(tx) {
    reset({
      id: tx.id,
      type: tx.type,
      amount: Number(tx.amount),
      categoryId: tx.categoryId,
      subcategoryId: tx.subcategoryId,
      note: tx.note,
      date: dayjs(tx.date).format('YYYY-MM-DD')
    });
    setOpen(true);
  }

  async function onSubmit(values) {
    try {
      if (values.id) {
        await updateMut.mutateAsync({ id: values.id, payload: values });
      } else {
        await createMut.mutateAsync({ ...values, companyId, createdById: 1 });
      }
      setOpen(false);
      reset();
    } catch (err) {
      console.error(err);
    }
  }

  function onDelete(id) {
    if (!confirm('Are you sure you want to delete this transaction?')) return;
    deleteMut.mutate(id);
  }

  function onExport() {
    const rows = (data?.transactions || []).map(t => ({
      id: t.id,
      date: t.date,
      type: t.type,
      amount: t.amount,
      category: t.category?.name,
      note: t.note
    }));
    const csv = Papa.unparse(rows);
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `transactions-${Date.now()}.csv`;
    a.click();
    toast.success('Export started');
  }

  const filteredTransactions = (data?.transactions || []).filter(tx =>
    tx.note?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    tx.category?.name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (error) console.error('Transactions fetch error', error);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold gradient-text">Transactions</h1>
          <p className="text-muted-foreground mt-1">Manage and track all your expenses</p>
        </div>
        <div className="flex gap-3">
          <Button onClick={openCreate} className="bg-gradient-primary text-white hover:opacity-90">
            <Plus className="h-4 w-4 mr-2" />
            New Transaction
          </Button>
          <Button variant="outline" onClick={onExport}>
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      <Card className="shadow-lg">
        <CardHeader>
          <div className="flex items-center gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search transactions..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto" />
              <p className="text-muted-foreground mt-4">Loading transactions...</p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-3 px-4 font-semibold text-sm">Date</th>
                      <th className="text-left py-3 px-4 font-semibold text-sm">User</th>
                      <th className="text-left py-3 px-4 font-semibold text-sm">Type</th>
                      <th className="text-left py-3 px-4 font-semibold text-sm">Amount</th>
                      <th className="text-left py-3 px-4 font-semibold text-sm">Category</th>
                      <th className="text-left py-3 px-4 font-semibold text-sm">Note</th>
                      <th className="text-left py-3 px-4 font-semibold text-sm">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredTransactions.length === 0 ? (
                      <tr>
                        <td colSpan="7" className="text-center py-12 text-muted-foreground">
                          No transactions found
                        </td>
                      </tr>
                    ) : (
                      filteredTransactions.map(tx => (
                        <tr key={tx.id} className="border-b hover:bg-muted/50 transition-colors">
                          <td className="py-3 px-4">{dayjs(tx.date).format('MMM DD, YYYY')}</td>
                          <td className="py-3 px-4">{tx.createdBy?.name || 'N/A'}</td>
                          <td className="py-3 px-4">
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                              tx.type === 'credit' 
                                ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300' 
                                : 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300'
                            }`}>
                              {tx.type}
                            </span>
                          </td>
                          <td className="py-3 px-4 font-semibold">₹{Number(tx.amount).toLocaleString()}</td>
                          <td className="py-3 px-4">{tx.category?.name || 'Uncategorized'}</td>
                          <td className="py-3 px-4 text-muted-foreground">{tx.note || '-'}</td>
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => openEdit(tx)}
                                className="h-8 w-8"
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => onDelete(tx.id)}
                                className="h-8 w-8 text-destructive hover:text-destructive"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              <div className="flex items-center justify-between mt-6 pt-4 border-t">
                <div className="text-sm text-muted-foreground">
                  Showing {filteredTransactions.length} of {data?.transactions?.length || 0} transactions
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page === 1}
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                  >
                    Previous
                  </Button>
                  <span className="text-sm px-4">Page {page}</span>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={!data?.transactions?.length || data.transactions.length < limit}
                    onClick={() => setPage(p => p + 1)}
                  >
                    Next
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <Modal open={open} onClose={() => { setOpen(false); reset(); }} title={open && document.querySelector('input[name="id"]')?.value ? "Edit Transaction" : "New Transaction"}>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label>Type</Label>
            <select {...register('type')} className="w-full h-10 px-3 rounded-md border border-input bg-background">
              <option value="debit">Debit</option>
              <option value="credit">Credit</option>
            </select>
          </div>
          <div className="space-y-2">
            <Label>Amount</Label>
            <Input type="number" step="0.01" {...register('amount', { valueAsNumber: true })} />
          </div>
          <div className="space-y-2">
            <Label>Category ID</Label>
            <Input type="number" {...register('categoryId', { valueAsNumber: true })} />
          </div>
          <div className="space-y-2">
            <Label>Date</Label>
            <Input type="date" {...register('date')} />
          </div>
          <div className="space-y-2">
            <Label>Note</Label>
            <Input {...register('note')} placeholder="Transaction note" />
          </div>
          <div className="flex gap-2 pt-4">
            <Button type="submit" className="flex-1 bg-gradient-primary text-white">
              Save
            </Button>
            <Button type="button" variant="outline" onClick={() => { setOpen(false); reset(); }}>
              Cancel
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
