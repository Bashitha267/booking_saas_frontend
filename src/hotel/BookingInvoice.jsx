import React, { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import api from '../api';

export default function BookingInvoice() {
  const { id } = useParams();
  const [booking, setBooking] = useState(null);
  const [expenses, setExpenses] = useState([]);
  const [payments, setPayments] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  useEffect(() => {
    let isMounted = true;
    const loadBookingData = async () => {
      setIsLoading(true);
      setLoadError('');
      try {
        const [bookingRes, paymentsRes] = await Promise.all([
          api.get(`/bookings/${id}`),
          api.get('/payments')
        ]);

        const bookingData = bookingRes.data?.data;
        if (!bookingData) throw new Error('Booking not found');

        const notesParts = (bookingData.notes || '').split(' | ');
        const country = notesParts[0] || '';
        const address = notesParts[1] || '';

        const mappedBooking = {
          id: bookingData.id,
          guestName: bookingData.guestName,
          guestEmail: 'N/A',
          guestPhone: bookingData.guestContact,
          roomNumber: bookingData.roomNumber || 'N/A',
          roomType: bookingData.roomType || 'Unknown',
          guestCount: (Number(bookingData.adults || 0) + Number(bookingData.children || 0)) || 1,
          startDate: bookingData.checkInDate,
          checkInTime: bookingData.checkInTime || '14:00:00',
          endDate: bookingData.checkOutDate,
          checkOutTime: bookingData.checkOutTime || '11:00:00',
          status: bookingData.status,
          nicPassport: bookingData.guestNic || 'N/A',
          country,
          address,
          adults: bookingData.adults,
          children: bookingData.children,
          propertyId: bookingData.propertyId,
          roomPrice: Number(bookingData.roomPrice || 0),
          propertyName: bookingData.propertyName || 'Hotel Reservation',
          discount: Number(bookingData.discount || 0)
        };

        let parsedExpenses = [];
        try {
          if (bookingData.expenses) {
            parsedExpenses = JSON.parse(bookingData.expenses);
          }
        } catch (e) {
          console.error('Failed to parse expenses:', e);
        }

        const paymentRows = paymentsRes.data?.data || [];
        const bookingPayments = paymentRows
          .filter((pay) => pay.bookingId === bookingData.id)
          .map((pay) => ({
            id: pay.id,
            amount: Number(pay.amount || 0),
            method: pay.method || 'cash',
            status: pay.status || 'paid',
            date: (pay.paidAt || pay.createdAt || '').toString().slice(0, 10),
            note: pay.note || '',
          }));

        if (isMounted) {
          setBooking(mappedBooking);
          setExpenses(parsedExpenses);
          setPayments(bookingPayments);
        }
      } catch (error) {
        if (isMounted) {
          setLoadError('Failed to load invoice data.');
        }
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    if (id) {
      loadBookingData();
    }
    return () => {
      isMounted = false;
    };
  }, [id]);

  const roomPrice = booking ? Number(booking.roomPrice || 0) : 0;
  const nights = useMemo(() => {
    if (!booking?.startDate || !booking?.endDate) return 1;
    const diff = new Date(booking.endDate) - new Date(booking.startDate);
    return Math.max(1, Math.round(diff / (1000 * 60 * 60 * 24)));
  }, [booking?.startDate, booking?.endDate]);

  const roomTotal = roomPrice * nights;
  const totalExpenses = expenses.reduce((sum, exp) => sum + exp.amount, 0);
  const totalPaid = payments.filter(pay => pay.status !== 'refunded').reduce((sum, pay) => sum + pay.amount, 0);
  const totalRefunded = payments.filter(pay => pay.status === 'refunded').reduce((sum, pay) => sum + pay.amount, 0);
  const grandTotal = roomTotal + totalExpenses - Number(booking?.discount || 0);
  const balanceDue = grandTotal - totalPaid;

  const currentPaymentStatus = useMemo(() => {
    if (totalPaid === 0 && grandTotal === 0) return 'not paid';
    if (totalPaid === 0) return 'not paid';
    if (balanceDue <= 0) return 'paid';
    return 'pending';
  }, [totalPaid, balanceDue, grandTotal]);

  // Helper: format HH:MM:SS or HH:MM to 12-hour display
  const fmtTime = (t) => {
    if (!t) return '';
    const [hStr, mStr] = t.split(':');
    const h = parseInt(hStr, 10);
    const m = mStr ? mStr.slice(0, 2) : '00';
    const ampm = h >= 12 ? 'PM' : 'AM';
    const h12  = h % 12 === 0 ? 12 : h % 12;
    return `${h12}:${m} ${ampm}`;
  };

  // Auto-print when loaded
  useEffect(() => {
    if (!isLoading && booking) {
      const timer = setTimeout(() => {
        window.print();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [isLoading, booking]);

  if (isLoading) {
    return (
      <div className="p-8 text-center text-slate-400 text-xs font-bold uppercase tracking-widest animate-pulse">
        Generating printable invoice...
      </div>
    );
  }

  if (loadError || !booking) {
    return (
      <div className="p-8 text-center text-rose-500 text-xs font-bold uppercase tracking-widest bg-rose-50 rounded-2xl max-w-md mx-auto mt-12 border border-rose-100">
        {loadError || 'Booking not found.'}
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto p-4 sm:p-8 bg-white min-h-screen text-slate-800 font-sans antialiased text-xs">
      <style>{`
        @media print {
          .no-print {
            display: none !important;
          }
          body {
            background: white !important;
            color: black !important;
            padding: 0 !important;
          }
          * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
        }
      `}</style>

      {/* Print Controls Header */}
      <div className="no-print flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center border-b border-slate-200 pb-4 mb-8">
        <div>
          <h1 className="text-sm font-bold text-slate-800">Print Preview</h1>
          <p className="text-[10px] text-slate-400">Close this tab when you are finished printing.</p>
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          <button
            onClick={() => window.print()}
            className="flex-1 sm:flex-initial border border-blue-600 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs uppercase px-4 py-1.5 rounded transition-all"
          >
            Print Invoice
          </button>
          <button
            onClick={() => window.close()}
            className="flex-1 sm:flex-initial border border-slate-300 bg-white hover:bg-slate-50 text-slate-800 font-bold text-xs uppercase px-4 py-1.5 rounded transition-all"
          >
            Close Tab
          </button>
        </div>
      </div>

      {/* Invoice Layout */}
      <div className="space-y-6">
        
        {/* Invoice Header */}
        <div className="flex flex-col sm:flex-row gap-4 justify-between items-start border-b border-slate-300 pb-6">
          <div>
            <h2 className="text-lg font-black text-slate-900 tracking-tight uppercase">{booking.propertyName}</h2>
            <p className="text-[10px] text-slate-500 mt-0.5">{booking.address || 'Address not specified'}, {booking.country || ''}</p>
            {booking.guestPhone && <p className="text-[10px] text-slate-400 mt-0.5">Contact: {booking.guestPhone}</p>}
          </div>
          <div className="text-left sm:text-right">
            <h1 className="text-xl font-black text-slate-900 tracking-tight uppercase">INVOICE</h1>
            <p className="text-sm font-bold text-slate-700 mt-1">Booking #00{booking.id}</p>
            {booking.status === 'cancelled' ? (
              <span className="inline-block mt-2 px-2.5 py-0.5 rounded text-[10px] font-bold uppercase border bg-red-50 border-red-200 text-red-850">
                Cancelled
              </span>
            ) : (
              <span className={`inline-block mt-2 px-2.5 py-0.5 rounded text-[10px] font-bold uppercase border ${
                currentPaymentStatus === 'paid' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' :
                currentPaymentStatus === 'pending' ? 'bg-blue-50 border-blue-200 text-blue-800' :
                'bg-red-50 border-red-200 text-red-800'
              }`}>
                {currentPaymentStatus}
              </span>
            )}
          </div>
        </div>

        {/* Guest Profile & Reservation details */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 sm:gap-8 border-b border-slate-200 pb-6">
          <div>
            <h3 className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">Guest Profile</h3>
            <div className="space-y-1.5">
              <p className="font-bold text-slate-900 text-sm">{booking.guestName}</p>
              <p className="text-slate-600">NIC/Passport: {booking.nicPassport || 'N/A'}</p>
              <p className="text-slate-600">Origin Country: {booking.country || 'N/A'}</p>
              <p className="text-slate-600">Address: {booking.address || 'N/A'}</p>
              <p className="text-slate-600">Occupancy: {booking.adults} Adults, {booking.children} Children</p>
            </div>
          </div>
          <div>
            <h3 className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">Reservation Details</h3>
            <div className="space-y-1.5">
              <p className="font-bold text-slate-900">Room {booking.roomNumber}</p>
              <p className="text-slate-600 uppercase font-semibold text-[10px]">{booking.roomType}</p>
              <p className="text-slate-600 mt-1">Check-in: {booking.startDate?.split('T')[0]} <span className="font-bold text-blue-700">at {fmtTime(booking.checkInTime)}</span></p>
              <p className="text-slate-600">Check-out: {booking.endDate?.split('T')[0]} <span className="font-bold text-amber-700">at {fmtTime(booking.checkOutTime)}</span></p>
              <p className="text-slate-600 font-bold">Length of Stay: {nights} {nights === 1 ? 'Night' : 'Nights'}</p>
            </div>
          </div>
        </div>

        {/* Cost Breakdown */}
        <div className="min-w-0">
          <h3 className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">Cost Breakdown</h3>
          <div className="overflow-x-auto border border-slate-200 rounded">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="p-2.5 font-bold text-slate-600 uppercase">Item Description</th>
                  <th className="p-2.5 font-bold text-slate-600 text-right uppercase">Rate</th>
                  <th className="p-2.5 font-bold text-slate-600 text-center uppercase">Qty/Nights</th>
                  <th className="p-2.5 font-bold text-slate-600 text-right uppercase">Amount</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-slate-200">
                  <td className="p-2.5">Room Stay Charge (Room {booking.roomNumber} - {booking.roomType})</td>
                  <td className="p-2.5 text-right">Rs. {roomPrice.toFixed(2)}</td>
                  <td className="p-2.5 text-center">{nights}</td>
                  <td className="p-2.5 text-right font-semibold">Rs. {roomTotal.toFixed(2)}</td>
                </tr>
                {expenses.map((exp) => (
                  <tr key={exp.id} className="border-b border-slate-200">
                    <td className="p-2.5">{exp.description} ({exp.date})</td>
                    <td className="p-2.5 text-right">Rs. {exp.amount.toFixed(2)}</td>
                    <td className="p-2.5 text-center">1</td>
                    <td className="p-2.5 text-right font-semibold">Rs. {exp.amount.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Ledger & Transactions */}
        {payments.length > 0 && (
          <div className="min-w-0">
            <h3 className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">Payment Transaction Log</h3>
            <div className="overflow-x-auto border border-slate-200 rounded">
              <table className="w-full border-collapse text-left">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    <th className="p-2.5 font-bold text-slate-600 uppercase">Payment Method</th>
                    <th className="p-2.5 font-bold text-slate-600 uppercase">Date</th>
                    <th className="p-2.5 font-bold text-slate-600 uppercase">Status</th>
                    <th className="p-2.5 font-bold text-slate-600 text-right uppercase">Amount Received</th>
                  </tr>
                </thead>
                <tbody>
                  {payments.map((pay) => (
                    <tr key={pay.id} className="border-b border-slate-200 last:border-0">
                      <td className="p-2.5">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-800 uppercase">{pay.method}</span>
                          <span className={`px-1.5 py-0.2 rounded text-[9px] font-bold uppercase tracking-wider border ${
                            pay.note === 'Advance Payment' 
                              ? 'bg-blue-50 text-blue-700 border-blue-200' 
                              : pay.note === 'Full Payment'
                              ? 'bg-slate-50 text-slate-700 border-slate-350'
                              : 'bg-slate-50 text-slate-400 border-slate-200 italic'
                          }`}>
                            {pay.note || 'General Payment'}
                          </span>
                        </div>
                      </td>
                      <td className="p-2.5 text-slate-500">{pay.date}</td>
                      <td className="p-2.5">
                        <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase border ${
                          pay.status === 'paid' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' :
                          pay.status === 'refunded' ? 'bg-red-50 text-red-700 border-red-200' :
                          'bg-amber-50 text-amber-700 border-amber-100'
                        }`}>
                          {pay.status}
                        </span>
                      </td>
                      <td className="p-2.5 text-right font-bold">
                        {pay.status === 'refunded' ? (
                          <span className="text-red-600 line-through">Rs. {pay.amount.toFixed(2)}</span>
                        ) : (
                          <span className="text-emerald-700">+Rs. {pay.amount.toFixed(2)}</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Grand Summary */}
        <div className="flex justify-end pt-4">
          <div className="w-full sm:w-64 space-y-2 text-[11px] font-medium text-slate-700">
            <div className="flex justify-between py-0.5">
              <span className="text-slate-500">Subtotal Stay</span>
              <span className="font-semibold text-slate-700">Rs. {roomTotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between py-0.5">
              <span className="text-slate-500">Expenses Subtotal</span>
              <span className="font-semibold text-slate-700">Rs. {totalExpenses.toFixed(2)}</span>
            </div>

            {booking && Number(booking.discount || 0) > 0 && (
              <div className="flex justify-between py-0.5 text-rose-600 font-bold">
                <span>Discount</span>
                <span>- Rs. {Number(booking.discount).toFixed(2)}</span>
              </div>
            )}
            
            {/* Single line above Grand Total */}
            <div className="border-t border-slate-300 my-1.5"></div>
            
            <div className="flex justify-between py-0.5 font-bold text-slate-900">
              <span className="uppercase text-[9px] tracking-wider">Grand Total</span>
              <span className="text-xs font-black">Rs. {grandTotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between py-0.5 text-slate-800 font-bold text-xs">
              <span>Total Payments</span>
              <span className="text-emerald-750 font-black">Rs. {totalPaid.toFixed(2)}</span>
            </div>
            {totalRefunded > 0 && (
              <div className="flex justify-between py-0.5 text-red-600 font-bold text-xs">
                <span>Total Refunded</span>
                <span className="text-red-600 font-black line-through">Rs. {totalRefunded.toFixed(2)}</span>
              </div>
            )}
            
            {/* Balance Due / Paid stamp */}
            <div className="border-t border-slate-300 my-1.5"></div>

            {balanceDue <= 0 ? (
              <div className="flex justify-between py-1.5 items-center font-bold text-emerald-800">
                <span className="uppercase text-[9px] tracking-wider">Payment Status</span>
                <span className="text-[10px] font-black uppercase tracking-widest border border-emerald-600 rounded px-2 py-0.5 text-emerald-700">
                  ✓ Paid in Full
                </span>
              </div>
            ) : (
              <div className="flex justify-between py-1.5 items-center font-bold text-red-900">
                <span className="uppercase text-[9px] tracking-wider">Balance Due</span>
                <span className="text-sm font-black border-b-[3px] border-double border-current pb-0.5">
                  Rs. {balanceDue.toFixed(2)}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Invoice Footer */}
        <div className="text-center text-[10px] text-slate-400 pt-12 border-t border-slate-200">
          <p>Thank you for your business. For any billing queries, please contact management.</p>
          <p className="mt-1">Generated automatically on {new Date().toLocaleDateString()}</p>
        </div>

      </div>
    </div>
  );
}
