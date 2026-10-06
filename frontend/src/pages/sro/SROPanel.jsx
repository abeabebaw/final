import { useState, useEffect, useCallback, useMemo } from 'react';
import API from '../../api/client';
import StatusBadge from '../../components/StatusBadge';
import toast from 'react-hot-toast';
import {
  CheckCircle, XCircle, Ban, Printer, FileText, Search, Filter,
  RefreshCw, ChevronRight, Eye, Download, Shield, Scale, UserPlus,
  X, AlertTriangle, Check, MapPin, Building2, Calendar, Award
} from 'lucide-react';

const SRO_STATUS_OPTIONS = [
  'ALL STATUS',
  'READY_FOR_APPROVAL',
  'APPROVED',
  'REJECTED',
  'CANCELLED'
];

export default function SROPanel() {
  // ─── Transaction List State ─────────────────────────────────────────────
  const [txns, setTxns] = useState([]);
  const [statusFilter, setStatusFilter] = useState('ALL STATUS');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);

  // ─── Loaded Transaction ─────────────────────────────────────────────────
  const [selected, setSelected] = useState(null);
  const [activeTab, setActiveTab] = useState('holder'); // 'holder', 'rrr', 'mortgage', 'injunction', 'title', 'document'

  // ─── Modals State ───────────────────────────────────────────────────────
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState('');

  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelReason, setCancelReason] = useState('');

  const [showPartyDetailsModal, setShowPartyDetailsModal] = useState(null);
  const [showRightDetailsModal, setShowRightDetailsModal] = useState(null);
  const [showMortgageDetailsModal, setShowMortgageDetailsModal] = useState(null);
  const [showInjunctionDetailsModal, setShowInjunctionDetailsModal] = useState(null);
  const [showLetterModal, setShowLetterModal] = useState(null);

  const [showCertificateModal, setShowCertificateModal] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  // ─── Fetch Transactions ─────────────────────────────────────────────────
  const fetchTxns = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (searchQuery) params.search = searchQuery;
      const { data } = await API.get('/transactions', { params });
      let list = Array.isArray(data) ? data : data.data || [];

      // Filter by status if selected
      if (statusFilter && statusFilter !== 'ALL STATUS') {
        list = list.filter(t => t.status === statusFilter);
      } else {
        // By default show relevant statuses for SRO
        list = list.filter(t => ['READY_FOR_APPROVAL', 'APPROVED', 'REJECTED', 'CANCELLED', 'IN_PROCESS'].includes(t.status));
      }
      setTxns(list);
    } catch (err) {
      console.error('Fetch transactions error:', err);
      toast.error('Failed to load transaction list');
    } finally {
      setLoading(false);
    }
  }, [statusFilter, searchQuery]);

  useEffect(() => { fetchTxns(); }, [fetchTxns]);

  // ─── Load Transaction Details ───────────────────────────────────────────
  const handleLoad = async (id) => {
    try {
      const { data } = await API.get(`/transactions/${id}`);
      setSelected(data);
      setActiveTab('holder');
      toast.success('Transaction loaded for validation');
    } catch (err) {
      console.error('Load transaction error:', err);
      toast.error(err.response?.data?.message || 'Failed to load transaction');
    }
  };

  const refreshSelected = async () => {
    if (!selected) return;
    try {
      const { data } = await API.get(`/transactions/${selected.id}`);
      setSelected(data);
    } catch (e) {
      console.error(e);
    }
  };

  // ─── Approve Transaction ────────────────────────────────────────────────
  const handleApprove = async () => {
    if (!selected) return;
    if (!window.confirm(`Are you sure you want to APPROVE transaction ${selected.transaction_number}?`)) {
      return;
    }

    setActionLoading(true);
    try {
      await API.post(`/transactions/${selected.id}/approve`);
      toast.success('✅ Transaction approved successfully');
      await refreshSelected();
      fetchTxns();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to approve transaction');
    } finally {
      setActionLoading(false);
    }
  };

  // ─── Reject Transaction ─────────────────────────────────────────────────
  const handleConfirmReject = async (e) => {
    e.preventDefault();
    if (!rejectReason.trim()) {
      toast.error('Please specify a rejection reason');
      return;
    }

    setActionLoading(true);
    try {
      await API.post(`/transactions/${selected.id}/reject`, { reason: rejectReason });
      toast.success('⚠️ Transaction rejected and returned for correction');
      setShowRejectModal(false);
      setRejectReason('');
      await refreshSelected();
      fetchTxns();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to reject transaction');
    } finally {
      setActionLoading(false);
    }
  };

  // ─── Cancel Transaction ─────────────────────────────────────────────────
  const handleConfirmCancel = async (e) => {
    e.preventDefault();
    if (!cancelReason.trim()) {
      toast.error('Please specify a cancellation reason');
      return;
    }

    setActionLoading(true);
    try {
      await API.post(`/transactions/${selected.id}/cancel`, { reason: cancelReason });
      toast.success('🛑 Transaction legally cancelled');
      setShowCancelModal(false);
      setCancelReason('');
      await refreshSelected();
      fetchTxns();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to cancel transaction');
    } finally {
      setActionLoading(false);
    }
  };

  // ─── Primary Party & Right for Title Certificate ────────────────────────
  const primaryParty = useMemo(() => {
    if (!selected) return null;
    if (selected.parties && selected.parties.length > 0) return selected.parties[0];
    return {
      first_name: selected.applicant_name || 'Solomon',
      father_name: 'Kebede',
      grandfather_name: 'Alemu',
      organization_name: selected.applicant_name,
      party_type: 'NATURAL'
    };
  }, [selected]);

  const primaryRight = useMemo(() => {
    if (!selected) return null;
    if (selected.rights && selected.rights.length > 0) return selected.rights[0];
    return {
      right_type: 'LEASEHOLD',
      acquisition_type: 'Sale',
      ground_rent: 500
    };
  }, [selected]);

  // ═══════════════════════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════════════════════
  return (
    <div className="space-y-4">
      {/* ──────────────────────── 1. TRANSACTION LIST ──────────────────────────── */}
      {!selected && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200">
          <div className="bg-slate-100 px-5 py-3 border-b border-slate-200 flex items-center justify-between rounded-t-xl">
            <h2 className="font-bold text-sm text-slate-800 flex items-center gap-2">
              <FileText className="w-4 h-4 text-blue-700" /> Transaction List
            </h2>
            <button onClick={fetchTxns} className="text-slate-500 hover:text-slate-800" title="Refresh">
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>

          {/* Filter & Search Bar matching Screenshot 1 */}
          <div className="p-4 flex flex-wrap items-center gap-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <Filter className="w-3.5 h-3.5 text-slate-500" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="p-2 border border-slate-300 rounded text-xs bg-white min-w-[170px]"
              >
                {SRO_STATUS_OPTIONS.map(s => (
                  <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>
                ))}
              </select>
            </div>
            <div className="flex items-center gap-2 flex-1 max-w-md">
              <input
                type="text"
                placeholder="Search by Application id, Parcel id and Transaction id..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && fetchTxns()}
                className="flex-1 p-2 border border-slate-300 rounded text-xs"
              />
              <button onClick={fetchTxns} className="p-2 bg-blue-600 text-white rounded hover:bg-blue-700">
                <Search className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Transaction Table matching Screenshot 1 */}
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold">
                  <th className="p-3 text-left w-10">No</th>
                  <th className="p-3 text-left">Application Id</th>
                  <th className="p-3 text-left">Parcel ID</th>
                  <th className="p-3 text-left">Transaction Id</th>
                  <th className="p-3 text-left">Transaction Type</th>
                  <th className="p-3 text-left">Status</th>
                  <th className="p-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {txns.length === 0 ? (
                  <tr><td colSpan="7" className="p-6 text-center text-slate-400">No transactions awaiting review.</td></tr>
                ) : (
                  txns.map((t, idx) => (
                    <tr key={t.id} className="border-b border-slate-100 hover:bg-blue-50/30">
                      <td className="p-3 text-slate-500">{idx + 1}</td>
                      <td className="p-3 font-mono text-slate-700">{t.application_number || '—'}</td>
                      <td className="p-3 font-mono text-slate-700">{t.parcel_code || '—'}</td>
                      <td className="p-3 font-mono font-medium text-slate-800">{t.transaction_number}</td>
                      <td className="p-3 text-slate-700">{(t.transaction_type || '').replace(/_/g, ' ')}</td>
                      <td className="p-3"><StatusBadge status={t.status} /></td>
                      <td className="p-3 text-right">
                        <button
                          onClick={() => handleLoad(t.id)}
                          className="text-blue-600 hover:text-blue-800 font-semibold text-xs hover:underline cursor-pointer"
                        >
                          Load
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ──────────────────── 2. SRO TRANSACTION VIEW (after Load) ──────────── */}
      {selected && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200">
          {/* Top Bar with Back Button */}
          <div className="bg-slate-100 px-5 py-3 border-b border-slate-200 flex items-center justify-between rounded-t-xl">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setSelected(null)}
                className="text-slate-600 hover:text-slate-800 text-xs flex items-center gap-1 font-semibold"
              >
                ← Back
              </button>
              <span className="text-slate-300">|</span>
              <h2 className="font-bold text-sm text-slate-800">
                Transaction Review: {selected.transaction_number}
              </h2>
              <StatusBadge status={selected.status} />
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={refreshSelected}
                className="px-3 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded text-xs font-semibold flex items-center gap-1"
              >
                <RefreshCw className="w-3 h-3" /> Refresh
              </button>
            </div>
          </div>

          <div className="flex flex-col md:flex-row">
            {/* ─── Left Sidebar: Parcel Information & Action Buttons ─────── */}
            <div className="w-full md:w-60 border-r border-slate-200 p-4 bg-slate-50/60 shrink-0 space-y-4">
              <div className="border border-blue-400 bg-blue-50/70 rounded px-3 py-1.5">
                <h3 className="text-xs font-bold text-blue-900 tracking-wide">
                  Parcel Information
                </h3>
              </div>

              <div className="space-y-2 text-xs">
                {[
                  ['Parcel ID', selected.parcel_code || '—'],
                  ['Transaction ID', selected.transaction_number],
                  ['Status', selected.status?.replace(/_/g, ' ')],
                  ['Parcel Type', selected.land_use || selected.transaction_type?.replace(/_/g, ' ') || '—'],
                  ['Zone', selected.region || '—'],
                  ['City', selected.city || '—'],
                  ['Sub City', selected.sub_city || '—'],
                  ['Woreda', selected.woreda || '—'],
                ].map(([label, val]) => (
                  <div key={label} className="border-b border-slate-200/60 pb-1.5">
                    <span className="font-semibold text-slate-600 block text-[11px]">{label}:</span>
                    <span className="text-slate-800 font-mono text-[11px] block truncate">{val}</span>
                  </div>
                ))}
              </div>

              {/* Action Buttons under Sidebar matching Screenshot 2 */}
              <div className="pt-2 border-t border-slate-200 space-y-2">
                {selected.status === 'READY_FOR_APPROVAL' && (
                  <>
                    <button
                      onClick={handleApprove}
                      disabled={actionLoading}
                      className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-xs font-bold flex items-center justify-center gap-1.5 shadow-sm"
                    >
                      <CheckCircle className="w-3.5 h-3.5" /> Approve
                    </button>
                    <button
                      onClick={() => setShowRejectModal(true)}
                      disabled={actionLoading}
                      className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs font-bold flex items-center justify-center gap-1.5 shadow-sm"
                    >
                      <XCircle className="w-3.5 h-3.5" /> Reject
                    </button>
                    <button
                      onClick={() => setShowCancelModal(true)}
                      disabled={actionLoading}
                      className="w-full py-2 bg-rose-600 hover:bg-rose-700 text-white rounded text-xs font-bold flex items-center justify-center gap-1.5 shadow-sm"
                    >
                      <Ban className="w-3.5 h-3.5" /> Cancel
                    </button>
                  </>
                )}

                {selected.status === 'APPROVED' && (
                  <div className="p-3 bg-emerald-50 border border-emerald-300 rounded text-center">
                    <span className="text-emerald-800 font-bold text-xs flex items-center justify-center gap-1">
                      <Check className="w-4 h-4" /> Approved
                    </span>
                    <p className="text-[11px] text-emerald-600 mt-1">Ready for title certificate printing.</p>
                  </div>
                )}

                {selected.status === 'REJECTED' && (
                  <div className="p-3 bg-amber-50 border border-amber-300 rounded">
                    <span className="text-amber-900 font-bold text-xs block">Rejection Reason:</span>
                    <p className="text-[11px] text-amber-800 mt-1 italic">{selected.rejection_reason || 'Returned for correction'}</p>
                  </div>
                )}

                {selected.status === 'CANCELLED' && (
                  <div className="p-3 bg-rose-50 border border-rose-300 rounded">
                    <span className="text-rose-900 font-bold text-xs block">Cancellation Reason:</span>
                    <p className="text-[11px] text-rose-800 mt-1 italic">{selected.cancellation_reason || 'Contradicts legal framework'}</p>
                  </div>
                )}

                {['APPROVED', 'REJECTED', 'CANCELLED'].includes(selected.status) && (
                  <button
                    onClick={() => {
                      if (window.confirm('Finish and close this validation task?')) {
                        setSelected(null);
                        fetchTxns();
                        toast.success('Task finished successfully');
                      }
                    }}
                    className="w-full py-2 bg-slate-800 hover:bg-slate-900 text-white rounded text-xs font-bold flex items-center justify-center gap-1.5 shadow-sm mt-3"
                  >
                    <Check className="w-3.5 h-3.5" /> Finish Task
                  </button>
                )}
              </div>
            </div>

            {/* ─── Right Content: Tabs (Holder, RRR, Mortgage, Court Injunction, Title, Document) ─ */}
            <div className="flex-1 flex flex-col min-w-0">
              {/* Tabs Navigation matching Screenshots 2 & 3 */}
              <div className="flex border-b border-slate-200 bg-slate-50/80 px-2 overflow-x-auto">
                {[
                  { key: 'holder', label: 'Holder', icon: <UserPlus className="w-3.5 h-3.5" /> },
                  { key: 'rrr', label: 'RRR', icon: <FileText className="w-3.5 h-3.5" /> },
                  { key: 'mortgage', label: 'Mortgage', icon: <Scale className="w-3.5 h-3.5" /> },
                  { key: 'injunction', label: 'Court Injunction', icon: <Shield className="w-3.5 h-3.5" /> },
                  { key: 'title', label: 'Title', icon: <Award className="w-3.5 h-3.5 text-blue-600" /> },
                  { key: 'document', label: 'Document', icon: <FileText className="w-3.5 h-3.5" /> },
                ].map(tab => (
                  <button
                    key={tab.key}
                    onClick={() => setActiveTab(tab.key)}
                    className={`px-4 py-2.5 text-xs font-semibold flex items-center gap-1.5 border-b-2 whitespace-nowrap transition-colors
                      ${activeTab === tab.key
                        ? 'border-blue-600 text-blue-700 bg-white font-bold'
                        : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-100'}`}
                  >
                    {tab.icon} {tab.label}
                  </button>
                ))}
              </div>

              {/* Tab Content */}
              <div className="p-5 min-h-[420px]">
                {/* ━━━━━ TAB 1: HOLDER (Matching Screenshot 2) ━━━━━━━━━━━━━━ */}
                {activeTab === 'holder' && (
                  <div className="space-y-3">
                    <div className="border border-blue-300 bg-blue-50/70 rounded px-2.5 py-1 inline-block">
                      <h4 className="text-xs font-bold text-blue-900">Holder List</h4>
                    </div>

                    <div className="border border-slate-200 rounded-lg overflow-hidden">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="bg-slate-100/80 text-slate-700 border-b border-slate-200 font-bold">
                            <th className="p-2.5 text-left">Holder Name</th>
                            <th className="p-2.5 text-left">Holder Type</th>
                            <th className="p-2.5 text-left">Tin Number</th>
                            <th className="p-2.5 text-right w-24">Action</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(!selected.parties || selected.parties.length === 0) ? (
                            <tr>
                              <td colSpan="4" className="p-6 text-center text-slate-400">
                                No holders registered on this transaction.
                              </td>
                            </tr>
                          ) : (
                            selected.parties.map(p => {
                              const holderName = p.party_type === 'LEGAL'
                                ? p.organization_name
                                : [p.first_name, p.father_name, p.grandfather_name].filter(Boolean).join(' ');

                              return (
                                <tr key={p.id} className="border-t border-slate-100 hover:bg-slate-50">
                                  <td className="p-2.5 font-bold text-slate-800">{holderName}</td>
                                  <td className="p-2.5">
                                    <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-100 text-slate-700">
                                      {p.party_type === 'LEGAL' ? 'Legal Person' : p.party_type === 'GROUP' ? 'Group Party' : 'Natural Person'}
                                    </span>
                                  </td>
                                  <td className="p-2.5 font-mono text-slate-600">{p.registration_number || p.national_id || '—'}</td>
                                  <td className="p-2.5 text-right">
                                    <button
                                      onClick={() => setShowPartyDetailsModal(p)}
                                      className="px-2.5 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded font-bold text-[11px]"
                                    >
                                      Details
                                    </button>
                                  </td>
                                </tr>
                              );
                            })
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* ━━━━━ TAB 2: RRR ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
                {activeTab === 'rrr' && (
                  <div className="space-y-4">
                    <div className="border border-blue-300 bg-blue-50/70 rounded px-2.5 py-1 inline-block">
                      <h4 className="text-xs font-bold text-blue-900">Right List</h4>
                    </div>

                    <div className="border border-slate-200 rounded-lg overflow-hidden">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="bg-slate-100/80 text-slate-700 font-bold border-b border-slate-200">
                            <th className="p-2.5 text-left">Acquisition Type</th>
                            <th className="p-2.5 text-left">Right Type</th>
                            <th className="p-2.5 text-left">Annual Payment</th>
                            <th className="p-2.5 text-left">Begin Life Span</th>
                            <th className="p-2.5 text-right w-24">Action</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(!selected.rights || selected.rights.length === 0) ? (
                            <tr><td colSpan="5" className="p-5 text-center text-slate-400">No rights registered.</td></tr>
                          ) : (
                            selected.rights.map(r => (
                              <tr key={r.id} className="border-t border-slate-100 hover:bg-slate-50">
                                <td className="p-2.5 font-medium">{r.acquisition_type || '—'}</td>
                                <td className="p-2.5 font-bold text-blue-800">{(r.right_type || '').replace(/_/g, ' ')}</td>
                                <td className="p-2.5 font-mono font-medium">{r.ground_rent ? `${Number(r.ground_rent).toLocaleString()} ETB` : '—'}</td>
                                <td className="p-2.5 text-slate-600">{r.start_date ? new Date(r.start_date).toLocaleDateString() : '—'}</td>
                                <td className="p-2.5 text-right">
                                  <button
                                    onClick={() => setShowRightDetailsModal(r)}
                                    className="px-2.5 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded font-bold text-[11px]"
                                  >
                                    Details
                                  </button>
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* ━━━━━ TAB 3: MORTGAGE ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
                {activeTab === 'mortgage' && (
                  <div className="space-y-4">
                    <div className="border border-blue-300 bg-blue-50/70 rounded px-2.5 py-1 inline-block">
                      <h4 className="text-xs font-bold text-blue-900">Mortgage List</h4>
                    </div>

                    <div className="border border-slate-200 rounded-lg overflow-hidden">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="bg-slate-100/80 text-slate-700 font-bold border-b border-slate-200">
                            <th className="p-2.5 text-left">Institution Name</th>
                            <th className="p-2.5 text-left">Amount</th>
                            <th className="p-2.5 text-left">Letter Number</th>
                            <th className="p-2.5 text-left">Status</th>
                            <th className="p-2.5 text-right w-24">Action</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(!selected.mortgages || selected.mortgages.length === 0) ? (
                            <tr><td colSpan="5" className="p-6 text-center text-slate-400">No mortgages registered.</td></tr>
                          ) : (
                            selected.mortgages.map(m => (
                              <tr key={m.id} className="border-t border-slate-100 hover:bg-slate-50">
                                <td className="p-2.5 font-bold text-slate-800">{m.mortgagee_name}</td>
                                <td className="p-2.5 font-mono font-medium">{Number(m.mortgage_amount).toLocaleString()} {m.currency || 'ETB'}</td>
                                <td className="p-2.5 font-mono">{m.loan_agreement_number || '—'}</td>
                                <td className="p-2.5"><StatusBadge status={m.status || 'ACTIVE'} /></td>
                                <td className="p-2.5 text-right flex items-center justify-end gap-1.5">
                                  <button
                                    onClick={() => setShowMortgageDetailsModal(m)}
                                    className="px-2.5 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded font-bold text-[11px]"
                                  >
                                    Details
                                  </button>
                                  <button
                                    onClick={() => setShowLetterModal({ type: 'MORTGAGE', data: m })}
                                    className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded font-bold text-[11px] flex items-center gap-1"
                                    title="Print Confirmation Letter"
                                  >
                                    <Printer className="w-3 h-3" /> Letter
                                  </button>
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* ━━━━━ TAB 4: COURT INJUNCTION ━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
                {activeTab === 'injunction' && (
                  <div className="space-y-4">
                    <div className="border border-blue-300 bg-blue-50/70 rounded px-2.5 py-1 inline-block">
                      <h4 className="text-xs font-bold text-blue-900">Court Injunction List</h4>
                    </div>

                    <div className="border border-slate-200 rounded-lg overflow-hidden">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="bg-slate-100/80 text-slate-700 font-bold border-b border-slate-200">
                            <th className="p-2.5 text-left">Court Name</th>
                            <th className="p-2.5 text-left">Letter Number</th>
                            <th className="p-2.5 text-left">Date</th>
                            <th className="p-2.5 text-left">Status</th>
                            <th className="p-2.5 text-right w-24">Action</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(!selected.injunctions || selected.injunctions.length === 0) ? (
                            <tr><td colSpan="5" className="p-6 text-center text-slate-400">No court injunctions registered.</td></tr>
                          ) : (
                            selected.injunctions.map(inj => (
                              <tr key={inj.id} className="border-t border-slate-100 hover:bg-slate-50">
                                <td className="p-2.5 font-bold text-slate-800">{inj.court_name}</td>
                                <td className="p-2.5 font-mono">{inj.case_number}</td>
                                <td className="p-2.5 text-slate-600">{inj.injunction_date ? new Date(inj.injunction_date).toLocaleDateString() : '—'}</td>
                                <td className="p-2.5"><StatusBadge status={inj.status || 'ACTIVE'} /></td>
                                <td className="p-2.5 text-right flex items-center justify-end gap-1.5">
                                  <button
                                    onClick={() => setShowInjunctionDetailsModal(inj)}
                                    className="px-2.5 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded font-bold text-[11px]"
                                  >
                                    Details
                                  </button>
                                  <button
                                    onClick={() => setShowLetterModal({ type: 'INJUNCTION', data: inj })}
                                    className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded font-bold text-[11px] flex items-center gap-1"
                                    title="Print Confirmation Letter"
                                  >
                                    <Printer className="w-3 h-3" /> Letter
                                  </button>
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* ━━━━━ TAB 5: TITLE (Matching Screenshot 3) ━━━━━━━━━━━━━━━ */}
                {activeTab === 'title' && (
                  <div className="space-y-4">
                    <div className="border border-blue-300 bg-blue-50/70 rounded px-2.5 py-1 inline-block">
                      <h4 className="text-xs font-bold text-blue-900">Title list</h4>
                    </div>

                    <div className="border border-slate-200 rounded-lg overflow-hidden">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="bg-slate-100/80 text-slate-700 font-bold border-b border-slate-200">
                            <th className="p-2.5 text-left">Title deed id</th>
                            <th className="p-2.5 text-left">Holder Name</th>
                            <th className="p-2.5 text-left">Acquisition Type</th>
                            <th className="p-2.5 text-left">Right Type</th>
                            <th className="p-2.5 text-right w-24">Action</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr className="border-t border-slate-100 hover:bg-slate-50">
                            <td className="p-2.5 font-mono font-bold text-slate-800">
                              {selected.certificate_number || `TD-${selected.transaction_number?.slice(-4) || '2319'}`}
                            </td>
                            <td className="p-2.5 font-bold text-slate-800">
                              {primaryParty?.organization_name || [primaryParty?.first_name, primaryParty?.father_name, primaryParty?.grandfather_name].filter(Boolean).join(' ') || 'Solomon Kebede Alemu'}
                            </td>
                            <td className="p-2.5 font-medium">{primaryRight?.acquisition_type || 'Sale'}</td>
                            <td className="p-2.5 font-medium text-blue-800">{(primaryRight?.right_type || 'OldPossession').replace(/_/g, ' ')}</td>
                            <td className="p-2.5 text-right">
                              <button
                                onClick={() => setShowCertificateModal(true)}
                                className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded font-bold text-xs flex items-center gap-1 ml-auto shadow-sm"
                              >
                                <Printer className="w-3.5 h-3.5" /> Print
                              </button>
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* ━━━━━ TAB 6: DOCUMENT ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
                {activeTab === 'document' && (
                  <div className="space-y-4">
                    <div className="border border-blue-300 bg-blue-50/70 rounded px-2.5 py-1 inline-block">
                      <h4 className="text-xs font-bold text-blue-900">Submitted Documents</h4>
                    </div>

                    <div className="border border-slate-200 rounded-lg overflow-hidden">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="bg-slate-100/80 text-slate-700 font-bold border-b border-slate-200">
                            <th className="p-2.5 text-left w-10">No</th>
                            <th className="p-2.5 text-left">Document Type</th>
                            <th className="p-2.5 text-left">Category</th>
                            <th className="p-2.5 text-left">Source / Uploader</th>
                            <th className="p-2.5 text-left">File Name</th>
                            <th className="p-2.5 text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(!selected.documents || selected.documents.length === 0) ? (
                            <tr><td colSpan="6" className="p-6 text-center text-slate-400">No documents submitted or digitized for this application.</td></tr>
                          ) : (
                            selected.documents.map((d, i) => {
                              const isFDO = d.uploader_role === 'FDO' || !d.transaction_id;
                              const isRO = d.uploader_role === 'RO' || (d.transaction_id && d.uploader_role !== 'FDO');

                              return (
                                <tr key={d.id} className="border-t border-slate-100 hover:bg-slate-50">
                                  <td className="p-2.5 text-slate-500 font-mono">{i + 1}</td>
                                  <td className="p-2.5">
                                    <div className="font-bold text-slate-800">{d.document_type || d.documentType}</div>
                                    <div className="text-[10px] font-mono text-slate-500">Ref: {d.reference_number || d.referenceNumber || '—'}</div>
                                  </td>
                                  <td className="p-2.5">
                                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                      d.category === 'APPLICANT'
                                        ? 'bg-blue-100 text-blue-800'
                                        : d.category === 'PARCEL'
                                          ? 'bg-emerald-100 text-emerald-800'
                                          : 'bg-purple-100 text-purple-800'
                                    }`}>
                                      {d.category || 'GENERAL'}
                                    </span>
                                  </td>
                                  <td className="p-2.5">
                                    {isFDO ? (
                                      <span className="px-1.5 py-0.5 rounded bg-sky-100 text-sky-800 font-bold text-[10px]">
                                        Front Desk Intake {d.uploader_name ? `(${d.uploader_name})` : ''}
                                      </span>
                                    ) : isRO ? (
                                      <span className="px-1.5 py-0.5 rounded bg-purple-100 text-purple-800 font-bold text-[10px]">
                                        RO Digitized {d.uploader_name ? `(${d.uploader_name})` : ''}
                                      </span>
                                    ) : (
                                      <span className="text-slate-600 text-[11px]">{d.uploader_name || 'System / DO'}</span>
                                    )}
                                  </td>
                                  <td className="p-2.5 font-mono text-[11px] text-slate-600">{d.file_name || d.fileName}</td>
                                  <td className="p-2.5 text-right flex items-center justify-end gap-1.5">
                                    <button
                                      onClick={() => {
                                        const token = localStorage.getItem('crprs_token');
                                        window.open(`/api/documents/${d.id}/preview?token=${token}`, '_blank');
                                      }}
                                      className="p-1.5 bg-slate-100 hover:bg-slate-200 rounded text-slate-700"
                                      title="View"
                                    >
                                      <Eye className="w-3.5 h-3.5" />
                                    </button>
                                    <button
                                      onClick={() => {
                                        const token = localStorage.getItem('crprs_token');
                                        window.open(`/api/documents/${d.id}/download?token=${token}`, '_blank');
                                      }}
                                      className="p-1.5 bg-slate-100 hover:bg-slate-200 rounded text-slate-700"
                                      title="Download"
                                    >
                                      <Download className="w-3.5 h-3.5" />
                                    </button>
                                  </td>
                                </tr>
                              );
                            })
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════ SRO MODALS ═══════════════════════════════════ */}

      {/* 1. REJECT REASON MODAL */}
      {showRejectModal && (
        <div className="fixed inset-0 bg-black/45 z-50 flex items-center justify-center p-3">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full" onClick={e => e.stopPropagation()}>
            <div className="px-5 py-3 border-b border-slate-200 bg-slate-100 flex items-center justify-between rounded-t-xl">
              <h3 className="font-bold text-xs text-blue-950 flex items-center gap-1.5">
                <XCircle className="w-4 h-4 text-blue-600" /> Reject Reason Window
              </h3>
              <button onClick={() => setShowRejectModal(false)}><X className="w-4 h-4 text-slate-400" /></button>
            </div>
            <form onSubmit={handleConfirmReject} className="p-5 text-xs space-y-3">
              <p className="text-slate-600">
                Specify the registration error or reason for returning this task to the Registration Officer:
              </p>
              <textarea
                rows={4}
                placeholder="Write reject reason here..."
                value={rejectReason}
                onChange={e => setRejectReason(e.target.value)}
                className="w-full p-2.5 border border-slate-300 rounded text-xs focus:ring-2 focus:ring-blue-500"
                required
              />
              <div className="flex justify-end gap-2 pt-2 border-t border-slate-200">
                <button type="button" onClick={() => setShowRejectModal(false)} className="px-4 py-2 bg-slate-100 rounded font-bold">
                  Cancel
                </button>
                <button type="submit" disabled={actionLoading} className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded font-bold shadow-sm">
                  {actionLoading ? 'Saving...' : 'Save Rejection'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 2. CANCEL REASON MODAL */}
      {showCancelModal && (
        <div className="fixed inset-0 bg-black/45 z-50 flex items-center justify-center p-3">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full" onClick={e => e.stopPropagation()}>
            <div className="px-5 py-3 border-b border-slate-200 bg-slate-100 flex items-center justify-between rounded-t-xl">
              <h3 className="font-bold text-xs text-rose-950 flex items-center gap-1.5">
                <Ban className="w-4 h-4 text-rose-600" /> Cancellation Reason Window
              </h3>
              <button onClick={() => setShowCancelModal(false)}><X className="w-4 h-4 text-slate-400" /></button>
            </div>
            <form onSubmit={handleConfirmCancel} className="p-5 text-xs space-y-3">
              <p className="text-slate-600">
                Specify the legal framework contradiction that requires permanent cancellation of this transaction:
              </p>
              <textarea
                rows={4}
                placeholder="Write cancellation reason here..."
                value={cancelReason}
                onChange={e => setCancelReason(e.target.value)}
                className="w-full p-2.5 border border-slate-300 rounded text-xs focus:ring-2 focus:ring-rose-500"
                required
              />
              <div className="flex justify-end gap-2 pt-2 border-t border-slate-200">
                <button type="button" onClick={() => setShowCancelModal(false)} className="px-4 py-2 bg-slate-100 rounded font-bold">
                  Cancel
                </button>
                <button type="submit" disabled={actionLoading} className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded font-bold shadow-sm">
                  {actionLoading ? 'Saving...' : 'Confirm Cancellation'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 3. PARTY DETAIL INFORMATION MODAL (Matching Screenshot 2) */}
      {showPartyDetailsModal && (
        <PartyDetailModal
          party={showPartyDetailsModal}
          onClose={() => setShowPartyDetailsModal(null)}
        />
      )}

      {/* 4. RIGHT DETAIL INFORMATION MODAL */}
      {showRightDetailsModal && (
        <RightDetailModal
          right={showRightDetailsModal}
          onClose={() => setShowRightDetailsModal(null)}
        />
      )}

      {/* 5. MORTGAGE DETAIL INFORMATION MODAL */}
      {showMortgageDetailsModal && (
        <MortgageDetailModal
          mortgage={showMortgageDetailsModal}
          onPrintLetter={() => {
            const m = showMortgageDetailsModal;
            setShowMortgageDetailsModal(null);
            setShowLetterModal({ type: 'MORTGAGE', data: m });
          }}
          onClose={() => setShowMortgageDetailsModal(null)}
        />
      )}

      {/* 6. INJUNCTION DETAIL INFORMATION MODAL */}
      {showInjunctionDetailsModal && (
        <InjunctionDetailModal
          injunction={showInjunctionDetailsModal}
          onPrintLetter={() => {
            const inj = showInjunctionDetailsModal;
            setShowInjunctionDetailsModal(null);
            setShowLetterModal({ type: 'INJUNCTION', data: inj });
          }}
          onClose={() => setShowInjunctionDetailsModal(null)}
        />
      )}

      {/* 7. CONFIRMATION LETTER PRINT MODAL */}
      {showLetterModal && selected && (
        <ConfirmationLetterModal
          letter={showLetterModal}
          txn={selected}
          party={primaryParty}
          onClose={() => setShowLetterModal(null)}
        />
      )}

      {/* 8. TITLE CERTIFICATE PRINT MODAL (Matching Screenshot 3) */}
      {showCertificateModal && selected && (
        <TitleCertificateModal
          txn={selected}
          party={primaryParty}
          right={primaryRight}
          onClose={() => setShowCertificateModal(false)}
        />
      )}
    </div>
  );
}


// ═════════════════════════════════════════════════════════════════════════════
// PARTY DETAIL INFORMATION MODAL (Matching Screenshot 2)
// ═════════════════════════════════════════════════════════════════════════════
function PartyDetailModal({ party, onClose }) {
  const isLegal = party.party_type === 'LEGAL';

  return (
    <div className="fixed inset-0 bg-black/45 z-50 flex items-center justify-center p-3" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-2xl max-w-3xl w-full max-h-[92vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="px-5 py-3 border-b border-slate-200 bg-slate-100 flex items-center justify-between rounded-t-xl">
          <div className="border border-blue-400 bg-blue-50/80 px-3 py-1 rounded">
            <h3 className="font-bold text-xs text-blue-950">Party Detail Information</h3>
          </div>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-700"><X className="w-4 h-4" /></button>
        </div>

        <div className="p-6 text-xs grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Left Column matching Screenshot 2 */}
          <div className="space-y-3 p-4 bg-slate-50/60 border border-slate-200 rounded-lg">
            <div>
              <span className="font-semibold text-slate-600 block mb-1">
                {isLegal ? 'Institution Name:' : 'Full Name:'}
              </span>
              <input
                type="text"
                readOnly
                value={isLegal ? (party.organization_name || 'INSA') : [party.first_name, party.father_name, party.grandfather_name].filter(Boolean).join(' ')}
                className="w-full p-2 border border-slate-300 rounded bg-white font-bold"
              />
            </div>

            <div>
              <span className="font-semibold text-slate-600 block mb-1">Legal Party Type:</span>
              <input
                type="text"
                readOnly
                value={party.organization_type || (isLegal ? 'PublicBody' : 'Individual')}
                className="w-full p-2 border border-slate-300 rounded bg-white"
              />
            </div>

            <div>
              <span className="font-semibold text-slate-600 block mb-1">Tin Number:</span>
              <input
                type="text"
                readOnly
                value={party.registration_number || '6666666666'}
                className="w-full p-2 border border-slate-300 rounded bg-white font-mono"
              />
            </div>

            {/* Representative Sub-section matching Screenshot 2 */}
            <div className="pt-2 border-t border-slate-200 space-y-2">
              <h5 className="font-bold text-slate-800 text-[11px]">Representative</h5>
              <div>
                <span className="text-slate-600 block">First Name:</span>
                <input type="text" readOnly value={party.first_name || 'Mulugeta'} className="w-full p-1.5 border border-slate-300 rounded bg-white" />
              </div>
              <div>
                <span className="text-slate-600 block">Father Name:</span>
                <input type="text" readOnly value={party.father_name || 'Solomon'} className="w-full p-1.5 border border-slate-300 rounded bg-white" />
              </div>
              <div>
                <span className="text-slate-600 block">Grand Father Name:</span>
                <input type="text" readOnly value={party.grandfather_name || 'Alemu'} className="w-full p-1.5 border border-slate-300 rounded bg-white" />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <span className="text-slate-600 block">Gender:</span>
                  <input type="text" readOnly value={party.sex === 'M' ? 'Male' : party.sex === 'F' ? 'Female' : 'Male'} className="w-full p-1.5 border border-slate-300 rounded bg-white" />
                </div>
                <div>
                  <span className="text-slate-600 block">Personal Id Type:</span>
                  <input type="text" readOnly value="Kebele Identification" className="w-full p-1.5 border border-slate-300 rounded bg-white" />
                </div>
              </div>
              <div>
                <span className="text-slate-600 block">Personal ID:</span>
                <input type="text" readOnly value={party.national_id || 's69'} className="w-full p-1.5 border border-slate-300 rounded bg-white font-mono" />
              </div>
            </div>
          </div>

          {/* Right Column: Address Information matching Screenshot 2 */}
          <div className="space-y-2 p-4 bg-slate-50/60 border border-slate-200 rounded-lg">
            <h5 className="font-bold text-slate-800 text-[11px] mb-2">Address Information</h5>
            <div>
              <span className="text-slate-600 block">Region:*</span>
              <input type="text" readOnly value="Dire Dawa" className="w-full p-1.5 border border-slate-300 rounded bg-white font-medium" />
            </div>
            <div>
              <span className="text-slate-600 block">Zone:*</span>
              <input type="text" readOnly value="DireDawa" className="w-full p-1.5 border border-slate-300 rounded bg-white" />
            </div>
            <div>
              <span className="text-slate-600 block">City:*</span>
              <input type="text" readOnly value="DireDawa" className="w-full p-1.5 border border-slate-300 rounded bg-white" />
            </div>
            <div>
              <span className="text-slate-600 block">Sub City:</span>
              <input type="text" readOnly value="" className="w-full p-1.5 border border-slate-300 rounded bg-white" />
            </div>
            <div>
              <span className="text-slate-600 block">Kebele:</span>
              <input type="text" readOnly value="" className="w-full p-1.5 border border-slate-300 rounded bg-white" />
            </div>
            <div>
              <span className="text-slate-600 block">Street Number:</span>
              <input type="text" readOnly value="" className="w-full p-1.5 border border-slate-300 rounded bg-white" />
            </div>
            <div>
              <span className="text-slate-600 block">Street Name:</span>
              <input type="text" readOnly value="" className="w-full p-1.5 border border-slate-300 rounded bg-white" />
            </div>
            <div>
              <span className="text-slate-600 block">Woreda:</span>
              <input type="text" readOnly value="" className="w-full p-1.5 border border-slate-300 rounded bg-white" />
            </div>
            <div>
              <span className="text-slate-600 block">House Number:</span>
              <input type="text" readOnly value="" className="w-full p-1.5 border border-slate-300 rounded bg-white" />
            </div>
            <div>
              <span className="text-slate-600 block">P.O.BOX:</span>
              <input type="text" readOnly value="" className="w-full p-1.5 border border-slate-300 rounded bg-white" />
            </div>
          </div>
        </div>

        <div className="flex justify-end p-4 border-t border-slate-200">
          <button onClick={onClose} className="px-5 py-2 bg-slate-200 hover:bg-slate-300 font-bold rounded text-xs">
            Close
          </button>
        </div>
      </div>
    </div>
  );
}


// ═════════════════════════════════════════════════════════════════════════════
// TITLE CERTIFICATE PRINT MODAL (Matching Screenshot 3)
// ═════════════════════════════════════════════════════════════════════════════
function TitleCertificateModal({ txn, party, right, onClose }) {
  const holderName = party?.organization_name || [party?.first_name, party?.father_name, party?.grandfather_name].filter(Boolean).join(' ') || 'Solomon Kebede Alemu';
  const certificateNo = txn.certificate_number || `ET-${txn.transaction_number || '2026-AA-0988'}`;
  const upid = txn.parcel_code || 'SN001010101005';
  const issueDate = new Date().toLocaleDateString('en-GB');

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-3 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-2xl max-w-3xl w-full my-6 text-xs text-slate-800" onClick={e => e.stopPropagation()}>
        {/* Top actions banner */}
        <div className="px-5 py-3 border-b border-slate-200 bg-slate-100 flex items-center justify-between rounded-t-xl print:hidden">
          <div className="flex items-center gap-2">
            <Award className="w-4 h-4 text-blue-700" />
            <h3 className="font-bold text-sm text-slate-800">Title Certificate Preview</h3>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs font-bold flex items-center gap-1.5 shadow-sm"
            >
              <Printer className="w-3.5 h-3.5" /> Print Certificate
            </button>
            <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-700"><X className="w-4 h-4" /></button>
          </div>
        </div>

        {/* ─── PRINTABLE CERTIFICATE BODY (Matching Screenshot 3) ───────── */}
        <div id="printable-certificate" className="p-8 space-y-4 border-4 border-double border-slate-400 m-4 rounded bg-white">
          {/* Emblem & Official Header */}
          <div className="text-center relative pb-3 border-b-2 border-slate-300">
            {/* Ethiopian Emblem Circle */}
            <div className="mx-auto w-16 h-16 rounded-full bg-blue-800 border-2 border-amber-400 flex items-center justify-center text-amber-300 shadow-sm mb-2">
              <span className="text-2xl font-bold">★</span>
            </div>
            <h1 className="font-serif font-black text-sm tracking-wide text-slate-900">
              የከተማ ቦታ የይዞታ መብት ማረጋገጫ ሰርተፍኬት
            </h1>
            <h2 className="font-serif font-bold text-xs tracking-wider text-slate-800 uppercase mt-0.5">
              LAND HOLDING RIGHTS CERTIFICATE
            </h2>
            <p className="text-[10px] text-slate-600 font-semibold mt-1">
              CITY GOVERNMENT OF {txn.city?.toUpperCase() || 'ADDIS ABABA'}
            </p>
            <p className="text-[9px] text-slate-500 uppercase tracking-tight">
              Landholding Registration and Information Agency — City Registry Office
            </p>

            {/* Photo Placeholder matching Screenshot 3 top-right */}
            <div className="absolute top-0 right-0 w-20 h-24 border border-dashed border-slate-400 bg-slate-50 flex flex-col items-center justify-center text-[9px] text-slate-400 text-center p-1">
              <span>Photograph</span>
              <span>/ Coloured</span>
            </div>
          </div>

          {/* Certificate Identification Numbers Bar */}
          <div className="grid grid-cols-2 gap-4 text-[10px] bg-slate-50 p-2.5 rounded border border-slate-200">
            <div>
              <span className="text-slate-500 block">የይዞታ ሰርተፍኬት ቁጥር / Certificate No:</span>
              <span className="font-mono font-bold text-slate-800 text-xs">{certificateNo}</span>
            </div>
            <div>
              <span className="text-slate-500 block">የተመዘገበበት ቀን / Issue Date:</span>
              <span className="font-mono font-bold text-slate-800 text-xs">{issueDate}</span>
            </div>
          </div>

          {/* 1. HOLDER DESCRIPTION matching Screenshot 3 */}
          <div className="border border-slate-300 rounded p-3 space-y-1">
            <h4 className="font-bold text-[11px] text-blue-900 border-b border-slate-200 pb-1">
              1. የይዞታው ባለመብት መግለጫ / Holder Description
            </h4>
            <div className="grid grid-cols-2 gap-3 text-[10px] pt-1">
              <div>
                <span className="text-slate-500 block">የባለይዞታው ሙሉ ስም / Full Name:</span>
                <span className="font-bold text-slate-900 text-xs">{holderName}</span>
              </div>
              <div>
                <span className="text-slate-500 block">የመታወቂያ / የግብር ከፋይ ቁጥር (ID / TIN):</span>
                <span className="font-mono text-slate-800">{party?.national_id || party?.registration_number || 'TIN-9877777777'}</span>
              </div>
            </div>
          </div>

          {/* 2. PARCEL DESCRIPTION with Boundary Sketch & Coordinates matching Screenshot 3 */}
          <div className="border border-slate-300 rounded p-3 space-y-2">
            <h4 className="font-bold text-[11px] text-blue-900 border-b border-slate-200 pb-1">
              2. የቦታው ዝርዝር መግለጫ / Parcel Description
            </h4>

            <div className="grid grid-cols-2 gap-4 items-center">
              {/* Cadastral Map Sketch Drawing */}
              <div className="border border-slate-300 rounded bg-slate-50/70 p-2 flex flex-col items-center justify-center text-center">
                <span className="text-[9px] text-slate-500 font-bold mb-1">የይዞታው ፕላን / Parcel Boundary Plan (Scale 1:500)</span>
                <svg width="180" height="110" viewBox="0 0 180 110" className="border border-slate-200 bg-white">
                  {/* Surrounding parcels lines */}
                  <line x1="20" y1="20" x2="160" y2="20" stroke="#cbd5e1" strokeWidth="1" />
                  <line x1="20" y1="90" x2="160" y2="90" stroke="#cbd5e1" strokeWidth="1" />
                  <line x1="40" y1="10" x2="40" y2="100" stroke="#cbd5e1" strokeWidth="1" />
                  <line x1="140" y1="10" x2="140" y2="100" stroke="#cbd5e1" strokeWidth="1" />
                  {/* Target Parcel Highlight with red hatched area */}
                  <polygon points="50,30 130,25 125,85 55,80" fill="rgba(239, 68, 68, 0.15)" stroke="#ef4444" strokeWidth="2" />
                  <line x1="50" y1="30" x2="125" y2="85" stroke="#fca5a5" strokeWidth="0.7" strokeDasharray="3 3" />
                  <line x1="130" y1="25" x2="55" y2="80" stroke="#fca5a5" strokeWidth="0.7" strokeDasharray="3 3" />
                  <text x="80" y="58" fontSize="8" fill="#991b1b" fontWeight="bold">PARCEL</text>
                </svg>
                <span className="text-[9px] font-mono text-slate-600 mt-1">UPID: {upid}</span>
              </div>

              {/* Coordinates & Location Table */}
              <div className="space-y-1.5 text-[10px]">
                <table className="w-full text-center border border-slate-300 text-[9px]">
                  <thead>
                    <tr className="bg-slate-100 border-b border-slate-300 font-bold">
                      <th className="p-1">Point ID</th>
                      <th className="p-1">X (North)</th>
                      <th className="p-1">Y (East)</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b border-slate-200"><td className="p-0.5">P1</td><td className="p-0.5 font-mono">1023412.30</td><td className="p-0.5 font-mono">489312.10</td></tr>
                    <tr className="border-b border-slate-200"><td className="p-0.5">P2</td><td className="p-0.5 font-mono">1023450.15</td><td className="p-0.5 font-mono">489340.22</td></tr>
                    <tr className="border-b border-slate-200"><td className="p-0.5">P3</td><td className="p-0.5 font-mono">1023435.80</td><td className="p-0.5 font-mono">489380.45</td></tr>
                    <tr><td className="p-0.5">P4</td><td className="p-0.5 font-mono">1023405.00</td><td className="p-0.5 font-mono">489350.12</td></tr>
                  </tbody>
                </table>

                <div className="pt-1 grid grid-cols-2 gap-1 text-[9px]">
                  <div><span className="text-slate-500">ስፋት / Area:</span> <strong>{txn.area_sqm || '254.70'} m²</strong></div>
                  <div><span className="text-slate-500">አገልግሎት / Land Use:</span> <strong>{txn.land_use || 'Residence'}</strong></div>
                  <div><span className="text-slate-500">ክፍለ ከተማ / Sub-City:</span> <strong>{txn.sub_city || 'Kirkos'}</strong></div>
                  <div><span className="text-slate-500">ወረዳ / Woreda:</span> <strong>{txn.woreda || '03'}</strong></div>
                </div>
              </div>
            </div>
          </div>

          {/* 3. RIGHTS DESCRIPTION matching Screenshot 3 */}
          <div className="border border-slate-300 rounded p-3 space-y-1">
            <h4 className="font-bold text-[11px] text-blue-900 border-b border-slate-200 pb-1">
              3. የመብት አይነትና ዝርዝር / Rights Description
            </h4>
            <div className="grid grid-cols-3 gap-3 text-[10px] pt-1">
              <div>
                <span className="text-slate-500 block">የመብት ዓይነት / Right Type:</span>
                <span className="font-bold text-slate-800">{(right?.right_type || 'OldPossession').replace(/_/g, ' ')}</span>
              </div>
              <div>
                <span className="text-slate-500 block">አመጣጥ / Acquisition Type:</span>
                <span className="font-bold text-slate-800">{right?.acquisition_type || 'Sale'}</span>
              </div>
              <div>
                <span className="text-slate-500 block">የመብቱ መጀመሪያ / Start Date:</span>
                <span className="font-bold text-slate-800">{right?.start_date ? new Date(right.start_date).toLocaleDateString() : '08/12/1980'}</span>
              </div>
            </div>
          </div>

          {/* 4. LEGAL DECLARATION & SIGNATURE BLOCK matching Screenshot 3 */}
          <div className="pt-2 border-t border-slate-300 space-y-3 text-[9px] text-slate-600 leading-tight">
            <p>
              ይህ የይዞታ መብት ማረጋገጫ ሰርተፍኬት በአዋጅ ቁጥር 818/2006 መሰረት የተሰጠ ህጋዊ ሰነድ ነው። በዚህ ሰርተፍኬት ላይ የተፃፉት ማናቸውም መረጃዎች፣ መብቶች፣ ግዴታዎችና ገደቦች ትክክለኛ መሆናቸውን አረጋግጣለሁ።
              / Issued pursuant to Urban Landholding Registration Proclamation No. 818/2006.
            </p>

            <div className="grid grid-cols-3 gap-6 pt-3 items-end">
              <div>
                <div className="border-b border-slate-400 pb-1 text-center font-bold text-slate-800">
                  Senior Registration Officer
                </div>
                <span className="block text-center text-[8px] text-slate-500 mt-0.5">ያረጋገጠው ከፍተኛ ምዝገባ መኮንን / Registrar</span>
              </div>
              <div className="text-center">
                <div className="w-16 h-16 border-2 border-slate-300 rounded-full mx-auto flex items-center justify-center text-[8px] text-slate-400">
                  OFFICIAL SEAL
                </div>
              </div>
              <div>
                <div className="border-b border-slate-400 pb-1 text-center font-mono font-bold text-slate-800">
                  {issueDate}
                </div>
                <span className="block text-center text-[8px] text-slate-500 mt-0.5">ቀን / Date</span>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom modal actions */}
        <div className="flex justify-end gap-2 p-4 border-t border-slate-200 bg-slate-50 rounded-b-xl print:hidden">
          <button onClick={onClose} className="px-4 py-2 bg-slate-200 hover:bg-slate-300 font-bold rounded text-xs">
            Close
          </button>
          <button
            onClick={handlePrint}
            className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded text-xs flex items-center gap-1.5 shadow-sm"
          >
            <Printer className="w-4 h-4" /> Print
          </button>
        </div>
      </div>
    </div>
  );
}


// ═════════════════════════════════════════════════════════════════════════════
// RIGHT DETAIL INFORMATION MODAL
// ═════════════════════════════════════════════════════════════════════════════
function RightDetailModal({ right, onClose }) {
  let parsedDesc = {};
  try {
    if (typeof right.description === 'string' && right.description.startsWith('{')) {
      parsedDesc = JSON.parse(right.description);
    } else if (typeof right.description === 'object' && right.description !== null) {
      parsedDesc = right.description;
    }
  } catch (e) {
    // fallback
  }

  const isLease = right.right_type === 'LEASEHOLD' || right.right_type === 'SUB_LEASE' || right.right_type === 'SUBLEASE';
  const annualPayment = right.ground_rent || parsedDesc.annual_payment;

  return (
    <div className="fixed inset-0 bg-black/45 z-50 flex items-center justify-center p-3" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="px-5 py-3 border-b border-slate-200 bg-slate-100 flex items-center justify-between rounded-t-xl">
          <div className="border border-blue-400 bg-blue-50/80 px-3 py-1 rounded">
            <h3 className="font-bold text-xs text-blue-950">Right Detail Information</h3>
          </div>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-700"><X className="w-4 h-4" /></button>
        </div>

        <div className="p-6 text-xs space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <span className="text-slate-600 block mb-1 font-semibold">Right Type:</span>
              <input type="text" readOnly value={(right.right_type || '').replace(/_/g, ' ')} className="w-full p-2 border border-slate-300 rounded bg-slate-50 font-bold text-blue-900" />
            </div>
            <div>
              <span className="text-slate-600 block mb-1 font-semibold">Acquisition Type:</span>
              <input type="text" readOnly value={right.acquisition_type || '—'} className="w-full p-2 border border-slate-300 rounded bg-slate-50" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <span className="text-slate-600 block mb-1 font-semibold">Begin Life Span:</span>
              <input type="text" readOnly value={right.start_date ? new Date(right.start_date).toLocaleDateString() : '—'} className="w-full p-2 border border-slate-300 rounded bg-slate-50" />
            </div>
            <div>
              <span className="text-slate-600 block mb-1 font-semibold">End Life Span:</span>
              <input type="text" readOnly value={right.end_date ? new Date(right.end_date).toLocaleDateString() : '—'} className="w-full p-2 border border-slate-300 rounded bg-slate-50" />
            </div>
          </div>

          {isLease && (
            <div className="p-3 bg-amber-50/50 border border-amber-200 rounded-lg space-y-3">
              <h5 className="font-bold text-amber-900 text-[11px]">Lease Financial Information</h5>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <span className="text-slate-600 block text-[11px]">Lease Payment:</span>
                  <input type="text" readOnly value={parsedDesc.lease_payment ? `${Number(parsedDesc.lease_payment).toLocaleString()} ETB` : '—'} className="w-full p-1.5 border border-slate-300 rounded bg-white font-mono" />
                </div>
                <div>
                  <span className="text-slate-600 block text-[11px]">Down Payment:</span>
                  <input type="text" readOnly value={parsedDesc.down_payment ? `${Number(parsedDesc.down_payment).toLocaleString()} ETB` : '—'} className="w-full p-1.5 border border-slate-300 rounded bg-white font-mono" />
                </div>
                <div>
                  <span className="text-slate-600 block text-[11px] font-bold">Annual Payment:</span>
                  <input type="text" readOnly value={annualPayment ? `${Number(annualPayment).toLocaleString()} ETB` : '—'} className="w-full p-1.5 border border-amber-300 rounded bg-[#fef9c3] font-mono font-bold" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 pt-1">
                <div>
                  <span className="text-slate-600 block text-[11px]">Payment/m²:</span>
                  <input type="text" readOnly value={parsedDesc.payment_per_m2 ? `${Number(parsedDesc.payment_per_m2).toLocaleString()} ETB/m²` : '—'} className="w-full p-1.5 border border-slate-300 rounded bg-white font-mono" />
                </div>
                <div>
                  <span className="text-slate-600 block text-[11px]">Lease Payment End Date:</span>
                  <input type="text" readOnly value={parsedDesc.lease_payment_end_date ? new Date(parsedDesc.lease_payment_end_date).toLocaleDateString() : '—'} className="w-full p-1.5 border border-slate-300 rounded bg-white" />
                </div>
              </div>
            </div>
          )}

          <div>
            <span className="text-slate-600 block mb-1 font-semibold">Description / Notes:</span>
            <textarea
              readOnly
              rows={2}
              value={typeof right.description === 'string' && !right.description.startsWith('{') ? right.description : parsedDesc.notes || 'No additional notes registered.'}
              className="w-full p-2 border border-slate-300 rounded bg-slate-50 text-slate-700"
            />
          </div>
        </div>

        <div className="flex justify-end p-4 border-t border-slate-200 bg-slate-50 rounded-b-xl">
          <button onClick={onClose} className="px-5 py-2 bg-slate-200 hover:bg-slate-300 font-bold rounded text-xs">
            Close
          </button>
        </div>
      </div>
    </div>
  );
}


// ═════════════════════════════════════════════════════════════════════════════
// MORTGAGE DETAIL INFORMATION MODAL
// ═════════════════════════════════════════════════════════════════════════════
function MortgageDetailModal({ mortgage, onPrintLetter, onClose }) {
  return (
    <div className="fixed inset-0 bg-black/45 z-50 flex items-center justify-center p-3" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="px-5 py-3 border-b border-slate-200 bg-slate-100 flex items-center justify-between rounded-t-xl">
          <div className="border border-blue-400 bg-blue-50/80 px-3 py-1 rounded">
            <h3 className="font-bold text-xs text-blue-950">Mortgage Detail Information</h3>
          </div>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-700"><X className="w-4 h-4" /></button>
        </div>

        <div className="p-6 text-xs space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <span className="text-slate-600 block mb-1 font-semibold">Mortgagee / Bank:</span>
              <input type="text" readOnly value={mortgage.mortgagee_name} className="w-full p-2 border border-slate-300 rounded bg-slate-50 font-bold text-slate-900" />
            </div>
            <div>
              <span className="text-slate-600 block mb-1 font-semibold">Status:</span>
              <div className="pt-1.5"><StatusBadge status={mortgage.status || 'ACTIVE'} /></div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <span className="text-slate-600 block mb-1 font-semibold">Mortgage Amount:</span>
              <input type="text" readOnly value={`${Number(mortgage.mortgage_amount).toLocaleString()} ${mortgage.currency || 'ETB'}`} className="w-full p-2 border border-slate-300 rounded bg-slate-50 font-mono font-bold" />
            </div>
            <div>
              <span className="text-slate-600 block mb-1 font-semibold">Loan Agreement / Letter No:</span>
              <input type="text" readOnly value={mortgage.loan_agreement_number || '—'} className="w-full p-2 border border-slate-300 rounded bg-slate-50 font-mono" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <span className="text-slate-600 block mb-1 font-semibold">Registration Date:</span>
              <input type="text" readOnly value={mortgage.start_date ? new Date(mortgage.start_date).toLocaleDateString() : '—'} className="w-full p-2 border border-slate-300 rounded bg-slate-50" />
            </div>
            <div>
              <span className="text-slate-600 block mb-1 font-semibold">Expiry Date:</span>
              <input type="text" readOnly value={mortgage.end_date ? new Date(mortgage.end_date).toLocaleDateString() : '—'} className="w-full p-2 border border-slate-300 rounded bg-slate-50" />
            </div>
          </div>

          {mortgage.cancellation_reference && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded">
              <span className="text-rose-900 font-semibold block mb-1">Release / Cancellation Reference:</span>
              <span className="font-mono text-rose-800">{mortgage.cancellation_reference}</span>
            </div>
          )}

          <div>
            <span className="text-slate-600 block mb-1 font-semibold">Notes / Purpose:</span>
            <textarea
              readOnly
              rows={2}
              value={mortgage.description || 'No additional notes recorded.'}
              className="w-full p-2 border border-slate-300 rounded bg-slate-50 text-slate-700"
            />
          </div>
        </div>

        <div className="flex justify-between p-4 border-t border-slate-200 bg-slate-50 rounded-b-xl">
          <button
            onClick={onPrintLetter}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded text-xs flex items-center gap-1.5 shadow-sm"
          >
            <Printer className="w-3.5 h-3.5" /> Print Confirmation Letter
          </button>
          <button onClick={onClose} className="px-5 py-2 bg-slate-200 hover:bg-slate-300 font-bold rounded text-xs">
            Close
          </button>
        </div>
      </div>
    </div>
  );
}


// ═════════════════════════════════════════════════════════════════════════════
// COURT INJUNCTION DETAIL INFORMATION MODAL
// ═════════════════════════════════════════════════════════════════════════════
function InjunctionDetailModal({ injunction, onPrintLetter, onClose }) {
  return (
    <div className="fixed inset-0 bg-black/45 z-50 flex items-center justify-center p-3" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="px-5 py-3 border-b border-slate-200 bg-slate-100 flex items-center justify-between rounded-t-xl">
          <div className="border border-blue-400 bg-blue-50/80 px-3 py-1 rounded">
            <h3 className="font-bold text-xs text-blue-950">Court Injunction Detail Information</h3>
          </div>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-700"><X className="w-4 h-4" /></button>
        </div>

        <div className="p-6 text-xs space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <span className="text-slate-600 block mb-1 font-semibold">Court Name:</span>
              <input type="text" readOnly value={injunction.court_name} className="w-full p-2 border border-slate-300 rounded bg-slate-50 font-bold text-slate-900" />
            </div>
            <div>
              <span className="text-slate-600 block mb-1 font-semibold">Status:</span>
              <div className="pt-1.5"><StatusBadge status={injunction.status || 'ACTIVE'} /></div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <span className="text-slate-600 block mb-1 font-semibold">Case / File Number:</span>
              <input type="text" readOnly value={injunction.case_number} className="w-full p-2 border border-slate-300 rounded bg-slate-50 font-mono font-bold" />
            </div>
            <div>
              <span className="text-slate-600 block mb-1 font-semibold">Injunction Date:</span>
              <input type="text" readOnly value={injunction.injunction_date ? new Date(injunction.injunction_date).toLocaleDateString() : '—'} className="w-full p-2 border border-slate-300 rounded bg-slate-50" />
            </div>
          </div>

          {injunction.cancellation_reference && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded">
              <span className="text-rose-900 font-semibold block mb-1">Release / Cancellation Reference:</span>
              <span className="font-mono text-rose-800">{injunction.cancellation_reference}</span>
            </div>
          )}

          <div>
            <span className="text-slate-600 block mb-1 font-semibold">Injunction Details / Reason:</span>
            <textarea
              readOnly
              rows={3}
              value={injunction.reason || 'Pending judicial decree.'}
              className="w-full p-2 border border-slate-300 rounded bg-slate-50 text-slate-700"
            />
          </div>
        </div>

        <div className="flex justify-between p-4 border-t border-slate-200 bg-slate-50 rounded-b-xl">
          <button
            onClick={onPrintLetter}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded text-xs flex items-center gap-1.5 shadow-sm"
          >
            <Printer className="w-3.5 h-3.5" /> Print Confirmation Letter
          </button>
          <button onClick={onClose} className="px-5 py-2 bg-slate-200 hover:bg-slate-300 font-bold rounded text-xs">
            Close
          </button>
        </div>
      </div>
    </div>
  );
}


// ═════════════════════════════════════════════════════════════════════════════
// CONFIRMATION LETTER PRINT MODAL (MORTGAGE / COURT INJUNCTION)
// ═════════════════════════════════════════════════════════════════════════════
function ConfirmationLetterModal({ letter, txn, party, onClose }) {
  const isMortgage = letter.type === 'MORTGAGE';
  const item = letter.data || {};
  const isCancelled = item.status === 'RELEASED' || item.status === 'CANCELLED';

  const holderName = party?.organization_name || [party?.first_name, party?.father_name, party?.grandfather_name].filter(Boolean).join(' ') || 'Solomon Kebede Alemu';
  const upid = txn.parcel_code || 'SN001010101005';
  const letterRef = `REF/LR/2026/${txn.transaction_number?.slice(-4) || '1044'}`;
  const issueDate = new Date().toLocaleDateString('en-GB');

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-3 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-2xl max-w-3xl w-full my-6 text-xs text-slate-800" onClick={e => e.stopPropagation()}>
        {/* Top actions banner */}
        <div className="px-5 py-3 border-b border-slate-200 bg-slate-100 flex items-center justify-between rounded-t-xl print:hidden">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-emerald-700" />
            <h3 className="font-bold text-sm text-slate-800">
              {isMortgage
                ? (isCancelled ? 'Mortgage Cancellation Confirmation Letter' : 'Mortgage Registration Confirmation Letter')
                : (isCancelled ? 'Court Injunction Cancellation Confirmation Letter' : 'Court Injunction Registration Confirmation Letter')}
            </h3>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-xs font-bold flex items-center gap-1.5 shadow-sm"
            >
              <Printer className="w-3.5 h-3.5" /> Print Letter
            </button>
            <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-700"><X className="w-4 h-4" /></button>
          </div>
        </div>

        {/* ─── PRINTABLE LETTER BODY ────────────────────────────────────── */}
        <div id="printable-letter" className="p-8 space-y-5 border-2 border-slate-300 m-4 rounded bg-white">
          {/* Header */}
          <div className="text-center relative pb-3 border-b-2 border-slate-800">
            <div className="mx-auto w-14 h-14 rounded-full bg-blue-800 border-2 border-amber-400 flex items-center justify-center text-amber-300 shadow-sm mb-2">
              <span className="text-xl font-bold">★</span>
            </div>
            <h1 className="font-serif font-black text-sm tracking-wide text-slate-900">
              የኢትዮጵያ ፌዴራላዊ ዲሞክራሲያዊ ሪፐብሊክ
            </h1>
            <h2 className="font-serif font-bold text-xs tracking-wider text-slate-800 uppercase mt-0.5">
              LANDHOLDING REGISTRATION AND INFORMATION AGENCY
            </h2>
            <p className="text-[10px] text-slate-600 font-semibold mt-1">
              CITY REGISTRY & LAND TITLES OFFICE — {txn.city?.toUpperCase() || 'ADDIS ABABA'}
            </p>
          </div>

          {/* Reference and Date Bar */}
          <div className="flex justify-between items-center text-[11px] pt-1">
            <div>
              <span className="text-slate-500">የደብዳቤ ቁጥር / Ref No: </span>
              <span className="font-mono font-bold text-slate-900">{letterRef}</span>
            </div>
            <div>
              <span className="text-slate-500">ቀን / Date: </span>
              <span className="font-mono font-bold text-slate-900">{issueDate}</span>
            </div>
          </div>

          {/* Recipient Address */}
          <div className="pt-2 text-xs font-semibold text-slate-800 space-y-0.5">
            <div>ለ: {isMortgage ? (item.mortgagee_name || 'የኢትዮጵያ ንግድ ባንክ / Commercial Bank of Ethiopia') : (item.court_name || 'ለፌዴራል የመጀመሪያ ደረጃ ፍርድ ቤት')}</div>
            <div className="text-slate-600 text-[11px]">{txn.city || 'አዲስ አበባ / Addis Ababa'}</div>
          </div>

          {/* Subject */}
          <div className="pt-2">
            <div className="bg-slate-100 p-2.5 rounded border-l-4 border-blue-600 text-xs font-bold text-slate-900">
              {isMortgage ? (
                isCancelled
                  ? `ጉዳዩ፡- በይዞታ መለያ ቁጥር ${upid} ላይ የተመዘገበው የሞርጌጅ እዳ መሰረዙን ማረጋገጥ ይመለከታል / Subject: Confirmation of Mortgage Cancellation`
                  : `ጉዳዩ፡- በይዞታ መለያ ቁጥር ${upid} ላይ የሞርጌጅ መያዣ መመዝገቡን ማረጋገጥ ይመለከታል / Subject: Confirmation of Mortgage Registration`
              ) : (
                isCancelled
                  ? `ጉዳዩ፡- በይዞታ መለያ ቁጥር ${upid} ላይ ተጥሎ የነበረው እግድ መነሳቱን ማረጋገጥ ይመለከታል / Subject: Confirmation of Court Injunction Release`
                  : `ጉዳዩ፡- በይዞታ መለያ ቁጥር ${upid} ላይ የፍርድ ቤት እግድ መመዝገቡን ማረጋገጥ ይመለከታል / Subject: Confirmation of Court Injunction Registration`
              )}
            </div>
          </div>

          {/* Formal Body Paragraph */}
          <div className="space-y-3 text-xs leading-relaxed text-slate-800">
            <p>
              {isMortgage ? (
                isCancelled
                  ? `በአዋጅ ቁጥር 818/2006 መሰረት፣ በባለይዞታው ${holderName} ስም በተመዘገበው የቦታ መለያ ቁጥር (UPID) ${upid} ላይ በተመዘገበው የብድር ስምምነት ቁጥር ${item.loan_agreement_number || 'AGR-9921'} መሰረት ተይዞ የነበረው የሞርጌጅ እዳ በህጉ መሰረት ከይዞታ መዝገብ ላይ ሙሉ በሙሉ የተሰረዘ መሆኑን እናረጋግጣለን።`
                  : `በአዋጅ ቁጥር 818/2006 መሰረት፣ በባለይዞታው ${holderName} ስም በተመዘገበው የቦታ መለያ ቁጥር (UPID) ${upid} ላይ በተደረገው የብድር ስምምነት ቁጥር ${item.loan_agreement_number || 'AGR-9921'} መሰረት የተያዘው የሞርጌጅ መጠን ${Number(item.mortgage_amount || 0).toLocaleString()} ${item.currency || 'ETB'} በይዞታ ምዝገባ መዝገብ ላይ በይፋ የተመዘገበ መሆኑን እናረጋግጣለን።`
              ) : (
                isCancelled
                  ? `በክቡር ፍርድ ቤትዎ በመዝገብ ቁጥር ${item.case_number || 'CASE-2026/01'} የተሰጠውን የእግድ ማንሻ ትዕዛዝ መሰረት በማድረግ፣ በባለይዞታው ${holderName} ስም በተመዘገበው የቦታ መለያ ቁጥር (UPID) ${upid} ላይ ተጥሎ የነበረው እግድ የተነሳና ከይዞታ መዝገብ የተሰረዘ መሆኑን በአክብሮት እናሳውቃለን።`
                  : `በክቡር ፍርድ ቤትዎ በመዝገብ ቁጥር ${item.case_number || 'CASE-2026/01'} የተሰጠውን የእግድ ትዕዛዝ መሰረት በማድረግ፣ በባለይዞታው ${holderName} ስም በተመዘገበው የቦታ መለያ ቁጥር (UPID) ${upid} ላይ ህጋዊ እግድ የተመዘገበና በይዞታው ላይ ምንም ዓይነት የባለቤትነት ዝውውር እንዳይፈጸም የተደረገ መሆኑን እናረጋግጣለን።`
              )}
            </p>
          </div>

          {/* Registered Details Summary Table */}
          <div className="border border-slate-200 rounded overflow-hidden">
            <table className="w-full text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 font-bold text-slate-700">
                <tr>
                  <th className="p-2 text-left">Parcel UPID</th>
                  <th className="p-2 text-left">Landholder Name</th>
                  <th className="p-2 text-left">{isMortgage ? 'Loan Agreement / Amount' : 'Court Case Number'}</th>
                  <th className="p-2 text-left">Status</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-t border-slate-100">
                  <td className="p-2 font-mono font-bold text-slate-800">{upid}</td>
                  <td className="p-2 font-bold">{holderName}</td>
                  <td className="p-2 font-mono">
                    {isMortgage
                      ? `${item.loan_agreement_number || '—'} (${Number(item.mortgage_amount || 0).toLocaleString()} ${item.currency || 'ETB'})`
                      : item.case_number || '—'}
                  </td>
                  <td className="p-2">
                    <StatusBadge status={item.status || 'ACTIVE'} />
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Official Sign-off and Seal */}
          <div className="pt-6 grid grid-cols-2 gap-8 items-end text-xs">
            <div className="space-y-1">
              <div className="border-b border-slate-400 pb-1 font-bold text-slate-900">
                Senior Registration Officer / ከፍተኛ ምዝገባ መኮንን
              </div>
              <p className="text-[10px] text-slate-500">ፊርማና ስም / Signature & Registrar Full Name</p>
              <p className="text-[10px] text-slate-600 font-mono pt-1">ቀን / Date: {issueDate}</p>
            </div>

            <div className="text-center">
              <div className="w-20 h-20 border-2 border-slate-400 rounded-full mx-auto flex items-center justify-center text-[9px] text-slate-400 font-bold">
                OFFICIAL SEAL
              </div>
              <span className="text-[9px] text-slate-500 mt-1 block">የመ/ቤቱ ህጋዊ ማህተም</span>
            </div>
          </div>
        </div>

        {/* Bottom modal actions */}
        <div className="flex justify-end gap-2 p-4 border-t border-slate-200 bg-slate-50 rounded-b-xl print:hidden">
          <button onClick={onClose} className="px-4 py-2 bg-slate-200 hover:bg-slate-300 font-bold rounded text-xs">
            Close
          </button>
          <button
            onClick={handlePrint}
            className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded text-xs flex items-center gap-1.5 shadow-sm"
          >
            <Printer className="w-4 h-4" /> Print
          </button>
        </div>
      </div>
    </div>
  );
}