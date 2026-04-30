'use client';

import { useState } from 'react';
import { Input } from '@/components/ui/Input';
import { PartnerShell } from '@/features/partner/components/PartnerShell';

export default function PartnerCreateOrderPage() {
  const [userId, setUserId] = useState('');
  const [bookingId, setBookingId] = useState('');
  const [subtotal, setSubtotal] = useState('0');
  const [discount, setDiscount] = useState('0');
  const [status, setStatus] = useState('');

  const placeOrder = async () => {
    const subtotalNum = Number(subtotal) || 0;
    const discountNum = Number(discount) || 0;
    const total = subtotalNum - discountNum;
    setStatus('Placing order...');
    const res = await fetch('/api/partner/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        userId,
        bookingId,
        items: [{ id: 'frame-1', name: 'Selected Frame', qty: 1, price: subtotalNum }],
        deliveryAddress: { label: 'Home', address: 'Customer address' },
        subtotal: subtotalNum,
        discount: discountNum,
        total,
      }),
    });
    const data = await res.json().catch(() => ({}));
    setStatus(res.ok ? `Order placed: ${data.orderId}` : data.error || 'Failed');
  };

  return (
    <PartnerShell title="Order Placement" description="Create customer order from eye-test consultation.">
      <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4 space-y-3">
        <Input placeholder="Customer User ID" value={userId} onChange={(e) => setUserId(e.target.value)} />
        <Input placeholder="Booking ID (optional)" value={bookingId} onChange={(e) => setBookingId(e.target.value)} />
        <div className="grid grid-cols-2 gap-2">
          <Input placeholder="Subtotal" value={subtotal} onChange={(e) => setSubtotal(e.target.value)} />
          <Input placeholder="Discount" value={discount} onChange={(e) => setDiscount(e.target.value)} />
        </div>
        <button type="button" className="common-btn common-btn--primary w-full" onClick={placeOrder}>
          Place Order
        </button>
        {status ? <p className="text-sm text-slate-600 dark:text-slate-300">{status}</p> : null}
      </div>
    </PartnerShell>
  );
}
