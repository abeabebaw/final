import React, { useState, useEffect } from 'react';
import API from '../../api/client';
import toast from 'react-hot-toast';
import {
  ShieldCheck, Search, Filter, RefreshCw, Eye, Calendar, User, Clock,
  Terminal, CheckCircle, AlertTriangle, XCircle, Info, ArrowRight,
  Copy, Check, ChevronDown, ChevronUp, Code, FileText, Globe, Layers
} from 'lucide-react';

// ─── Human Readable Configuration ───────────────────────────────────────────
const HUMAN_ACTIONS = {
  // Mortgages
  MORTGAGE_CREATED: {
    label: 'Mortgage Registered',
    category: 'Mortgage',
    badge: 'bg-emerald-100 text-emerald-800 border-emerald-300',
    summary: (log) => `A new mortgage charge was registered on the property in favor of ${log.new_value?.mortgagee_name || 'the bank'}.`
  },
  MORTGAGE_CANCELLED: {
    label: 'Mortgage Released / Cancelled',
    category: 'Mortgage',
    badge: 'bg-rose-100 text-rose-800 border-rose-300',
    summary: (log) => `The mortgage charge was officially released and cancelled from the property register${log.new_value?.cancellation_reference ? ` per reference: "${log.new_value.cancellation_reference}"` : ''}.`
  },
  MORTGAGE_UPDATED: {
    label: 'Mortgage Modified',
    category: 'Mortgage',
    badge: 'bg-blue-100 text-blue-800 border-blue-300',
    summary: () => `Mortgage terms or registration parameters were modified.`
  },

  // Court Injunctions
  INJUNCTION_CREATED: {
    label: 'Court Injunction Registered',
    category: 'Court Injunction',
    badge: 'bg-rose-100 text-rose-800 border-rose-300',
    summary: (log) => `A court injunction was placed on the parcel${log.new_value?.court_name ? ` by ${log.new_value.court_name}` : ''}${log.new_value?.case_number ? ` under case #${log.new_value.case_number}` : ''}.`
  },
  INJUNCTION_CANCELLED: {
    label: 'Court Injunction Released',
    category: 'Court Injunction',
    badge: 'bg-emerald-100 text-emerald-800 border-emerald-300',
    summary: (log) => `Court injunction restriction was lifted and cancelled${log.new_value?.cancellation_reference ? ` per court decree ref: "${log.new_value.cancellation_reference}"` : ''}.`
  },
  INJUNCTION_UPDATED: {
    label: 'Court Injunction Modified',
    category: 'Court Injunction',
    badge: 'bg-blue-100 text-blue-800 border-blue-300',
    summary: () => `Court injunction record was modified.`
  },

  // Administrative / General Restrictions
  GENERAL_RESTRICTION_CREATED: {
    label: 'Administrative Restriction Imposed',
    category: 'Restriction',
    badge: 'bg-amber-100 text-amber-800 border-amber-300',
    summary: (log) => `A general administrative restriction was registered on the parcel.`
  },
  GENERAL_RESTRICTION_CANCELLED: {
    label: 'Administrative Restriction Released',
    category: 'Restriction',
    badge: 'bg-slate-100 text-slate-800 border-slate-300',
    summary: (log) => `Administrative restriction was lifted${log.new_value?.cancellation_reference ? ` per ref: "${log.new_value.cancellation_reference}"` : ''}.`
  },

  // Rights (RRR)
  RIGHT_CREATED: {
    label: 'Holding Right (RRR) Registered',
    category: 'Rights',
    badge: 'bg-emerald-100 text-emerald-800 border-emerald-300',
    summary: (log) => `A new ${formatText(log.new_value?.right_type || log.new_value?.rightType || 'land')} right was registered on the property.`
  },
  RIGHT_UPDATED: {
    label: 'Holding Right Modified',
    category: 'Rights',
    badge: 'bg-blue-100 text-blue-800 border-blue-300',
    summary: () => `Holding right terms, lifespan, or payment schedule was modified.`
  },
  RIGHT_DELETED: {
    label: 'Holding Right Removed',
    category: 'Rights',
    badge: 'bg-rose-100 text-rose-800 border-rose-300',
    summary: () => `A draft property right was deleted from the transaction.`
  },

  // Parties / Landholders
  PARTY_CREATED: {
    label: 'Landholder / Party Registered',
    category: 'Party',
    badge: 'bg-emerald-100 text-emerald-800 border-emerald-300',
    summary: (log) => `A new ${formatText(log.new_value?.party_type || log.new_value?.partyType || 'landholder')} was registered.`
  },
  PARTY_UPDATED: {
    label: 'Landholder Details Modified',
    category: 'Party',
    badge: 'bg-blue-100 text-blue-800 border-blue-300',
    summary: () => `Landholder profile, identification, or representative info was modified.`
  },
  PARTY_DELETED: {
    label: 'Landholder Record Removed',
    category: 'Party',
    badge: 'bg-rose-100 text-rose-800 border-rose-300',
    summary: () => `A draft landholder record was deleted from the transaction.`
  },

  // Transactions Workflow
  TRANSACTION_CREATED: {
    label: 'Transaction Opened',
    category: 'Transaction',
    badge: 'bg-slate-100 text-slate-800 border-slate-300',
    summary: (log) => `A new registry transaction (${log.new_value?.transaction_number || log.new_value?.transactionNumber || 'TXN'}) was opened by Front Desk.`
  },
  TRANSACTION_INITIATED: {
    label: 'Transaction Initiated',
    category: 'Transaction',
    badge: 'bg-sky-100 text-sky-800 border-sky-300',
    summary: () => `Registration Officer initiated the task to begin processing.`
  },
  TRANSACTION_LOADED: {
    label: 'Transaction Loaded (In-Process)',
    category: 'Transaction',
    badge: 'bg-blue-100 text-blue-800 border-blue-300',
    summary: () => `Transaction loaded into active workspace (status changed to IN_PROCESS).`
  },
  TRANSACTION_FINISHED: {
    label: 'Registration Completed by Officer',
    category: 'Transaction',
    badge: 'bg-purple-100 text-purple-800 border-purple-300',
    summary: () => `Registration Officer completed data entry. Task is READY_FOR_APPROVAL.`
  },
  TRANSACTION_APPROVED: {
    label: 'Transaction Approved',
    category: 'Transaction',
    badge: 'bg-emerald-100 text-emerald-800 border-emerald-300',
    summary: () => `Senior Registration Officer officially approved the transaction and land title.`
  },
  TRANSACTION_REJECTED: {
    label: 'Transaction Rejected & Returned',
    category: 'Transaction',
    badge: 'bg-amber-100 text-amber-800 border-amber-300',
    summary: (log) => `Senior Officer rejected the task and returned it for correction${log.reason ? `: "${log.reason}"` : ''}.`
  },
  TRANSACTION_CANCELLED: {
    label: 'Transaction Legally Cancelled',
    category: 'Transaction',
    badge: 'bg-rose-100 text-rose-800 border-rose-300',
    summary: (log) => `Transaction was legally cancelled and stopped${log.reason ? `: "${log.reason}"` : ''}.`
  },

  // Documents
  DOCUMENT_UPLOADED: {
    label: 'Document Digitized / Uploaded',
    category: 'Document',
    badge: 'bg-emerald-100 text-emerald-800 border-emerald-300',
    summary: (log) => `A supporting document (${log.new_value?.document_type || log.new_value?.documentType || 'File'}) was digitized and attached.`
  },
  DOCUMENT_DELETED: {
    label: 'Document Deleted',
    category: 'Document',
    badge: 'bg-rose-100 text-rose-800 border-rose-300',
    summary: () => `An attached document was removed from the registry archive.`
  },

  // Auth / Security
  AUTH_LOGIN: {
    label: 'User Signed In',
    category: 'Security',
    badge: 'bg-slate-100 text-slate-700 border-slate-200',
    summary: () => `Officer authenticated and signed into the system successfully.`
  },
  AUTH_LOGOUT: {
    label: 'User Signed Out',
    category: 'Security',
    badge: 'bg-slate-100 text-slate-700 border-slate-200',
    summary: () => `Officer signed out of the system session.`
  },
  AUTH_LOGIN_FAILED: {
    label: 'Failed Login Attempt',
    category: 'Security',
    badge: 'bg-rose-100 text-rose-800 border-rose-300',
    summary: () => `An invalid sign-in attempt was detected.`
  }
};

function formatText(str) {
  if (!str) return '';
  return String(str).replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
}

function cleanIp(ip) {
  if (!ip) return '—';
  if (ip.includes('::ffff:127.0.0.1') || ip === '127.0.0.1' || ip === '::1') {
    return '127.0.0.1 (Localhost / Internal)';
  }
  return ip.replace('::ffff:', '');
}

export default function AuditLogs() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedLog, setSelectedLog] = useState(null);
  const [pagination, setPagination] = useState({ page: 1, limit: 25, total: 0, pages: 1 });
  
  const [filterAction, setFilterAction] = useState('');
  const [filterEntityType, setFilterEntityType] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  const fetchLogs = async (page = 1) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(pagination.limit)
      });
      if (filterAction) params.append('action', filterAction);
      if (filterEntityType) params.append('entity_type', filterEntityType);
      if (searchTerm) params.append('search', searchTerm);

      const { data } = await API.get(`/audit-logs?${params.toString()}`);
      setLogs(data.data || []);
      if (data.pagination) {
        setPagination(data.pagination);
      }
    } catch (err) {
      console.error(err);
      toast.error('Failed to load audit logs');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs(1);
  }, [filterAction, filterEntityType]);

  const handleSearch = (e) => {
    e.preventDefault();
    fetchLogs(1);
  };

  const getActionInfo = (action) => {
    if (HUMAN_ACTIONS[action]) return HUMAN_ACTIONS[action];
    const isCreate = action.includes('CREATE') || action.includes('ADD');
    const isApprove = action.includes('APPROVE');
    const isCancel = action.includes('CANCEL') || action.includes('REJECT') || action.includes('DELETE') || action.includes('FAIL');
    const isUpdate = action.includes('UPDATE') || action.includes('MODIFY') || action.includes('LOAD');

    return {
      label: formatText(action),
      badge: isCreate
        ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
        : isApprove
        ? 'bg-blue-100 text-blue-800 border-blue-300'
        : isCancel
        ? 'bg-rose-100 text-rose-800 border-rose-300'
        : isUpdate
        ? 'bg-amber-100 text-amber-800 border-amber-300'
        : 'bg-slate-100 text-slate-800 border-slate-300',
      summary: () => `Recorded system event: ${formatText(action)}.`
    };
  };

  return (
    <div className="space-y-4 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center gap-2 text-slate-900 font-bold text-lg">
            <ShieldCheck className="w-6 h-6 text-blue-700" />
            Audit & Activity Monitoring Trail
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Immutable log of land registry actions, RRR modifications, mortgage cancellations, and approvals.
          </p>
        </div>

        <button
          onClick={() => fetchLogs(pagination.page)}
          className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg flex items-center gap-1.5 border border-slate-300 transition"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} /> Refresh
        </button>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-wrap items-center justify-between gap-3 text-xs">
        <form onSubmit={handleSearch} className="flex items-center gap-2 flex-1 min-w-[240px]">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search action, reference letter, reason, or officer..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:ring-1 focus:ring-blue-500 outline-none"
            />
          </div>
          <button type="submit" className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg shadow-sm">
            Search
          </button>
        </form>

        <div className="flex items-center gap-2">
          <select
            value={filterAction}
            onChange={(e) => setFilterAction(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700"
          >
            <option value="">All Actions</option>
            <option value="MORTGAGE_CANCELLED">Mortgage Released / Cancelled</option>
            <option value="MORTGAGE_CREATED">Mortgage Registered</option>
            <option value="INJUNCTION_CANCELLED">Court Injunction Released</option>
            <option value="INJUNCTION_CREATED">Court Injunction Registered</option>
            <option value="TRANSACTION_APPROVED">Transaction Approved</option>
            <option value="TRANSACTION_REJECTED">Transaction Rejected</option>
            <option value="TRANSACTION_FINISHED">Transaction Completed</option>
            <option value="DOCUMENT_UPLOADED">Document Digitized</option>
            <option value="AUTH_LOGIN">Login Events</option>
          </select>

          <select
            value={filterEntityType}
            onChange={(e) => setFilterEntityType(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700"
          >
            <option value="">All Entities</option>
            <option value="MORTGAGE">Mortgages</option>
            <option value="COURT_INJUNCTION">Court Injunctions</option>
            <option value="GENERAL_RESTRICTION">Restrictions</option>
            <option value="RIGHT">Holding Rights (RRR)</option>
            <option value="PARTY">Parties / Holders</option>
            <option value="TRANSACTION">Transactions</option>
            <option value="APPLICATION">Applications</option>
            <option value="DOCUMENT">Documents</option>
          </select>
        </div>
      </div>

      {/* Audit Log Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600 border-collapse">
            <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200 uppercase tracking-wider text-[11px]">
              <tr>
                <th className="py-3 px-4">Date & Time</th>
                <th className="py-3 px-4">Action Performed</th>
                <th className="py-3 px-4">Entity Type</th>
                <th className="py-3 px-4">Officer / User</th>
                <th className="py-3 px-4">Client IP</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {loading && logs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400 font-sans">
                    Loading audit trail...
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400 font-sans">
                    No audit records match the current filters.
                  </td>
                </tr>
              ) : (
                logs.map((log) => {
                  const actInfo = getActionInfo(log.action);

                  return (
                    <tr key={log.id} className="hover:bg-blue-50/20 transition-colors">
                      <td className="py-3 px-4 text-slate-700 whitespace-nowrap">
                        <div className="font-semibold text-slate-800">
                          {new Date(log.created_at || log.createdAt).toLocaleDateString()}
                        </div>
                        <div className="text-[10px] text-slate-400">
                          {new Date(log.created_at || log.createdAt).toLocaleTimeString()}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span className={`inline-block px-2.5 py-1 rounded-md border text-[11px] font-bold ${actInfo.badge}`}>
                          {actInfo.label}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-semibold text-slate-800">
                        {formatText(log.entity_type) || 'Record'}
                      </td>
                      <td className="py-3 px-4 text-slate-800 font-medium">
                        <div className="flex items-center gap-1.5">
                          <User className="w-3.5 h-3.5 text-blue-600" />
                          <span>{log.user?.full_name || log.user?.username || (log.user_id ? 'Officer ' + log.user_id.substring(0, 8) : 'System')}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-slate-500 font-mono text-[11px]">
                        {cleanIp(log.ip_address)}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => setSelectedLog(log)}
                          className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold rounded-lg border border-blue-200 inline-flex items-center gap-1 transition shadow-sm text-xs"
                        >
                          <Eye className="w-3.5 h-3.5" /> Inspect Event
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div className="p-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-600">
          <div>
            Showing {logs.length} of {pagination.total} records (Page {pagination.page} of {pagination.pages})
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => fetchLogs(pagination.page - 1)}
              disabled={pagination.page <= 1}
              className="px-2.5 py-1 bg-white border border-slate-300 rounded disabled:opacity-40"
            >
              Previous
            </button>
            <button
              onClick={() => fetchLogs(pagination.page + 1)}
              disabled={pagination.page >= pagination.pages}
              className="px-2.5 py-1 bg-white border border-slate-300 rounded disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </div>
      </div>

      {/* ─── HUMAN-FRIENDLY EVENT INSPECTOR MODAL ─────────────────────────── */}
      {selectedLog && (
        <HumanAuditModal
          log={selectedLog}
          actionInfo={getActionInfo(selectedLog.action)}
          onClose={() => setSelectedLog(null)}
        />
      )}
    </div>
  );
}


// ═════════════════════════════════════════════════════════════════════════════
// HUMAN-FRIENDLY AUDIT EVENT INSPECTOR MODAL
// ═════════════════════════════════════════════════════════════════════════════
function HumanAuditModal({ log, actionInfo, onClose }) {
  const [showRawJson, setShowRawJson] = useState(false);
  const [copiedId, setCopiedId] = useState(false);

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2000);
    toast.success('Copied to clipboard');
  };

  const formattedDate = new Date(log.created_at || log.createdAt).toLocaleString(undefined, {
    dateStyle: 'full',
    timeStyle: 'medium'
  });

  const actorName = log.user?.full_name || log.user?.username || (log.user_id ? `User #${log.user_id.slice(0, 8)}` : 'System Automated Process');
  const actorRole = log.user?.role ? formatText(log.user.role) : 'Registration Officer';

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full my-6 overflow-hidden border border-slate-200 text-xs" onClick={e => e.stopPropagation()}>
        
        {/* Top Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-slate-900 to-blue-950 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-blue-600/30 border border-blue-400/40 rounded-xl text-blue-200">
              <ShieldCheck className="w-5 h-5 text-blue-300" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-white">Audit Log Event Inspector</h3>
              <p className="text-[11px] text-slate-300">Verified activity trail event & state changes</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition"
          >
            ✕
          </button>
        </div>

        <div className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
          {/* 1. Executive Plain-Language Summary Banner */}
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl space-y-1.5">
            <div className="flex items-center justify-between gap-2">
              <span className={`px-2.5 py-0.5 rounded-full border text-xs font-bold ${actionInfo.badge}`}>
                {actionInfo.label}
              </span>
              <span className="text-[11px] text-slate-500 font-mono">
                {formattedDate}
              </span>
            </div>
            <p className="text-slate-800 font-medium text-xs pt-1 leading-relaxed">
              {actionInfo.summary(log)}
            </p>
          </div>

          {/* 2. Key Metadata Cards */}
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
              <span className="text-[11px] text-slate-500 font-semibold block mb-0.5">Performed By (Actor)</span>
              <div className="font-bold text-slate-900 flex items-center gap-1.5">
                <User className="w-4 h-4 text-blue-600" />
                <span>{actorName}</span>
              </div>
              <span className="text-[10px] text-slate-500 block mt-0.5">Role: {actorRole}</span>
            </div>

            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
              <span className="text-[11px] text-slate-500 font-semibold block mb-0.5">Affected Entity</span>
              <div className="font-bold text-slate-900 flex items-center gap-1.5">
                <Layers className="w-4 h-4 text-emerald-600" />
                <span>{formatText(log.entity_type) || 'Record'}</span>
              </div>
              <span className="text-[10px] text-slate-500 font-mono truncate block mt-0.5" title={log.entity_id}>
                ID: {log.entity_id || '—'}
              </span>
            </div>
          </div>

          {/* 3. Reason or Note (if present) */}
          {log.reason && (
            <div className="p-3.5 bg-amber-50/70 border border-amber-200 rounded-xl text-xs space-y-1">
              <div className="flex items-center gap-1.5 text-amber-900 font-bold">
                <AlertTriangle className="w-4 h-4 text-amber-600" />
                <span>Recorded Reason / Explanation:</span>
              </div>
              <p className="text-amber-950 font-medium italic pl-5">"{log.reason}"</p>
            </div>
          )}

          {/* 4. Human-Readable State Changes / Payload */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-800 text-xs">
                State Changes & Details
              </span>
              <button
                type="button"
                onClick={() => setShowRawJson(!showRawJson)}
                className="text-[11px] font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-1"
              >
                <Code className="w-3.5 h-3.5" />
                <span>{showRawJson ? 'Switch to Human Friendly View' : 'View Raw JSON Code'}</span>
              </button>
            </div>

            {showRawJson ? (
              <pre className="bg-slate-900 text-emerald-400 p-4 rounded-xl overflow-x-auto text-[11px] font-mono border border-slate-800 max-h-60 leading-relaxed">
                {JSON.stringify(log.new_value || log.newValue || {}, null, 2)}
              </pre>
            ) : (
              <HumanPayloadViewer
                newValue={log.new_value || log.newValue}
                previousValue={log.previous_value || log.previousValue}
              />
            )}
          </div>

          {/* 5. Collapsible Technical / Security Details */}
          <details className="group border border-slate-200 rounded-xl overflow-hidden bg-slate-50/50">
            <summary className="p-3 text-[11px] font-bold text-slate-600 cursor-pointer flex items-center justify-between hover:bg-slate-100">
              <span className="flex items-center gap-1.5">
                <Globe className="w-3.5 h-3.5 text-slate-500" /> Technical Security & Audit Trail Trace
              </span>
              <span className="text-[10px] text-blue-600 group-open:rotate-180 transition-transform">▼</span>
            </summary>
            <div className="p-3.5 pt-1 space-y-2 border-t border-slate-200 text-[11px] bg-white">
              <div className="flex justify-between items-center py-1 border-b border-slate-100">
                <span className="text-slate-500">Client IP Address:</span>
                <span className="font-mono text-slate-800 font-semibold">{cleanIp(log.ip_address)}</span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-slate-100">
                <span className="text-slate-500">Trace Correlation ID:</span>
                <div className="flex items-center gap-1.5">
                  <span className="font-mono text-slate-700 text-[10px]">{log.correlation_id || '—'}</span>
                  {log.correlation_id && (
                    <button
                      onClick={() => copyToClipboard(log.correlation_id)}
                      className="p-1 hover:bg-slate-100 rounded text-slate-400 hover:text-slate-600"
                      title="Copy correlation ID"
                    >
                      {copiedId ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                    </button>
                  )}
                </div>
              </div>
              <div className="flex justify-between items-start py-1">
                <span className="text-slate-500 shrink-0 mr-2">User Agent:</span>
                <span className="font-mono text-slate-600 text-[10px] text-right truncate max-w-xs" title={log.user_agent}>
                  {log.user_agent || 'Standard Web Client'}
                </span>
              </div>
            </div>
          </details>
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex justify-between items-center">
          <span className="text-[11px] text-slate-400 font-mono">CRPRS Secure Audit Record #{log.id?.slice(0, 8)}</span>
          <button
            onClick={onClose}
            className="px-5 py-2 bg-slate-800 hover:bg-slate-900 text-white font-bold rounded-xl text-xs transition shadow-sm"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}


// ═════════════════════════════════════════════════════════════════════════════
// HUMAN PAYLOAD VIEWER COMPONENT (Replaces the raw JSON black box)
// ═════════════════════════════════════════════════════════════════════════════
function HumanPayloadViewer({ newValue, previousValue }) {
  if (!newValue && !previousValue) {
    return (
      <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-center text-slate-400 text-xs italic">
        No state change parameters recorded.
      </div>
    );
  }

  const formatKeyName = (key) => {
    const MAP = {
      status: 'Current Status',
      cancellation_reference: 'Cancellation / Release Reference',
      cancellationReference: 'Cancellation / Release Reference',
      mortgage_amount: 'Mortgage Amount',
      mortgageAmount: 'Mortgage Amount',
      loan_agreement_number: 'Loan Agreement Number',
      loanAgreementNumber: 'Loan Agreement Number',
      mortgagee_name: 'Mortgagee / Bank',
      mortgageeName: 'Mortgagee / Bank',
      currency: 'Currency',
      court_name: 'Court Name',
      courtName: 'Court Name',
      case_number: 'Case Number',
      caseNumber: 'Case Number',
      injunction_date: 'Injunction Date',
      injunctionDate: 'Injunction Date',
      right_type: 'Right Type',
      rightType: 'Right Type',
      acquisition_type: 'Acquisition Type',
      acquisitionType: 'Acquisition Type',
      ground_rent: 'Ground Rent / Annual Payment',
      groundRent: 'Ground Rent / Annual Payment',
      party_type: 'Party Type',
      partyType: 'Party Type',
      first_name: 'First Name',
      father_name: 'Father Name',
      grandfather_name: 'Grandfather Name',
      organization_name: 'Organization Name',
      transaction_number: 'Transaction ID',
      transactionNumber: 'Transaction ID',
      transaction_type: 'Transaction Type',
      transactionType: 'Transaction Type',
      application_number: 'Application ID',
      applicationNumber: 'Application ID',
      rejection_reason: 'Rejection Reason',
      cancellation_reason: 'Cancellation Reason',
      reason: 'Reason / Explanation',
      assigned_to: 'Assigned Officer ID',
      assignedTo: 'Assigned Officer ID',
      document_type: 'Document Type',
      documentType: 'Document Type',
      file_name: 'File Name',
      fileName: 'File Name'
    };
    if (MAP[key]) return MAP[key];
    return key.replace(/_/g, ' ').replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
  };

  const formatValue = (key, val) => {
    if (val === null || val === undefined || val === '') {
      return <span className="text-slate-400 italic font-normal">None</span>;
    }
    if (typeof val === 'boolean') {
      return (
        <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${val ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-700'}`}>
          {val ? 'Yes' : 'No'}
        </span>
      );
    }
    // Status formatting
    if (key.toLowerCase().includes('status')) {
      const isRed = ['CANCELLED', 'REJECTED', 'RELEASED'].includes(String(val).toUpperCase());
      const isGreen = ['APPROVED', 'ACTIVE', 'FINISHED', 'COMPLETED'].includes(String(val).toUpperCase());
      return (
        <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-bold ${
          isRed ? 'bg-rose-100 text-rose-800 border border-rose-300'
                : isGreen ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                : 'bg-blue-100 text-blue-800 border border-blue-300'
        }`}>
          {String(val).replace(/_/g, ' ')}
        </span>
      );
    }
    // Currency / Amount formatting
    if (key.toLowerCase().includes('amount') || key.toLowerCase().includes('rent') || key.toLowerCase().includes('payment')) {
      if (!isNaN(val)) {
        return <span className="font-mono font-bold text-slate-900">{Number(val).toLocaleString()} ETB</span>;
      }
    }
    // Letter / Reference formatting
    if (key.toLowerCase().includes('reference') || key.toLowerCase().includes('letter')) {
      return (
        <div className="flex items-center gap-1.5 font-mono font-bold text-blue-900 bg-blue-50 px-2 py-1 rounded border border-blue-200">
          <FileText className="w-3.5 h-3.5 text-blue-600" />
          <span>{String(val)}</span>
        </div>
      );
    }
    // Object / JSON sub-structure
    if (typeof val === 'object') {
      return (
        <pre className="text-[10px] bg-slate-100 p-2 rounded border border-slate-200 font-mono">
          {JSON.stringify(val, null, 2)}
        </pre>
      );
    }
    return <span className="font-semibold text-slate-800">{String(val)}</span>;
  };

  const newObj = typeof newValue === 'object' && newValue !== null ? newValue : {};
  const prevObj = typeof previousValue === 'object' && previousValue !== null ? previousValue : {};
  const allKeys = Array.from(new Set([...Object.keys(prevObj), ...Object.keys(newObj)]));

  if (allKeys.length === 0) {
    return (
      <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-center text-slate-500 text-xs">
        {String(newValue)}
      </div>
    );
  }

  return (
    <div className="border border-slate-200 rounded-xl overflow-hidden shadow-sm bg-white">
      <div className="divide-y divide-slate-100 text-xs">
        {allKeys.map(k => {
          const prev = prevObj[k];
          const next = newObj[k];
          const isChanged = prev !== undefined && next !== undefined && prev !== next;

          return (
            <div key={k} className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 hover:bg-slate-50/70 transition-colors">
              <span className="font-bold text-slate-600 sm:w-2/5">
                {formatKeyName(k)}
              </span>
              <div className="sm:w-3/5 flex items-center gap-2">
                {isChanged ? (
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="line-through text-slate-400 text-[11px]">{formatValue(k, prev)}</span>
                    <ArrowRight className="w-3.5 h-3.5 text-blue-600" />
                    <span>{formatValue(k, next)}</span>
                  </div>
                ) : (
                  <span>{formatValue(k, next !== undefined ? next : prev)}</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
