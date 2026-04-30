'use client';

import { useEffect, useState } from 'react';
import { PartnerShell } from '@/features/partner/components/PartnerShell';

type AttendanceRecord = {
  id: string;
  shiftState: string;
  punchInAt: string | null;
  punchOutAt: string | null;
  createdAt: string;
};

export default function PartnerAttendanceHistoryPage() {
  const [rows, setRows] = useState<AttendanceRecord[]>([]);

  useEffect(() => {
    fetch('/api/partner/attendance/history', { credentials: 'include' })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => setRows(Array.isArray(data?.records) ? data.records : []))
      .catch(() => setRows([]));
  }, []);

  return (
    <PartnerShell title="Attendance History" description="Shift lifecycle and punch logs.">
      <div className="rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 dark:bg-slate-900/50">
            <tr className="text-left text-slate-600 dark:text-slate-300">
              <th className="px-3 py-2">State</th>
              <th className="px-3 py-2">Punch In</th>
              <th className="px-3 py-2">Punch Out</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} className="border-t border-slate-200 dark:border-slate-700">
                <td className="px-3 py-2">{row.shiftState}</td>
                <td className="px-3 py-2">{row.punchInAt ? new Date(row.punchInAt).toLocaleString() : '—'}</td>
                <td className="px-3 py-2">{row.punchOutAt ? new Date(row.punchOutAt).toLocaleString() : '—'}</td>
              </tr>
            ))}
            {rows.length === 0 ? (
              <tr>
                <td colSpan={3} className="px-3 py-6 text-center text-slate-500 dark:text-slate-400">
                  No attendance logs yet.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </PartnerShell>
  );
}
