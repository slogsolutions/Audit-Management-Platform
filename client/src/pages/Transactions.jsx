import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../api/axios';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import Modal from '../components/Modal';
import { useForm, Controller } from 'react-hook-form';
import { Plus, Download, Edit, Trash2, Search, IndianRupee, Receipt, FileText, Calendar, User, Tag, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { toast } from 'sonner';
import dayjs from 'dayjs';
import Papa from 'papaparse';
import { AmountInput } from '@/components/ui/AmountInput';
import { formatCurrency } from '@/lib/formatNumber';

async function fetchTransactions({ companyId = 1, skip = 0, limit = 20 } = {}) {
  const res = await api.get('/transactions', { params: { companyId, skip, limit } });
  return res.data;
}

async function fetchCategories() {
  const res = await api.get('/categories', { params: { includeAll: true } });
  return res.data?.categories ?? res.data ?? [];
}

async function fetchOpenInvoices() {
  const res = await api.get('/invoices/open');
  return res.data ?? [];
}

async function fetchAllInvoices() {
  const res = await api.get('/invoices');
  return res.data ?? [];
}

export default function Transactions() {
  const companyId = 1;
  const [page, setPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const limit = 20;
  const qc = useQueryClient();

  const { data, isLoading, error } = useQuery({
    queryKey: ['transactions', companyId, page, typeFilter],
    queryFn: () => fetchTransactions({ companyId, skip: (page - 1) * limit, limit }),
    keepPreviousData: true
  });

  const { data: categories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: fetchCategories
  });

  const { data: openInvoices = [], isLoading: isOpenInvoicesLoading } = useQuery({
    queryKey: ['openInvoices'],
    queryFn: fetchOpenInvoices
  });

  const { data: allInvoices = [], isLoading: isAllInvoicesLoading } = useQuery({
    queryKey: ['allInvoices'],
    queryFn: fetchAllInvoices
  });

  const createMut = useMutation({
    mutationFn: payload => api.post('/transactions', payload).then(r => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['transactions', companyId] });
      qc.invalidateQueries({ queryKey: ['openInvoices'] });
      toast.success('Transaction created successfully');
      setOpen(false);
      reset();
    },
    onError: (err) => {
      console.error('Create transaction error:', err);
      toast.error(err.response?.data?.error || 'Failed to create transaction');
    }
  });

  const updateMut = useMutation({
    mutationFn: ({ id, payload }) => api.put(`/transactions/${id}`, payload).then(r => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['transactions', companyId] });
      qc.invalidateQueries({ queryKey: ['openInvoices'] });
      toast.success('Transaction updated successfully');
      setOpen(false);
      reset();
    },
    onError: (err) => {
      console.error('Update transaction error:', err);
      toast.error(err.response?.data?.error || 'Failed to update transaction');
    }
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
  const { register, handleSubmit, reset, watch, setValue, control, formState: { errors } } = useForm();

  const selectedType = watch('type');
  const selectedCategoryId = watch('categoryId');
  const creditSource = watch('creditSource'); // 'cash' or 'invoice'
  const selectedInvoiceId = watch('invoiceId');

  // Get top-level categories
  const topLevelCategories = categories.filter(cat => !cat.parentId);
  
  // Get subcategories for selected category
  const subcategories = selectedCategoryId
    ? categories.filter(cat => cat.parentId === Number(selectedCategoryId))
    : [];

  function openCreate() {
    reset({ 
      type: 'DEBIT', 
      amount: 0, 
      date: dayjs().format('YYYY-MM-DD'),
      creditSource: 'cash',
      invoiceId: '',
      categoryId: '',
      subcategoryId: '',
      note: '',
      reconciliationNote: ''
    });
    setOpen(true);
  }

  function openEdit(tx) {
    reset({
      id: tx.id,
      type: tx.type,
      amount: Number(tx.amount),
      categoryId: tx.categoryId,
      subcategoryId: tx.subcategoryId,
      invoiceId: tx.invoiceId || '',
      reconciliationNote: tx.reconciliationNote || '',
      note: tx.note || '',
      date: dayjs(tx.date).format('YYYY-MM-DD'),
      creditSource: tx.invoiceId ? 'invoice' : 'cash'
    });
    setOpen(true);
  }

  async function onSubmit(values) {
    try {
      console.log('Form values:', values);
      
      // Clean up payload - remove UI-only fields
      const payload = {
        type: values.type.toUpperCase(),
        amount: Number(values.amount),
        categoryId: Number(values.categoryId),
        subcategoryId: values.subcategoryId ? Number(values.subcategoryId) : null,
        invoiceId: values.creditSource === 'invoice' && values.invoiceId ? Number(values.invoiceId) : null,
        reconciliationNote: values.reconciliationNote || null,
        note: values.note || null,
        date: values.date ? new Date(values.date).toISOString() : new Date().toISOString(),
        createdById: 1, // TODO: Get from auth context
        companyId: companyId || undefined
      };

      // Remove undefined/null companyId if not needed
      if (!payload.companyId) {
        delete payload.companyId;
      }

      console.log('Payload to send:', payload);

      if (values.id) {
        await updateMut.mutateAsync({ id: values.id, payload });
      } else {
        await createMut.mutateAsync(payload);
      }
    } catch (err) {
      console.error('Submit error:', err);
      // Error is handled by mutation onError
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
      subcategory: t.subcategory?.name,
      invoice: t.invoice?.invoiceNumber || 'N/A',
      note: t.note,
      reconciliationNote: t.reconciliationNote
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

  const filteredTransactions = (data?.transactions || []).filter(tx => {
    const matchesSearch = 
      tx.note?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      tx.category?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      tx.subcategory?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      tx.invoice?.invoiceNumber?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesType = typeFilter === 'all' || tx.type?.toLowerCase() === typeFilter.toLowerCase();
    
    return matchesSearch && matchesType;
  });

  if (error) console.error('Transactions fetch error', error);

  return (
    <div className="space-y-6 animate-in fade-in-0 duration-500">
      <Card className="bg-gradient-to-r from-blue-500 via-blue-600 to-teal-500 text-white shadow-xl">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Receipt className="h-8 w-8" />
              <div>
                <CardTitle className="text-2xl font-bold">Transactions</CardTitle>
                <p className="text-blue-100 text-sm mt-1">Manage and track all your expenses</p>
              </div>
            </div>
            <div className="flex gap-3">
              <Button 
                onClick={openCreate} 
                className="bg-white text-blue-600 hover:bg-blue-50 shadow-lg"
              >
                <Plus className="h-4 w-4 mr-2" />
                New Transaction
              </Button>
              <Button 
                variant="outline" 
                onClick={onExport}
                className="bg-white/10 text-white border-white/20 hover:bg-white/20"
              >
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      <Card className="shadow-lg border-0">
        <CardHeader>
          <div className="flex items-center gap-4 flex-wrap">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search transactions..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex items-center gap-2">
              <Label className="text-sm font-medium">Filter:</Label>
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="h-10 px-3 rounded-md border border-input bg-background text-sm"
              >
                <option value="all">All Types</option>
                <option value="credit">Credit</option>
                <option value="debit">Debit</option>
              </select>
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
                      <th className="text-left py-4 px-4 font-semibold text-sm">Date</th>
                      <th className="text-left py-4 px-4 font-semibold text-sm">Type</th>
                      <th className="text-left py-4 px-4 font-semibold text-sm">Amount</th>
                      <th className="text-left py-4 px-4 font-semibold text-sm">Category</th>
                      <th className="text-left py-4 px-4 font-semibold text-sm">Subcategory</th>
                      <th className="text-left py-4 px-4 font-semibold text-sm">Invoice</th>
                      <th className="text-left py-4 px-4 font-semibold text-sm">Note</th>
                      <th className="text-left py-4 px-4 font-semibold text-sm">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredTransactions.length === 0 ? (
                      <tr>
                        <td colSpan="8" className="text-center py-12 text-muted-foreground">
                          No transactions found
                        </td>
                      </tr>
                    ) : (
                      filteredTransactions.map(tx => (
                        <tr key={tx.id} className="border-b hover:bg-muted/50 transition-colors">
                          <td className="py-4 px-4">
                            <div className="flex items-center gap-2">
                              <Calendar className="h-4 w-4 text-muted-foreground" />
                              <span>{dayjs(tx.date).format('MMM DD, YYYY')}</span>
                            </div>
                          </td>
                          <td className="py-4 px-4">
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
                          <td className="py-4 px-4">
                            <div className="flex items-center gap-2">
                              <IndianRupee className="h-4 w-4 text-muted-foreground" />
                              <span className="font-bold text-lg">
                                {formatCurrency(tx.amount)}
                              </span>
                            </div>
                          </td>
                          <td className="py-4 px-4">
                            <div className="flex items-center gap-2">
                              <Tag className="h-4 w-4 text-muted-foreground" />
                              <span>{tx.category?.name || 'Uncategorized'}</span>
                            </div>
                          </td>
                          <td className="py-4 px-4">
                            <span className="text-muted-foreground">
                              {tx.subcategory?.name || '-'}
                            </span>
                          </td>
                          <td className="py-4 px-4">
                            {tx.invoice ? (
                              <div className="flex items-center gap-2">
                                <FileText className="h-4 w-4 text-blue-600" />
                                <span className="text-sm">{tx.invoice.invoiceNumber}</span>
                              </div>
                            ) : (
                              <span className="text-muted-foreground text-sm">-</span>
                            )}
                          </td>
                          <td className="py-4 px-4 text-muted-foreground">
                            {tx.note || tx.reconciliationNote || '-'}
                          </td>
                          <td className="py-4 px-4">
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

      {/* Transaction Form Modal */}
      <Modal 
        open={open} 
        onClose={() => { setOpen(false); reset(); }} 
        title={watch('id') ? "Edit Transaction" : "New Transaction"}
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-sm font-semibold">Type *</Label>
              <select 
                {...register('type', { required: true })} 
                className="w-full h-11 px-3 rounded-md border border-input bg-background"
              >
                <option value="DEBIT">Debit</option>
                <option value="CREDIT">Credit</option>
              </select>
              {errors.type && <p className="text-xs text-red-500">Type is required</p>}
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-semibold">Amount *</Label>
              <Controller
                name="amount"
                control={control}
                rules={{ 
                  required: 'Amount is required', 
                  min: { value: 0.01, message: 'Amount must be greater than 0' }
                }}
                render={({ field }) => (
                  <AmountInput
                    value={field.value}
                    onChange={(e) => {
                      const numValue = e.target.valueAsNumber || parseFloat(e.target.value) || 0;
                      field.onChange(numValue);
                    }}
                    className="h-11"
                    placeholder="0.00"
                  />
                )}
              />
              {errors.amount && <p className="text-xs text-red-500">{errors.amount.message}</p>}
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-semibold">Date *</Label>
            <Input 
              type="date" 
              {...register('date', { required: true })} 
              className="h-11"
            />
            {errors.date && <p className="text-xs text-red-500">Date is required</p>}
          </div>

          {/* Category and Subcategory - Show for both DEBIT and CREDIT */}
          {(selectedType === 'DEBIT' || selectedType === 'CREDIT') && (
            <>
              <div className="space-y-2">
                <Label className="text-sm font-semibold">Category *</Label>
                <select 
                  {...register('categoryId', { required: true, valueAsNumber: true })} 
                  className="w-full h-11 px-3 rounded-md border border-input bg-background"
                  onChange={(e) => {
                    setValue('categoryId', e.target.value);
                    setValue('subcategoryId', ''); // Reset subcategory when category changes
                  }}
                >
                  <option value="">Select category</option>
                  {topLevelCategories.map(cat => (
                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                  ))}
                </select>
                {errors.categoryId && <p className="text-xs text-red-500">Category is required</p>}
              </div>

              {selectedCategoryId && subcategories.length > 0 && (
                <div className="space-y-2">
                  <Label className="text-sm font-semibold">Subcategory (Optional)</Label>
                  <select 
                    {...register('subcategoryId', { valueAsNumber: true })} 
                    className="w-full h-11 px-3 rounded-md border border-input bg-background"
                  >
                    <option value="">None</option>
                    {subcategories.map(sub => (
                      <option key={sub.id} value={sub.id}>{sub.name}</option>
                    ))}
                  </select>
                </div>
              )}
            </>
          )}

          {/* For CREDIT: Ask Cash or Invoice */}
          {selectedType === 'CREDIT' && (
            <>
              <div className="space-y-2">
                <Label className="text-sm font-semibold">Payment Source *</Label>
                <select 
                  {...register('creditSource', { required: true })} 
                  className="w-full h-11 px-3 rounded-md border border-input bg-background"
                  onChange={(e) => {
                    setValue('creditSource', e.target.value);
                    if (e.target.value === 'cash') {
                      setValue('invoiceId', '');
                    }
                  }}
                >
                  <option value="cash">Cash Sale</option>
                  <option value="invoice">Invoice Payment</option>
                </select>
              </div>

              {creditSource === 'invoice' && (
                <>
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold">Select Invoice *</Label>
                    {isAllInvoicesLoading ? (
                      <Input placeholder="Loading invoices..." disabled className="h-11" />
                    ) : (
                      <select
                        {...register('invoiceId', { 
                          required: creditSource === 'invoice' ? 'Invoice is required' : false,
                          valueAsNumber: true 
                        })}
                        className="w-full h-11 px-3 rounded-md border border-input bg-background"
                      >
                        <option value="">Select an invoice</option>
                        {allInvoices.map(invoice => (
                          <option key={invoice.id} value={invoice.id}>
                            {invoice.invoiceNumber} - {invoice.clientName || 'N/A'} 
                            {invoice.expectedAmount && ` (${formatCurrency(invoice.expectedAmount)})`}
                            {invoice.balanceDue && ` - Balance: ${formatCurrency(invoice.balanceDue)}`}
                          </option>
                        ))}
                      </select>
                    )}
                    {errors.invoiceId && <p className="text-xs text-red-500">{errors.invoiceId.message}</p>}
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm font-semibold">Reconciliation Note</Label>
                    <Input 
                      {...register('reconciliationNote')} 
                      placeholder="CA correction/leftover note"
                      className="h-11"
                    />
                  </div>
                </>
              )}
            </>
          )}

          <div className="space-y-2">
            <Label className="text-sm font-semibold">Note</Label>
            <Input 
              {...register('note')} 
              placeholder="Transaction note"
              className="h-11"
            />
          </div>

          <div className="flex gap-3 pt-4 border-t">
            <Button 
              type="submit" 
              className="flex-1 bg-gradient-primary text-white h-11"
              disabled={createMut.isPending || updateMut.isPending}
            >
              {createMut.isPending || updateMut.isPending ? (
                <>Creating...</>
              ) : (
                <>{watch('id') ? 'Update' : 'Create'} Transaction</>
              )}
            </Button>
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => { setOpen(false); reset(); }}
              className="h-11 min-w-[100px]"
              disabled={createMut.isPending || updateMut.isPending}
            >
              Cancel
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
