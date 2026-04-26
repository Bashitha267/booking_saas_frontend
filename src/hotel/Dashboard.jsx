import React from 'react';

export default function Dashboard() {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-slate-900">Hotel Dashboard</h1>
      <p className="mt-4 text-slate-600">Welcome back! Here is an overview of your hotel performance.</p>
      
      <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: 'Total Bookings', value: '128', color: 'text-blue-600' },
          { label: 'Revenue', value: '$12,450', color: 'text-green-600' },
          { label: 'Active Guests', value: '45', color: 'text-purple-600' },
          { label: 'Pending Payments', value: '12', color: 'text-orange-600' },
        ].map((stat) => (
          <div key={stat.label} className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
            <p className="text-sm font-medium text-slate-500 uppercase tracking-wider">{stat.label}</p>
            <p className={`mt-2 text-3xl font-bold ${stat.color}`}>{stat.value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
