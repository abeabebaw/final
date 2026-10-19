import React, { useState, useEffect } from 'react';
import API from '../../api/client';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, 
  ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line 
} from 'recharts';
import { FileText, MapPin, List, CheckCircle, Clock, Filter, Download } from 'lucide-react';
import toast from 'react-hot-toast';

const COLORS = ['#1e3a8a', '#0f766e', '#d97706', '#dc2626', '#0284c7', '#7c3aed', '#16a34a'];

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [leadTime, setLeadTime] = useState([]);
  const [empPerf, setEmpPerf] = useState([]);
  const [loadError, setLoadError] = useState('');
  const [selectedYear, setSelectedYear] = useState('2026');
  const [selectedMonth, setSelectedMonth] = useState('All');

  // Additional mock reporting data matching section 6.3.4 & 6.3.5 of user manual
  const propertyRightsData = [
    { name: 'Leasehold', value: 683 },
    { name: 'Old Possession', value: 85 },
    { name: 'Urban Farmland', value: 4 },
    { name: 'Unregistered', value: 2 }
  ];

  const demographicsData = [
    { ageGroup: '18-35', Male: 240, Female: 180 },
    { ageGroup: '36-55', Male: 320, Female: 290 },
    { ageGroup: '>55', Male: 110, Female: 95 }
  ];

  useEffect(() => {
    fetchDashboardData();
  }, [selectedYear, selectedMonth]);

  const fetchDashboardData = async () => {
    setLoadError('');
    try {
      const [sRes, lRes, eRes] = await Promise.all([
        API.get('/reports/dashboard'),
        API.get('/reports/lead-time'),
        API.get('/reports/employee-performance')
      ]);
      setStats(sRes.data);
      setLeadTime(lRes.data || []);
      setEmpPerf(eRes.data || []);
    } catch (err) {
      console.error('Failed to load dashboard analytics:', err);
      setLoadError(err.response?.data?.message || 'Failed to load dashboard analytics.');
    }
  };

  const handleExportCSV = () => {
    try {
      const rows = [
        ['CRPRS Business Intelligence Report', `Generated: ${new Date().toLocaleString()}`],
        ['Filter Year', selectedYear, 'Filter Month', selectedMonth],
        [],
        ['Metric', 'Value'],
        ['Total Applications', stats.totalApplications || 0],
        ['Registered Parcels', stats.registeredParcels || 0],
        ['Pending Transactions', stats.pendingTransactions || 0],
        ['Completed Applications', stats.completedApplications || 0],
        [],
        ['Lead Time Analysis'],
        ['Application Type', 'Avg Lead Time (Hours)'],
        ...leadTime.map(lt => [lt.application_type, lt.avg_lead_time_hours || 0]),
        [],
        ['Employee Performance'],
        ['Officer Name', 'Role', 'Transactions Processed'],
        ...empPerf.map(ep => [ep.full_name, ep.role || 'Officer', ep.transactions_processed || 0])
      ];

      const csvContent = 'data:text/csv;charset=utf-8,' + rows.map(e => e.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n');
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement('a');
      link.setAttribute('href', encodedUri);
      link.setAttribute('download', `CRPRS_BI_Report_${selectedYear}_${Date.now()}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success('Analytics report downloaded as CSV!');
    } catch (err) {
      toast.error('Failed to export CSV');
    }
  };

  if (!stats && loadError) {
    return (
      <div className="p-6 text-center text-rose-700" role="alert">
        <p>{loadError}</p>
        <button
          type="button"
          onClick={fetchDashboardData}
          className="mt-3 rounded bg-blue-900 px-3 py-1.5 text-white hover:bg-blue-800"
        >
          Retry
        </button>
      </div>
    );
  }

  if (!stats) return <div className="p-6 text-slate-500">Loading Business Intelligence Dashboard...</div>;

  return (
    <div className="space-y-6">
      {/* Top Header & Filter Toolbar */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Clock className="w-6 h-6 text-blue-600" /> CRPRS BI & Analytics Dashboard
          </h2>
          <p className="text-xs text-slate-500">Kombolcha City Cadastre & Real Property BI Reporting Module</p>
        </div>

        {/* Global Filter Bar */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="flex items-center gap-1 text-slate-500 font-semibold"><Filter className="w-3.5 h-3.5"/> Filters:</span>
          <select value={selectedYear} onChange={e => setSelectedYear(e.target.value)} className="p-1.5 border border-slate-300 rounded bg-slate-50">
            <option value="2026">2026</option>
            <option value="2025">2025</option>
          </select>
          <select value={selectedMonth} onChange={e => setSelectedMonth(e.target.value)} className="p-1.5 border border-slate-300 rounded bg-slate-50">
            <option value="All">All Months</option>
            <option value="August">August</option>
            <option value="September">September</option>
          </select>
          <button onClick={handleExportCSV} className="px-3 py-1.5 bg-blue-900 hover:bg-blue-800 text-white rounded font-medium flex items-center gap-1">
            <Download className="w-3.5 h-3.5" /> Export Data
          </button>
        </div>
      </div>

      {/* Stats Summary Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <div className="text-2xl font-extrabold text-slate-900">{stats.totalApplications}</div>
            <div className="text-xs text-slate-500 font-medium">Total Applications</div>
          </div>
          <div className="p-3 bg-blue-50 text-blue-600 rounded-lg"><FileText className="w-6 h-6"/></div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <div className="text-2xl font-extrabold text-emerald-600">{stats.registeredParcels}</div>
            <div className="text-xs text-slate-500 font-medium font-medium">Registered Parcels</div>
          </div>
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-lg"><MapPin className="w-6 h-6"/></div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <div className="text-2xl font-extrabold text-amber-600">{stats.pendingTransactions}</div>
            <div className="text-xs text-slate-500 font-medium">Pending Transactions</div>
          </div>
          <div className="p-3 bg-amber-50 text-amber-600 rounded-lg"><List className="w-6 h-6"/></div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <div className="text-2xl font-extrabold text-indigo-600">{stats.completedApplications}</div>
            <div className="text-xs text-slate-500 font-medium">Completed Deliveries</div>
          </div>
          <div className="p-3 bg-indigo-50 text-indigo-600 rounded-lg"><CheckCircle className="w-6 h-6"/></div>
        </div>
      </div>

      {/* Interactive Charts Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Chart 1: Lead Time Report */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-3">
          <h3 className="font-bold text-slate-800 text-sm border-b border-slate-100 pb-2">
            Average Lead Time by Application Type (Hours)
          </h3>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={leadTime.map(l => ({ name: (l.application_type || l.name || '').replace(/_/g,' '), hours: parseFloat(l.avg_lead_time_hours || l.hours || 0) }))}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="name" stroke="#64748b" fontSize={11} />
              <YAxis stroke="#64748b" fontSize={11} />
              <Tooltip />
              <Bar dataKey="hours" fill="#1e3a8a" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Chart 2: Property Right Report */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-3">
          <h3 className="font-bold text-slate-800 text-sm border-b border-slate-100 pb-2">
            Property Right Distribution
          </h3>
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie data={propertyRightsData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} label>
                {propertyRightsData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Chart 3: Employee Performance */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-3">
          <h3 className="font-bold text-slate-800 text-sm border-b border-slate-100 pb-2">
            Employee Performance (Transactions Processed)
          </h3>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={empPerf.map(e => ({ name: e.full_name, transactions: parseInt(e.transactions_processed) }))} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis type="number" stroke="#64748b" fontSize={11} />
              <YAxis type="category" dataKey="name" width={110} stroke="#64748b" fontSize={11} />
              <Tooltip />
              <Bar dataKey="transactions" fill="#0f766e" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Chart 4: Property Owner Demographics */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-3">
          <h3 className="font-bold text-slate-800 text-sm border-b border-slate-100 pb-2">
            Property Owner Demographics by Age & Gender
          </h3>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={demographicsData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="ageGroup" stroke="#64748b" fontSize={11} />
              <YAxis stroke="#64748b" fontSize={11} />
              <Tooltip />
              <Legend />
              <Bar dataKey="Male" fill="#0284c7" radius={[4, 4, 0, 0]} />
              <Bar dataKey="Female" fill="#db2777" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}