import React, { useEffect, useState, useCallback, useMemo } from 'react';
import api from '../api';
import { useToast } from '../components/Toast';

function formatMoney(value) {
  const number = Number(value || 0)
  return 'LKR ' + number.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function formatDate(dateStr) {
  if (!dateStr) return '-'
  return new Date(dateStr).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
}

function getMonthsCovered(form) {
  if (form.billingCycle === 'yearly') return 12;
  if (!form.periodStart) return 1;
  if (!form.periodEnd) return 1;
  const [sy, sm] = form.periodStart.split('-').map(Number);
  const [ey, em] = form.periodEnd.split('-').map(Number);
  if (!sy || !sm || !ey || !em) return 1;
  const diff = (ey - sy) * 12 + (em - sm);
  return diff >= 0 ? diff + 1 : 1;
}

export default function SystemBilling() {
  const [billing, setBilling] = useState([]);
  const [payments, setPayments] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [systemStatus, setSystemStatus] = useState({ globalFee: 0, totalPaid: 0, remaining: 0, status: 'unpaid', ownerPackagePrice: null, yearlyPrice: null, yearlyDiscount: null });
  const { showToast, ToastComponent } = useToast();

  const [showPayModal, setShowPayModal] = useState(false);
  const [payForm, setPayForm] = useState({
    billingCycle: 'monthly',
    periodStart: new Date().toISOString().slice(0, 7),
    periodEnd: '',
    amount: '',
    method: 'bank',
    note: '',
    proofUrl: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [billingRes, paymentsRes, statusRes] = await Promise.all([
        api.get('/owner/billing'),
        api.get('/owner/payments'),
        api.get('/owner/status')
      ]);
      setBilling(billingRes.data?.data || []);
      setPayments(paymentsRes.data?.data || []);
      setSystemStatus(statusRes.data || { globalFee: 0, totalPaid: 0, remaining: 0, status: 'unpaid', ownerPackagePrice: null, yearlyPrice: null, yearlyDiscount: null });
    } catch (error) {
      console.error('Failed to fetch billing data', error);
      showToast('Failed to load billing data', 'error');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const promotionBills = billing.filter(b => b.isPromotion === 1);
  const regularBills = billing.filter(b => b.isPromotion !== 1);

  const monthlyPrice = Number(systemStatus.ownerPackagePrice != null ? systemStatus.ownerPackagePrice : systemStatus.globalFee);
  const baseYearlyPrice = Number(systemStatus.yearlyPrice != null ? systemStatus.yearlyPrice : monthlyPrice * 12);
  const yearlyDiscount = Number(systemStatus.yearlyDiscount || 0);
  const yearlyPrice = Math.max(0, baseYearlyPrice - yearlyDiscount);
  
  const handleOpenPayModal = () => {
    setPayForm(prev => ({
      ...prev,
      billingCycle: 'monthly',
      periodStart: new Date().toISOString().slice(0, 7),
      periodEnd: '',
      amount: String(systemStatus.remaining > 0 ? systemStatus.remaining : monthlyPrice)
    }));
    setShowPayModal(true);
  };

  const handleBillingCycleChange = (e) => {
    const cycle = e.target.value;
    setPayForm(prev => {
      const updated = { ...prev, billingCycle: cycle };
      if (cycle === 'yearly') {
        updated.amount = String(yearlyPrice);
      } else {
        const months = getMonthsCovered(updated);
        updated.amount = String(months * monthlyPrice);
      }
      return updated;
    });
  };

  const handleDateChange = (field, value) => {
    setPayForm(prev => {
      const updated = { ...prev, [field]: value };
      const months = getMonthsCovered(updated);
      updated.amount = String(months * monthlyPrice);
      return updated;
    });
  };

  const handlePaySubmit = async (e) => {
    e.preventDefault();
    if (!payForm.amount) return;
    
    setIsSubmitting(true);
    try {
      const months = getMonthsCovered(payForm);
      let notePrefix = payForm.billingCycle === 'yearly' ? '[Yearly] ' : `[Monthly (${months}m)] `;
      if (payForm.billingCycle === 'monthly') {
        notePrefix += `(${payForm.periodStart} to ${payForm.periodEnd || payForm.periodStart}) `;
      }
      await api.post('/owner/payments', {
        amount: Number(payForm.amount),
        method: payForm.method,
        note: (notePrefix + payForm.note).trim(),
        proofUrl: payForm.proofUrl
      });
      showToast('Payment submitted for approval', 'success');
      setShowPayModal(false);
      setPayForm({
        billingCycle: 'monthly',
        periodStart: new Date().toISOString().slice(0, 7),
        periodEnd: '',
        amount: '',
        method: 'bank',
        note: '',
        proofUrl: ''
      });
      fetchData();
    } catch (error) {
      showToast(error.response?.data?.message || 'Failed to submit payment', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const paymentBreakdown = useMemo(() => {
    if (payForm.billingCycle === 'yearly') {
      return {
        months: 12,
        basePrice: baseYearlyPrice,
        discount: yearlyDiscount,
        total: yearlyPrice
      };
    }
    const months = getMonthsCovered(payForm);
    return {
      months,
      basePrice: monthlyPrice,
      discount: 0,
      total: months * monthlyPrice
    };
  }, [payForm, baseYearlyPrice, yearlyDiscount, yearlyPrice, monthlyPrice]);

  return (
    <div className="p-4 md:p-8 bg-slate-50 min-h-full">
      <ToastComponent />
      <div className="mb-8">
        <h1 className="text-xl md:text-3xl font-black text-slate-800 tracking-tight">System Settlement History</h1>
        <p className="text-xs font-bold text-slate-400 mt-2 uppercase tracking-widest">
          View all platform fee invoices and your payment history
        </p>
      </div>

      <div className="grid gap-8">
        {/* Active Billing Records */}
        <section className="space-y-4">
          <h2 className="text-xs font-bold text-slate-900 uppercase tracking-widest ml-1">Billing Records</h2>
          <div className="grid gap-4">
            {isLoading && <div className="bg-white p-8 rounded-2xl text-center text-slate-400 font-medium">Loading...</div>}

            {!isLoading && billing.length === 0 && (
              <div className="bg-white p-6 md:p-8 rounded-[1.5rem] border border-slate-100 shadow-sm relative overflow-hidden">
                <div className="md:absolute md:top-0 md:right-0 p-4 md:p-8">
                  <span className={`text-[10px] font-black uppercase tracking-[0.2em] px-3 py-1 rounded-full ${
                    systemStatus.status === 'paid' ? 'bg-emerald-50 text-emerald-600' :
                    systemStatus.status === 'partial' ? 'bg-amber-50 text-amber-600' : 'bg-rose-50 text-rose-600'
                  }`}>
                    {systemStatus.status === 'paid' ? 'Paid & Up-to-date' :
                     systemStatus.status === 'partial' ? 'Pending Approval' : 'Settlement Required'}
                  </span>
                </div>
                <div className="mt-2 md:mt-0">
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">
                    Platform Usage Fee ({systemStatus.monthName || ''})
                  </p>
                  <h3 className="text-xl md:text-3xl font-black text-slate-900 mb-6">{formatMoney(systemStatus.globalFee)}</h3>
                  <div className="space-y-3 max-w-sm">
                    <div className="flex justify-between items-center text-xs font-bold uppercase tracking-widest">
                      <span className="text-slate-400">Total Submitted</span>
                      <span className="text-blue-600">{formatMoney((systemStatus.approvedPaid || 0) + (systemStatus.pendingPaid || 0))}</span>
                    </div>
                    <div className="h-1.5 w-full bg-slate-50 rounded-full overflow-hidden">
                      <div className={`h-full transition-all duration-1000 ${
                        systemStatus.status === 'paid' ? 'bg-emerald-500' :
                        systemStatus.status === 'partial' ? 'bg-amber-500' : 'bg-rose-500'
                      }`} style={{ width: `${Math.min((((systemStatus.approvedPaid || 0) + (systemStatus.pendingPaid || 0)) / (systemStatus.globalFee || 1)) * 100, 100)}%` }} />
                    </div>
                    <div className="flex justify-between items-center text-xs font-bold uppercase tracking-widest">
                      <span className="text-slate-400">Remaining Balance Due</span>
                      <span className="text-rose-600 font-black">{formatMoney(systemStatus.remaining)}</span>
                    </div>
                  </div>
                  
                  <div className="mt-6 pt-6 border-t border-slate-100 flex gap-3">
                    <button onClick={handleOpenPayModal} className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 rounded-xl transition-all shadow-sm shadow-emerald-200 uppercase tracking-widest text-xs">
                      Make Payment
                    </button>
                  </div>
                </div>
              </div>
            )}

            {regularBills.map(bill => (
              <div key={bill.id} className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-6 flex flex-col items-end gap-2">
                  <span className={`text-[10px] font-black uppercase tracking-[0.2em] px-3 py-1 rounded-full ${
                    bill.status === 'paid' ? 'bg-emerald-50 text-emerald-600' :
                    bill.status === 'partial' ? 'bg-amber-50 text-amber-600' : 'bg-rose-50 text-rose-600'
                  }`}>
                    {bill.status}
                  </span>
                  {bill.billingCycle === 'yearly' && (
                    <span className="text-[10px] font-black uppercase tracking-[0.2em] px-3 py-1 rounded-full bg-blue-50 text-blue-600">📆 Yearly</span>
                  )}
                </div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">
                  Period: {formatDate(bill.periodStart)} → {formatDate(bill.periodEnd)}
                </p>
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-2 capitalize">
                  {bill.billingCycle || 'Monthly'} Payment
                </p>
                <h3 className="text-2xl font-black text-slate-900 mb-6">{formatMoney(bill.amountDue)}</h3>

                {Number(bill.discount) > 0 && (
                  <p className="text-xs font-bold text-emerald-600 mb-4">
                    ✓ Discount applied: {formatMoney(bill.discount)}
                  </p>
                )}

                <div className="space-y-3 max-w-md">
                  <div className="flex justify-between items-center text-xs font-bold uppercase tracking-widest">
                    <span className="text-slate-400">Paid</span>
                    <span className="text-emerald-600">{formatMoney(bill.amountPaid)}</span>
                  </div>
                  <div className="h-1.5 w-full bg-slate-50 rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all duration-1000 ${bill.status === 'paid' ? 'bg-emerald-500' : 'bg-amber-400'}`}
                      style={{ width: `${Math.min(bill.amountDue > 0 ? (bill.amountPaid / bill.amountDue) * 100 : 0, 100)}%` }}
                    />
                  </div>
                  <div className="flex justify-between items-center text-xs font-bold uppercase tracking-widest">
                    <span className="text-slate-400">Remaining</span>
                    <span className="text-rose-600">{formatMoney(bill.amountDue - bill.amountPaid)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Promotions Section */}
        {promotionBills.length > 0 && (
          <section className="space-y-4">
            <h2 className="text-xs font-bold text-violet-600 uppercase tracking-widest ml-1">🎁 Promotions & Free Trials</h2>
            <div className="grid gap-4">
              {promotionBills.map(bill => (
                <div key={bill.id} className="bg-violet-50 p-6 rounded-[2rem] border border-violet-100 shadow-sm relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-6">
                    <span className="text-[10px] font-black uppercase tracking-[0.2em] px-3 py-1 rounded-full bg-violet-100 text-violet-600">Free Trial</span>
                  </div>
                  <p className="text-xs font-bold text-violet-400 uppercase tracking-widest mb-1">
                    Complimentary Period
                  </p>
                  <p className="text-sm font-bold text-slate-700 mb-1">{formatDate(bill.periodStart)} → {formatDate(bill.periodEnd)}</p>
                  <h3 className="text-xl font-black text-violet-700 mb-1">
                    {formatMoney(bill.amountDue)} <span className="text-sm font-bold text-violet-400">waived</span>
                  </h3>
                  {bill.note && <p className="text-xs font-medium text-violet-400 mt-2">Note: {bill.note}</p>}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Payment Records */}
        <section className="space-y-4">
          <h2 className="text-xs font-bold text-slate-900 uppercase tracking-widest ml-1">Payment History</h2>
          <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-slate-50/50 border-b border-slate-100">
                    <th className="p-5 text-xs font-black text-slate-400 uppercase tracking-widest">Date</th>
                    <th className="p-5 text-xs font-black text-slate-400 uppercase tracking-widest">Method</th>
                    <th className="p-5 text-xs font-black text-slate-400 uppercase tracking-widest">Note / Ref</th>
                    <th className="p-5 text-xs font-black text-slate-400 uppercase tracking-widest">Status</th>
                    <th className="p-5 text-xs font-black text-slate-400 uppercase tracking-widest text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {payments.map(pay => (
                    <tr key={pay.id} className="hover:bg-slate-50/30 transition-colors">
                      <td className="p-5">
                        <p className="text-xs font-black text-slate-700">{new Date(pay.createdAt).toLocaleDateString()}</p>
                        <p className="text-[10px] font-bold text-slate-400 uppercase">{new Date(pay.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                      </td>
                      <td className="p-5 text-xs font-black text-slate-600 uppercase tracking-tight">{pay.method}</td>
                      <td className="p-5 text-xs font-bold text-slate-400 truncate max-w-[150px]">{pay.note || '-'}</td>
                      <td className="p-5">
                        <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md ${
                          pay.status === 'approved' ? 'bg-emerald-50 text-emerald-600' :
                          pay.status === 'rejected' ? 'bg-rose-50 text-rose-600' : 'bg-amber-50 text-amber-600'
                        }`}>
                          {pay.status}
                        </span>
                      </td>
                      <td className="p-5 text-right text-xs font-black text-slate-900">{formatMoney(pay.amount)}</td>
                    </tr>
                  ))}
                  {payments.length === 0 && !isLoading && (
                    <tr>
                      <td colSpan="5" className="p-20 text-center">
                        <p className="text-xs font-black text-slate-300 uppercase tracking-[0.2em]">No payments recorded yet</p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      </div>

      {/* Payment Modal */}
      {showPayModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="bg-white rounded-[2rem] w-full max-w-md shadow-2xl overflow-hidden border border-slate-100">
            <div className="bg-slate-50 p-6 border-b border-slate-100 flex justify-between items-center">
              <div>
                <h3 className="font-black text-slate-800 text-lg">Submit Payment</h3>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Record a platform fee payment</p>
              </div>
              <button onClick={() => setShowPayModal(false)} className="p-2 hover:bg-slate-200 rounded-xl transition-colors text-slate-400">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
              </button>
            </div>
            
            <form onSubmit={handlePaySubmit} className="p-6 space-y-5">
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-2 block">Billing Cycle</label>
                <div className="grid grid-cols-2 gap-3">
                  <label className={`cursor-pointer border-2 rounded-xl p-3 flex flex-col items-center gap-1 transition-all ${
                    payForm.billingCycle === 'monthly' ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : 'border-slate-100 text-slate-500 hover:border-slate-200'
                  }`}>
                    <input type="radio" name="cycle" value="monthly" checked={payForm.billingCycle === 'monthly'} onChange={handleBillingCycleChange} className="hidden" />
                    <span className="text-sm font-black uppercase tracking-wider">Monthly</span>
                    <span className="text-xs font-bold opacity-70">{formatMoney(monthlyPrice)}</span>
                  </label>
                  <label className={`cursor-pointer border-2 rounded-xl p-3 flex flex-col items-center gap-1 transition-all ${
                    payForm.billingCycle === 'yearly' ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-slate-100 text-slate-500 hover:border-slate-200'
                  }`}>
                    <input type="radio" name="cycle" value="yearly" checked={payForm.billingCycle === 'yearly'} onChange={handleBillingCycleChange} className="hidden" />
                    <div className="flex items-center gap-1">
                      <span className="text-sm font-black uppercase tracking-wider">Yearly</span>
                      {yearlyDiscount > 0 && <span className="bg-emerald-100 text-emerald-700 text-[9px] px-1.5 py-0.5 rounded font-black">SAVE {formatMoney(yearlyDiscount)}</span>}
                    </div>
                    <span className="text-xs font-bold opacity-70">{formatMoney(yearlyPrice)}</span>
                  </label>
                </div>
              </div>

              {/* Start Month + End Month */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 block">Start Month</label>
                  <input
                    type="month"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold outline-none focus:bg-white focus:border-emerald-500 transition-colors"
                    value={payForm.periodStart || ''}
                    onChange={(e) => handleDateChange('periodStart', e.target.value)}
                    required
                  />
                </div>
                {payForm.billingCycle === 'monthly' && (
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 block">End Month (Optional)</label>
                    <input
                      type="month"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold outline-none focus:bg-white focus:border-emerald-500 transition-colors"
                      value={payForm.periodEnd || ''}
                      onChange={(e) => handleDateChange('periodEnd', e.target.value)}
                      min={payForm.periodStart}
                    />
                  </div>
                )}
                {payForm.billingCycle === 'yearly' && (
                  <div className="space-y-2 flex items-end">
                    <div className="w-full h-11 flex items-center justify-center bg-blue-50 border border-blue-200 text-blue-600 rounded-xl font-bold text-[10px] uppercase tracking-widest">
                      12 Months
                    </div>
                  </div>
                )}
              </div>

              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-2 block">Amount to Pay</label>
                <input
                  type="number" step="0.01" required
                  value={payForm.amount}
                  onChange={(e) => setPayForm(prev => ({ ...prev, amount: e.target.value }))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold outline-none focus:bg-white focus:border-emerald-500 transition-colors"
                />
              </div>

              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-2 block">Payment Method</label>
                <select
                  value={payForm.method}
                  onChange={(e) => setPayForm(prev => ({ ...prev, method: e.target.value }))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold outline-none focus:bg-white focus:border-emerald-500 transition-colors uppercase tracking-wider"
                >
                  <option value="bank">Bank Transfer</option>
                  <option value="online">Online Payment</option>
                  <option value="cash">Cash</option>
                </select>
              </div>

              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-2 block">Payment Note / Reference</label>
                <input
                  type="text"
                  value={payForm.note}
                  onChange={(e) => setPayForm(prev => ({ ...prev, note: e.target.value }))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold outline-none focus:bg-white focus:border-emerald-500 transition-colors"
                  placeholder="Txn ID, Ref #, etc."
                />
              </div>

              <div className="pt-4 border-t border-slate-100 space-y-4">
                {/* Payment Breakdown Preview */}
                <div className="rounded-2xl p-4 bg-blue-50 border border-blue-200">
                  <p className="text-[11px] font-black uppercase tracking-widest mb-3 text-blue-500">
                    💳 Payment Breakdown
                  </p>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-500">Base ({paymentBreakdown.months} × {formatMoney(paymentBreakdown.basePrice / (payForm.billingCycle === 'yearly' ? 12 : 1))})</span>
                      <span className="font-bold text-slate-700">{formatMoney(paymentBreakdown.basePrice)}</span>
                    </div>
                    {paymentBreakdown.discount > 0 && (
                      <div className="flex justify-between text-sm">
                        <span className="text-emerald-600">Discount</span>
                        <span className="font-bold text-emerald-600">- {formatMoney(paymentBreakdown.discount)}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-base font-black border-t border-blue-200 pt-2 mt-2">
                      <span className="text-slate-800">Total</span>
                      <span className="text-blue-600">{formatMoney(paymentBreakdown.total)}</span>
                    </div>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting || !payForm.amount}
                  className="w-full bg-slate-900 hover:bg-slate-800 text-white font-black py-4 rounded-xl transition-all disabled:opacity-50 uppercase tracking-widest text-xs"
                >
                  {isSubmitting ? 'Submitting...' : 'Submit Payment Proof'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
