import React, { useEffect, useState } from 'react'
import api from '../api'

function formatMoney(value) {
	const number = Number(value || 0)
	return number.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

export default function AdminDashboard() {
	const [owners, setOwners] = useState([])
	const [summary, setSummary] = useState(null)
	const [error, setError] = useState('')

	useEffect(() => {
		let active = true
		Promise.all([api.get('/admin/owners'), api.get('/admin/billing/summary')])
			.then(([ownersRes, summaryRes]) => {
				if (!active) return
				setOwners(ownersRes.data.data || [])
				setSummary(summaryRes.data.data || null)
				setError('')
			})
			.catch((err) => {
				if (!active) return
				setError(err.response?.data?.message || 'Failed to load dashboard data')
			})
		return () => {
			active = false
		}
	}, [])

	const propertyTotal = owners.reduce((sum, owner) => sum + Number(owner.propertyCount || 0), 0)

	return (
		<div className="space-y-6">
			<div className="admin-hero-card">
				<div>
					<p className="text-xs uppercase tracking-[0.2em] text-slate-500">Dashboard</p>
					<h1 className="mt-2 text-2xl font-semibold text-slate-900 md:text-3xl">Control Center</h1>
					<p className="mt-2 max-w-2xl text-sm text-slate-600">
						Monitor owner growth, payments, and platform health in one place.
					</p>
				</div>
			</div>

			{error && <div className="admin-alert">{error}</div>}

			<div className="grid gap-4 md:grid-cols-4">
				<div className="admin-metric">
					<p>Total owners</p>
					<h3>{owners.length}</h3>
				</div>
				<div className="admin-metric">
					<p>Total properties</p>
					<h3>{propertyTotal}</h3>
				</div>
				<div className="admin-metric">
					<p>Total paid</p>
					<h3>{formatMoney(summary?.totalPaid)}</h3>
				</div>
				<div className="admin-metric">
					<p>Total unpaid</p>
					<h3>{formatMoney((summary?.totalDue || 0) - (summary?.totalPaid || 0))}</h3>
				</div>
			</div>

			<div className="grid gap-4 md:grid-cols-2">
				<div className="admin-card">
					<h2 className="text-lg font-semibold">Owner Snapshot</h2>
					<div className="mt-4 space-y-3">
						{owners.slice(0, 5).map((owner) => (
							<div key={owner.id} className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 p-4">
								<div>
									<p className="text-sm font-semibold text-slate-900">
										{owner.firstName} {owner.lastName}
									</p>
									<p className="text-xs text-slate-500">{owner.contact}</p>
								</div>
								<span className={`admin-pill ${owner.currentBillingStatus || 'pending'}`}>
									{owner.currentBillingStatus || 'pending'}
								</span>
							</div>
						))}
					</div>
				</div>

				<div className="admin-card">
					<h2 className="text-lg font-semibold">Payment Pulse</h2>
					<div className="mt-4 space-y-4 text-sm text-slate-600">
						<div className="flex justify-between">
							<span>Paid owners</span>
							<span>{summary?.paidCount || 0}</span>
						</div>
						<div className="flex justify-between">
							<span>Unpaid owners</span>
							<span>{summary?.unpaidCount || 0}</span>
						</div>
						<div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-xs text-slate-500">
							Auto-refresh to monitor status across owners and payments.
						</div>
					</div>
				</div>
			</div>
		</div>
	)
}
