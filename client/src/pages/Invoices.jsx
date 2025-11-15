import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../api/axios';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import Modal from '../components/Modal';
import {
  Plus, Edit, Trash2, Search,
  FileText, Calendar, IndianRupee, User,
  CheckCircle, XCircle, AlertCircle,
  CreditCard,
  RefreshCw,
  AlertTriangle,
  Download,
  FileSpreadsheet,
  Eye,
  ArrowRight,
  Tag
} from 'lucide-react';
import { toast } from 'sonner';
import dayjs from 'dayjs';
import { cn } from '@/lib/utils';
import { AmountInput } from '@/components/ui/AmountInput';
import { formatCurrency } from '@/lib/formatNumber';
import * as XLSX from 'xlsx';
import Papa from 'papaparse';

async function fetchCategories() {
  const res = await api.get('/categories', { params: { includeAll: true } });
  return res.data ?? [];
}

async function fetchInvoices() {
  const res = await api.get('/invoices');
  return res.data ?? [];
}

async function fetchOpenInvoices() {
  const res = await api.get('/invoices/open');
  return res.data ?? [];
}

async function fetchInvoiceById(id) {
  const res = await api.get(`/invoices/${id}`);
  return res.data;
}

export default function Invoices() {
  const [viewMode, setViewMode] = useState('all'); // 'all' or 'open'
  const [searchTerm, setSearchTerm] = useState('');
  const [modal, setModal] = useState({ open: false, invoice: null });
  const [detailModal, setDetailModal] = useState({ open: false, invoiceId: null });
  const qc = useQueryClient();

  const [deleteModal, setDeleteModal] = useState({ open: false, id: null });

  // Payment modal state
  const [paymentModal, setPaymentModal] = useState({ open: false, invoice: null });
  const [paymentFormData, setPaymentFormData] = useState({
    amount: '',
    date: dayjs().format('YYYY-MM-DD'),
    categoryId: '',
    subcategoryId: '',
    note: ''
  });

  const { data: invoices = [], isLoading } = useQuery({
    queryKey: ['invoices', viewMode],
    queryFn: viewMode === 'open' ? fetchOpenInvoices : fetchInvoices
  });

  // Fetch invoice details when detail modal opens
  const { data: invoiceDetails, isLoading: isLoadingDetails } = useQuery({
    queryKey: ['invoiceDetails', detailModal.invoiceId],
    queryFn: () => fetchInvoiceById(detailModal.invoiceId),
    enabled: !!detailModal.invoiceId && detailModal.open
  });

  // categories query
  const { data: categories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: fetchCategories
  });

  const createMut = useMutation({
    mutationFn: payload => api.post('/invoices', payload).then(r => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['invoices'] });
      toast.success('Invoice created successfully');
      setModal({ open: false, invoice: null });
    },
    onError: (err) => toast.error(err?.response?.data?.error || 'Failed to create invoice')
  });

  const updateMut = useMutation({
    mutationFn: ({ id, payload }) => api.patch(`/invoices/${id}`, payload).then(r => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['invoices'] });
      qc.invalidateQueries({ queryKey: ['invoiceDetails'] });
      toast.success('Invoice updated successfully');
      setModal({ open: false, invoice: null });
    },
    onError: (err) => toast.error(err?.response?.data?.error || 'Failed to update invoice')
  });

  const deleteMut = useMutation({
    mutationFn: id => api.delete(`/invoices/${id}`).then(r => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['invoices'] });
      toast.success('Invoice deleted successfully');
      setDeleteModal({ open: false, id: null }); 
    },
    onError: () => toast.error('Failed to delete invoice')
  });

  // create payment mutation
  const createPaymentMut = useMutation({
    mutationFn: payload => api.post('/transactions', payload).then(r => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['invoices'] });
      qc.invalidateQueries({ queryKey: ['invoiceDetails'] });
      qc.invalidateQueries({ queryKey: ['transactions'] });
      toast.success('Payment recorded successfully');
      setPaymentModal({ open: false, invoice: null });
    },
    onError: (err) => toast.error(err?.response?.data?.error || 'Failed to record payment')
  });

  // Sync invoices mutation
  const syncMut = useMutation({
    mutationFn: () => api.post('/invoices/sync'),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['invoices'] });
      toast.success('Invoices synced successfully');
    },
    onError: (err) => toast.error(err?.response?.data?.error || 'Failed to sync invoices')
  });

  const [formData, setFormData] = useState({
    invoiceNumber: '',
    expectedAmount: '',
    clientName: '',
    dueDate: ''
  });

  function openCreate() {
    setFormData({
      invoiceNumber: '',
      expectedAmount: '',
      clientName: '',
      dueDate: ''
    });
    setModal({ open: true, invoice: null });
  }

  function openEdit(invoice) {
    setFormData({
      invoiceNumber: invoice.invoiceNumber,
      expectedAmount: Number(invoice.expectedAmount),
      clientName: invoice.clientName || '',
      dueDate: invoice.dueDate ? dayjs(invoice.dueDate).format('YYYY-MM-DD') : ''
    });
    setModal({ open: true, invoice });
  }

  function openDetail(invoiceId) {
    setDetailModal({ open: true, invoiceId });
  }

  function closeDetail() {
    setDetailModal({ open: false, invoiceId: null });
  }

  function handlePaymentClick(invoice) {
    const balanceDue = Number(invoice.balanceDue || 0);
    setPaymentFormData({
      amount: balanceDue > 0 ? String(balanceDue) : String(Number(invoice.expectedAmount || 0)),
      date: dayjs().format('YYYY-MM-DD'),
      categoryId: '',
      subcategoryId: '',
      note: ''
    });
    setPaymentModal({ open: true, invoice });
  }

  function handleSubmit(e) {
    e.preventDefault();
    const payload = {
      ...formData,
      expectedAmount: Number(formData.expectedAmount)
    };

    if (modal.invoice) {
      updateMut.mutate({ id: modal.invoice.id, payload });
    } else {
      createMut.mutate(payload);
    }
  }

  function handlePaymentSubmit(e) {
    e.preventDefault();
    if (!paymentFormData.categoryId) {
      toast.error('Please select a category');
      return;
    }

    const payload = {
      ...paymentFormData,
      type: 'CREDIT',
      amount: Number(paymentFormData.amount),
      categoryId: Number(paymentFormData.categoryId),
      subcategoryId: paymentFormData.subcategoryId ? Number(paymentFormData.subcategoryId) : null,
      invoiceId: paymentModal.invoice?.id ?? null,
      createdById: 1 // TODO: replace with actual user id
    };

    createPaymentMut.mutate(payload);
  }

  function onDelete(id) {
    setDeleteModal({ open: true, id: id });
  }

  function handleConfirmDelete() {
    if (deleteModal.id) {
      deleteMut.mutate(deleteModal.id);
    }
  }

  function onExportCSV() {
    const rows = filteredInvoices.map(inv => ({
      'Invoice Number': inv.invoiceNumber,
      'Client Name': inv.clientName || '-',
      'Expected Amount': Number(inv.expectedAmount),
      'Total Paid': Number(inv.totalPaid || 0),
      'Balance Due': Number(inv.balanceDue || 0),
      'Due Date': inv.dueDate ? dayjs(inv.dueDate).format('YYYY-MM-DD') : '-',
      'Created At': dayjs(inv.createdAt).format('YYYY-MM-DD'),
      'Status': Number(inv.balanceDue || 0) <= 0 ? 'Paid' : 'Open'
    }));

    const csv = Papa.unparse(rows);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `invoices-${dayjs().format('YYYY-MM-DD')}-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('CSV exported successfully');
  }

  function onExportExcel() {
    try {
      // Prepare invoice data
      const invoiceRows = filteredInvoices.map(inv => ({
        'Invoice Number': inv.invoiceNumber,
        'Client Name': inv.clientName || '-',
        'Expected Amount': Number(inv.expectedAmount),
        'Total Paid': Number(inv.totalPaid || 0),
        'Balance Due': Number(inv.balanceDue || 0),
        'Due Date': inv.dueDate ? dayjs(inv.dueDate).format('YYYY-MM-DD') : '-',
        'Created At': dayjs(inv.createdAt).format('YYYY-MM-DD'),
        'Status': Number(inv.balanceDue || 0) <= 0 ? 'Paid' : 'Open'
      }));

      // Create Summary Sheet
      const summaryData = [
        ['Invoice Export Summary'],
        [''],
        ['Export Date', dayjs().format('YYYY-MM-DD HH:mm:ss')],
        ['View Mode', viewMode === 'all' ? 'All Invoices' : 'Open Invoices'],
        ['Total Invoices', filteredInvoices.length],
        [''],
        ['Totals:'],
        ['Total Expected', formatCurrency(totalExpected)],
        ['Total Paid', formatCurrency(totalPaid)],
        ['Total Balance Due', formatCurrency(totalDue)],
        [''],
        ['Invoice Details:']
      ];

      // Add headers
      summaryData.push([
        'Invoice Number', 'Client Name', 'Expected Amount', 'Total Paid', 'Balance Due', 'Status'
      ]);

      // Add invoice rows to summary
      filteredInvoices.forEach(inv => {
        summaryData.push([
          inv.invoiceNumber,
          inv.clientName || '-',
          formatCurrency(inv.expectedAmount),
          formatCurrency(inv.totalPaid || 0),
          formatCurrency(inv.balanceDue || 0),
          Number(inv.balanceDue || 0) <= 0 ? 'Paid' : 'Open'
        ]);
      });

      // Create workbook
      const wb = XLSX.utils.book_new();

      // Create Summary sheet
      const wsSummary = XLSX.utils.aoa_to_sheet(summaryData);
      wsSummary['!cols'] = [
        { wch: 20 }, { wch: 30 }
      ];

      // Create Invoices sheet
      const wsInvoices = XLSX.utils.json_to_sheet(invoiceRows);
      wsInvoices['!cols'] = [
        { wch: 18 }, // Invoice Number
        { wch: 25 }, // Client Name
        { wch: 15 }, // Expected Amount
        { wch: 15 }, // Total Paid
        { wch: 15 }, // Balance Due
        { wch: 12 }, // Due Date
        { wch: 12 }, // Created At
        { wch: 10 }  // Status
      ];

      // Merge title cell in Summary
      if (!wsSummary['!merges']) wsSummary['!merges'] = [];
      wsSummary['!merges'].push({ s: { r: 0, c: 0 }, e: { r: 0, c: 1 } });

      // Add sheets to workbook
      XLSX.utils.book_append_sheet(wb, wsSummary, 'Summary');
      XLSX.utils.book_append_sheet(wb, wsInvoices, 'Invoices');

      // Generate Excel file
      const fileName = `invoices-${dayjs().format('YYYY-MM-DD')}-${Date.now()}.xlsx`;
      XLSX.writeFile(wb, fileName);
      
      toast.success('Excel file exported successfully!');
    } catch (error) {
      console.error('Excel export error:', error);
      toast.error('Failed to export Excel file');
    }
  }

  const filteredInvoices = invoices.filter(inv =>
    (inv.invoiceNumber || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (inv.clientName || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalExpected = filteredInvoices.reduce((sum, inv) => sum + Number(inv.expectedAmount || 0), 0);
  const totalPaid = filteredInvoices.reduce((sum, inv) => sum + Number(inv.totalPaid || 0), 0);
  const totalDue = filteredInvoices.reduce((sum, inv) => sum + Number(inv.balanceDue || 0), 0);

  const topLevelCategories = categories.filter(cat => !cat.parentId);
  const subcategories = paymentFormData.categoryId
    ? categories.filter(cat => cat.parentId === Number(paymentFormData.categoryId))
    : [];

  // Calculate payment details for invoice detail modal
  const paymentDetails = invoiceDetails?.payments || [];
  const sortedPayments = [...paymentDetails].sort((a, b) => 
    new Date(b.date) - new Date(a.date)
  );

  return (
    <div className="space-y-6 animate-in fade-in-0 duration-500">
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-purple-500 via-purple-600 to-pink-500 p-8 shadow-xl">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4xIj48Y2lyY2xlIGN4PSIzMCIgY3k9IjMwIiByPSIyIi8+PC9nPjwvZz48L3N2Zz4=')] opacity-20" />
        <div className="relative flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-4xl font-bold text-white mb-2 flex items-center gap-3">
              <FileText className="w-8 h-8" />
              Invoices
            </h1>
            <p className="text-purple-100 text-lg">
              Manage invoices and track payments
            </p>
          </div>
          
          <div className="flex items-center gap-3 flex-wrap">
            <Button
              variant="outline"
              onClick={onExportCSV}
              className="bg-white/10 text-white border-white/30 hover:bg-white/20"
            >
              <Download className="w-4 h-4 mr-2" />
              Export CSV
            </Button>
            <Button
              variant="outline"
              onClick={onExportExcel}
              className="bg-white/10 text-white border-white/30 hover:bg-white/20"
            >
              <FileSpreadsheet className="w-4 h-4 mr-2" />
              Export Excel
            </Button>
            <Button
              onClick={() => syncMut.mutate()}
              variant="outline"
              className="bg-white/10 text-white border-white/30 hover:bg-white/20 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105"
              size="lg"
              disabled={syncMut.isLoading}
            >
              {syncMut.isLoading ? (
                <RefreshCw className="w-5 h-5 mr-2 animate-spin" />
              ) : (
                <RefreshCw className="w-5 h-5 mr-2" />
              )}
              {syncMut.isLoading ? 'Syncing...' : 'Sync'}
            </Button>

            <Button
              onClick={openCreate}
              className="bg-white text-purple-600 hover:bg-white/90 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105"
              size="lg"
            >
              <Plus className="w-5 h-5 mr-2" />
              New Invoice
            </Button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="shadow-lg border-0 bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Total Expected</p>
                <p className="text-2xl font-bold">{formatCurrency(totalExpected)}</p>
              </div>
              <IndianRupee  className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-lg border-0 bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Total Paid</p>
                <p className="text-2xl font-bold">{formatCurrency(totalPaid)}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-lg border-0 bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-900/20 dark:to-orange-800/20">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Balance Due</p>
                <p className="text-2xl font-bold">{formatCurrency(totalDue)}</p>
              </div>
              <AlertCircle className="h-8 w-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>
      </div>


      <Card className="shadow-xl border-0 bg-gradient-to-br from-white to-purple-50/30 dark:from-gray-900 dark:to-gray-800">
        <CardHeader>
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
            <div className="flex gap-2">
              <Button
                variant={viewMode === 'all' ? 'default' : 'outline'}
                onClick={() => setViewMode('all')}
                className={viewMode === 'all' ? 'bg-gradient-primary text-white' : ''}
              >
                All Invoices
              </Button>
              <Button
                variant={viewMode === 'open' ? 'default' : 'outline'}
                onClick={() => setViewMode('open')}
                className={viewMode === 'open' ? 'bg-gradient-primary text-white' : ''}
              >
                Open Invoices
              </Button>
            </div>
            <div className="relative flex-1 max-w-md w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search invoices..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 h-11"
              />
            </div>
          </div>
        </CardHeader>

        <CardContent>
          {isLoading ? (
            <div className="text-center py-20">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary mb-4" />
              <p className="text-muted-foreground">Loading invoices...</p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredInvoices.length === 0 ? (
                <div className="text-center py-16 text-muted-foreground">
                  <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p className="text-lg">No invoices found</p>
                </div>
              ) : (
                filteredInvoices.map(invoice => {
                  const balanceDue = Number(invoice.balanceDue || 0);
                  const isPaid = balanceDue <= 0;
                  const progress = (Number(invoice.totalPaid || 0) / Number(invoice.expectedAmount || 1)) * 100;

                  return (
                    <div
                      key={invoice.id}
                      className="group relative overflow-hidden rounded-xl border bg-card hover:shadow-lg transition-all duration-300 cursor-pointer"
                      onClick={() => openDetail(invoice.id)}
                    >
                      <div className="p-6">
                        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                          <div className="flex-1 space-y-3">
                            <div className="flex items-center gap-3">
                              <div className={cn(
                                "h-12 w-12 rounded-lg flex items-center justify-center",
                                isPaid
                                  ? "bg-gradient-to-br from-green-500 to-green-600"
                                  : "bg-gradient-to-br from-orange-500 to-orange-600"
                              )}>
                                {isPaid ? (
                                  <CheckCircle className="h-6 w-6 text-white" />
                                ) : (
                                  <AlertCircle className="h-6 w-6 text-white" />
                                )}
                              </div>
                              <div>
                                <h3 className="text-xl font-bold">{invoice.invoiceNumber}</h3>
                                {invoice.clientName && (
                                  <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                                    <User className="h-4 w-4" />
                                    {invoice.clientName}
                                  </div>
                                )}
                              </div>
                            </div>

                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                              <div>
                                <p className="text-xs text-muted-foreground mb-1">Expected</p>
                                <p className="font-semibold">{formatCurrency(invoice.expectedAmount)}</p>
                              </div>
                              <div>
                                <p className="text-xs text-muted-foreground mb-1">Paid</p>
                                <p className="font-semibold text-green-600">
                                  {formatCurrency(invoice.totalPaid || 0)}
                                </p>
                              </div>
                              <div>
                                <p className="text-xs text-muted-foreground mb-1">Due</p>
                                <p className={cn(
                                  "font-semibold",
                                  balanceDue > 0 ? "text-orange-600" : "text-green-600"
                                )}>
                                  {formatCurrency(balanceDue)}
                                </p>
                              </div>
                              <div>
                                <p className="text-xs text-muted-foreground mb-1">Progress</p>
                                <div className="flex items-center gap-2">
                                  <div className="flex-1 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                                    <div
                                      className={cn(
                                        "h-full transition-all",
                                        isPaid ? "bg-green-500" : "bg-orange-500"
                                      )}
                                      style={{ width: `${Math.min(100, progress)}%` }}
                                    />
                                  </div>
                                  <span className="font-medium text-xs">{progress.toFixed(0)}%</span>
                                </div>
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                openDetail(invoice.id);
                              }}
                              className="hover:bg-blue-50"
                            >
                              <Eye className="h-4 w-4 mr-2" />
                              View Details
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                openEdit(invoice);
                              }}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                onDelete(invoice.id);
                              }}
                              className="text-destructive hover:text-destructive"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Invoice Detail Modal */}
      <Modal
        open={detailModal.open}
        onClose={closeDetail}
        title={invoiceDetails ? `Invoice Details - ${invoiceDetails.invoiceNumber}` : 'Invoice Details'}
        size="large"
      >
        {isLoadingDetails ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto" />
            <p className="text-muted-foreground mt-4">Loading invoice details...</p>
          </div>
        ) : invoiceDetails ? (
          <div className="space-y-6">
            {/* Invoice Summary */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-gradient-to-br from-blue-50 to-teal-50 dark:from-blue-900/20 dark:to-teal-900/20 rounded-lg">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Invoice Number</p>
                <p className="text-lg font-bold">{invoiceDetails.invoiceNumber}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-1">Client Name</p>
                <p className="text-lg font-semibold">{invoiceDetails.clientName || 'N/A'}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-1">Expected Amount</p>
                <p className="text-xl font-bold text-blue-600">{formatCurrency(invoiceDetails.expectedAmount)}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-1">Due Date</p>
                <p className="text-lg font-medium">
                  {invoiceDetails.dueDate ? dayjs(invoiceDetails.dueDate).format('MMM DD, YYYY') : 'Not set'}
                </p>
              </div>
            </div>

            {/* Payment Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card className="border-0 shadow-md">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Total Paid</p>
                      <p className="text-xl font-bold text-green-600">
                        {formatCurrency(invoiceDetails.totalPaid || 0)}
                      </p>
                    </div>
                    <CheckCircle className="h-8 w-8 text-green-600" />
                  </div>
                </CardContent>
              </Card>

              <Card className="border-0 shadow-md">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Balance Due</p>
                      <p className={cn(
                        "text-xl font-bold",
                        Number(invoiceDetails.balanceDue || 0) > 0 ? "text-orange-600" : "text-green-600"
                      )}>
                        {formatCurrency(invoiceDetails.balanceDue || 0)}
                      </p>
                    </div>
                    {Number(invoiceDetails.balanceDue || 0) > 0 ? (
                      <AlertCircle className="h-8 w-8 text-orange-600" />
                    ) : (
                      <CheckCircle className="h-8 w-8 text-green-600" />
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card className="border-0 shadow-md">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Payment Progress</p>
                      <p className="text-xl font-bold">
                        {Math.round((Number(invoiceDetails.totalPaid || 0) / Number(invoiceDetails.expectedAmount || 1)) * 100)}%
                      </p>
                    </div>
                    <div className="h-12 w-12 rounded-full bg-gradient-to-br from-blue-500 to-teal-500 flex items-center justify-center">
                      <CreditCard className="h-6 w-6 text-white" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Payment History */}
            <div>
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                Payment History ({sortedPayments.length} payments)
              </h3>
              {sortedPayments.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground border border-dashed rounded-lg">
                  <CreditCard className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>No payments recorded yet</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {sortedPayments.map((payment, index) => (
                    <Card key={payment.id} className="border-0 shadow-sm">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <div className="h-10 w-10 rounded-full bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center">
                              <span className="text-white font-bold text-sm">{index + 1}</span>
                            </div>
                            <div>
                              <div className="flex items-center gap-2 mb-1">
                                <Calendar className="h-4 w-4 text-muted-foreground" />
                                <span className="font-medium">
                                  {dayjs(payment.date).format('MMM DD, YYYY')}
                                </span>
                              </div>
                              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <Tag className="h-3 w-3" />
                                <span>{payment.category?.name || 'N/A'}</span>
                                {payment.subcategory && (
                                  <>
                                    <ArrowRight className="h-3 w-3" />
                                    <span>{payment.subcategory.name}</span>
                                  </>
                                )}
                              </div>
                              {payment.note && (
                                <p className="text-xs text-muted-foreground mt-1">{payment.note}</p>
                              )}
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-xl font-bold text-green-600">
                              {formatCurrency(payment.amount)}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              by {payment.createdBy?.name || 'Unknown'}
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 pt-4 border-t">
              <Button
                onClick={() => {
                  closeDetail();
                  handlePaymentClick(invoiceDetails);
                }}
                className="flex-1 bg-gradient-primary text-white"
                disabled={Number(invoiceDetails.balanceDue || 0) <= 0}
              >
                <CreditCard className="h-4 w-4 mr-2" />
                Record Payment
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  closeDetail();
                  openEdit(invoiceDetails);
                }}
                className="flex-1"
              >
                <Edit className="h-4 w-4 mr-2" />
                Edit Invoice
              </Button>
            </div>
          </div>
        ) : (
          <div className="text-center py-12 text-muted-foreground">
            Invoice not found
          </div>
        )}
      </Modal>

      {/* Create/Edit Modal */}
      <Modal
        open={modal.open}
        onClose={() => setModal({ open: false, invoice: null })}
        title={modal.invoice ? "Edit Invoice" : "Create New Invoice"}
      >
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* ... (form inputs) ... */}
          <div className="space-y-2">
            <Label className="text-sm font-semibold">Invoice Number *</Label>
            <Input
              value={formData.invoiceNumber}
              onChange={(e) => setFormData({ ...formData, invoiceNumber: e.target.value })}
              placeholder="e.g., INV-2025-001"
              required
              className="h-11"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-sm font-semibold">Expected Amount *</Label>
            <AmountInput
              value={formData.expectedAmount}
              onChange={(e) => {
                const numValue = e.target.valueAsNumber || parseFloat(e.target.value) || 0;
                setFormData({ ...formData, expectedAmount: numValue });
              }}
              className="h-11"
              placeholder="0.00"
              required
            />
          </div>
          <div className="space-y-2">
            <Label className="text-sm font-semibold">Client Name</Label>
            <Input
              value={formData.clientName}
              onChange={(e) => setFormData({ ...formData, clientName: e.target.value })}
              placeholder="Client name"
              className="h-11"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-sm font-semibold">Due Date</Label>
            <Input
              type="date"
              value={formData.dueDate}
              onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
              className="h-11"
            />
          </div>
          <div className="flex gap-3 pt-4 border-t">
            <Button
              type="submit"
              className="flex-1 bg-gradient-primary text-white hover:opacity-90 h-11 shadow-lg"
              disabled={createMut.isLoading || updateMut.isLoading}
            >
              {createMut.isLoading || updateMut.isLoading ? "Saving..." : "Save"}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => setModal({ open: false, invoice: null })}
              className="h-11"
            >
              Cancel
            </Button>
          </div>
        </form>
      </Modal>

      {/* Payment Modal */}
      <Modal
        open={paymentModal.open}
        onClose={() => setPaymentModal({ open: false, invoice: null })}
        title={`Record Payment for ${paymentModal.invoice?.invoiceNumber}`}
      >
        <form onSubmit={handlePaymentSubmit} className="space-y-5">
          {/* ... (form inputs) ... */}
          <div className="space-y-2">
            <Label className="text-sm font-semibold">Amount Received *</Label>
            <AmountInput
              value={paymentFormData.amount}
              onChange={(e) => {
                const numValue = e.target.valueAsNumber || parseFloat(e.target.value) || 0;
                setPaymentFormData({ ...paymentFormData, amount: numValue });
              }}
              className="h-11"
              placeholder="0.00"
              required
            />
          </div>
          <div className="space-y-2">
            <Label className="text-sm font-semibold">Date *</Label>
            <Input
              type="date"
              value={paymentFormData.date}
              onChange={(e) => setPaymentFormData({ ...paymentFormData, date: e.target.value })}
              required
              className="h-11"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-sm font-semibold">Category *</Label>
            <Select
              value={paymentFormData.categoryId}
              onValueChange={(value) => setPaymentFormData({ ...paymentFormData, categoryId: value, subcategoryId: '' })}
            >
              <SelectTrigger className="h-11">
                <SelectValue placeholder="Select a category" />
              </SelectTrigger>
              <SelectContent>
                {topLevelCategories.map(cat => (
                  <SelectItem key={cat.id} value={String(cat.id)}>{cat.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {subcategories.length > 0 && (
            <div className="space-y-2">
              <Label className="text-sm font-semibold">Subcategory</Label>
              <Select
                value={paymentFormData.subcategoryId}
                onValueChange={(value) => setPaymentFormData({ ...paymentFormData, subcategoryId: value })}
              >
                <SelectTrigger className="h-11">
                  <SelectValue placeholder="Select a subcategory (optional)" />
                </SelectTrigger>
                <SelectContent>
                  {subcategories.map(sub => (
                    <SelectItem key={sub.id} value={String(sub.id)}>{sub.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <div className="space-y-2">
            <Label className="text-sm font-semibold">Note</Label>
            <Input
              value={paymentFormData.note}
              onChange={(e) => setPaymentFormData({ ...paymentFormData, note: e.target.value })}
              placeholder="e.g., Partial payment"
              className="h-11"
            />
          </div>
          <div className="flex gap-3 pt-4 border-t">
            <Button
              type="submit"
              className="flex-1 bg-gradient-primary text-white hover:opacity-90 h-11 shadow-lg"
              disabled={createPaymentMut.isLoading}
            >
              {createPaymentMut.isLoading ? "Saving..." : "Record Payment"}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => setPaymentModal({ open: false, invoice: null })}
              className="h-11"
            >
              Cancel
            </Button>
          </div>
        </form>
      </Modal>

      {/* --- MODIFIED SECTION --- */}
      {/* Delete Confirmation Modal */}
      <Modal
        open={deleteModal.open}
        onClose={() => setDeleteModal({ open: false, id: null })}
        title="Confirm Deletion"
      >
        <div className="space-y-6">
          <div className="flex items-center gap-4">
            <div className="flex-shrink-0 w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center">
              <AlertTriangle className="w-6 h-6 text-destructive" />
            </div>
            <div>
              {/* This text is black/default, as requested */}
              <h3 className="text-lg font-semibold">Are you sure?</h3>
              <p className="text-sm text-muted-foreground">
                This action cannot be undone. This will permanently delete the invoice.
              </p>
            </div>
          </div>

          <div className="flex gap-3 pt-4 border-t">
            {/* This button is now styled just like your Categories.jsx example */}
            <Button
              type="button"
              className={cn(
                "flex-1 h-11 shadow-lg font-medium transition-all relative overflow-hidden",
                deleteMut.isLoading
                  ? "bg-gradient-to-r from-red-500 to-red-600 text-white cursor-wait"
                  : "bg-gradient-to-r from-red-500 via-red-600 to-red-700 text-white hover:from-red-600 hover:via-red-700 hover:to-red-800"
              )}
              disabled={deleteMut.isLoading}
              onClick={handleConfirmDelete}
            >
              {deleteMut.isLoading ? (
                <>
                  <div className="inline-block animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2" />
                  <span className="font-semibold">Deleting...</span>
                </>
              ) : (
                <>
                  <Trash2 className="w-4 h-4 mr-2" />
                  <span className="font-semibold">Delete</span>
                </>
              )}
            </Button>
            <Button
              type="button"
              variant="outline"
              className="h-11"
              onClick={() => setDeleteModal({ open: false, id: null })}
              disabled={deleteMut.isLoading} // --- Also disable cancel while deleting
            >
              Cancel
            </Button>
          </div>
        </div>
      </Modal>
      {/* --- END MODIFIED SECTION --- */}

    </div>
  );
}