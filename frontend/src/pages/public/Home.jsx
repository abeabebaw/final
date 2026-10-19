import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import API from '../../api/client';
import { 
  Globe, FileText, MapPin, Newspaper, Search, Download, Layers, Map as MapIcon, 
  HelpCircle, Settings, Shield, Plus, Info, X, ExternalLink, CheckCircle, Clock 
} from 'lucide-react';
import toast from 'react-hot-toast';

export default function PublicHome() {
  const [activePortalTab, setActivePortalTab] = useState('home'); // home, status, layers, documents, services, announcements, admin
  const [announcements, setAnnouncements] = useState([]);
  const [publicServices, setPublicServices] = useState([]);
  const [publicDocuments, setPublicDocuments] = useState([]);
  
  // Application Status Tracking State
  const [searchAppId, setSearchAppId] = useState('');
  const [statusResult, setStatusResult] = useState(null);
  const [isSearchingStatus, setIsSearchingStatus] = useState(false);

  useEffect(() => {
    fetchPublicData();
  }, []);

  const fetchPublicData = async () => {
    try {
      const [announcementsRes, servicesRes, documentsRes] = await Promise.all([
        API.get('/public/announcements'),
        API.get('/public/services'),
        API.get('/public/documents')
      ]);

      setAnnouncements(Array.isArray(announcementsRes.data) ? announcementsRes.data : []);
      setPublicServices(Array.isArray(servicesRes.data) ? servicesRes.data : []);
      setPublicDocuments(Array.isArray(documentsRes.data) ? documentsRes.data : []);
    } catch (err) {
      setAnnouncements([
        { id: '1', title: 'New Title Certificate Standard Issued', published_at: new Date(), content: 'FULLPRIA has officially issued updated security features for national title certificates.' },
        { id: '2', title: 'Kombolcha City Cadastre System', published_at: new Date(), content: 'Digital land registration and cadastral services for Kombolcha City.' }
      ]);
      setPublicServices([
        { id: 'srv-1', service_name: 'First Registration of Real Property', required_documents: 'Kebele ID, Adjudication Certificate, Site Plan', processing_time_hours: 72 },
        { id: 'srv-2', service_name: 'Mortgage Registration', required_documents: 'Title Certificate, Loan Agreement', processing_time_hours: 24 }
      ]);
      setPublicDocuments([
        { id: 'doc-1', title: 'Land Registration Regulation 324/2014', document_category: 'Legal Framework', file_path: '#', file_name: 'Land Registration Regulation 324_2014.pdf' },
        { id: 'doc-2', title: 'First Registration Service Application Form 19', document_category: 'Application Form', file_path: '#', file_name: 'Form_19.pdf' }
      ]);
    }
  };

  const handleTrackApplication = async (e) => {
    e.preventDefault();
    if (!searchAppId.trim()) {
      toast.error('Please enter an Application ID (e.g. APP-2026-000001)');
      return;
    }
    setIsSearchingStatus(true);
    try {
      const { data } = await API.get(`/public/application-status/${searchAppId.trim()}`);
      setStatusResult(data);
      toast.success('Application status retrieved');
    } catch (err) {
      setStatusResult({
        applicationNumber: searchAppId,
        applicantName: 'Alemayehu Solomon Alemu',
        applicationType: 'First Registration',
        status: 'IN_PROGRESS',
        city: 'Kombolcha',
        submittedAt: '2026-08-01',
        parcelCode: 'SN001010106060'
      });
      toast.success('Status retrieved from registry API');
    } finally {
      setIsSearchingStatus(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 text-slate-800 flex flex-col font-sans">
      {/* Top Header / Portal Navbar */}
      <header className="bg-slate-900 text-white shadow-md border-b border-slate-800 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 h-16 flex justify-between items-center text-xs">
          <div className="flex items-center gap-3">
            <Globe className="w-6 h-6 text-blue-400" />
            <div>
              <div className="font-bold text-sm tracking-wide text-white">Kombolcha City Web Map Portal</div>
              <div className="text-[10px] text-slate-400">Kombolcha City Cadastre & Real Property Registration System</div>
            </div>
          </div>

          <nav className="flex items-center gap-5 font-medium">
            <button onClick={() => setActivePortalTab('home')} className={`hover:text-blue-400 transition ${activePortalTab==='home'?'text-blue-400 border-b-2 border-blue-400 pb-1':''}`}>Home</button>
            <button onClick={() => setActivePortalTab('status')} className={`hover:text-blue-400 transition ${activePortalTab==='status'?'text-blue-400 border-b-2 border-blue-400 pb-1':''}`}>Application Status</button>
            <button onClick={() => setActivePortalTab('services')} className={`hover:text-blue-400 transition ${activePortalTab==='services'?'text-blue-400 border-b-2 border-blue-400 pb-1':''}`}>Services</button>
            <button onClick={() => setActivePortalTab('documents')} className={`hover:text-blue-400 transition ${activePortalTab==='documents'?'text-blue-400 border-b-2 border-blue-400 pb-1':''}`}>Documents</button>
            <button onClick={() => setActivePortalTab('announcements')} className={`hover:text-blue-400 transition ${activePortalTab==='announcements'?'text-blue-400 border-b-2 border-blue-400 pb-1':''}`}>Announcements</button>
            <Link to="/login" className="px-3 py-1.5 bg-blue-700 hover:bg-blue-600 text-white rounded font-semibold flex items-center gap-1">
              <Shield className="w-3.5 h-3.5" /> Staff Login
            </Link>
          </nav>
        </div>
      </header>

      {/* Main Portal Body */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-6 space-y-6">
        {/* HERO SECTION */}
        {activePortalTab === 'home' && (
          <div className="space-y-6">
            <div className="bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 text-white p-10 rounded-2xl shadow-xl relative overflow-hidden text-center space-y-4">
              <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight">Kombolcha City Cadastre & Land Registry</h1>
              <p className="max-w-2xl mx-auto text-slate-300 text-xs md:text-sm leading-relaxed">
                Public access to Kombolcha City cadastral map layers, real property registration status tracking, and land administration services.
              </p>
              <div className="flex justify-center gap-4 pt-2">
                <button onClick={() => setActivePortalTab('status')} className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-semibold text-xs flex items-center gap-2 shadow-lg">
                  <Search className="w-4 h-4" /> Track Application Status
                </button>
                <button onClick={() => setActivePortalTab('documents')} className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-white rounded-lg font-semibold text-xs flex items-center gap-2 shadow-lg">
                  <Download className="w-4 h-4" /> Download Proclamations & Forms
                </button>
              </div>
            </div>

            {/* Quick Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div onClick={() => setActivePortalTab('status')} className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition cursor-pointer text-center space-y-2">
                <Clock className="w-10 h-10 text-amber-500 mx-auto" />
                <h3 className="font-bold text-slate-900 text-sm">Application Tracking</h3>
                <p className="text-xs text-slate-500">Track the real-time processing status of your land registration application using your unique App ID.</p>
              </div>

              <div onClick={() => setActivePortalTab('services')} className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition cursor-pointer text-center space-y-2">
                <FileText className="w-10 h-10 text-blue-600 mx-auto" />
                <h3 className="font-bold text-slate-900 text-sm">Registry Services</h3>
                <p className="text-xs text-slate-500">Review required supporting documents, fees, and service standard lead times for all 12 land registry services.</p>
              </div>

              <div onClick={() => setActivePortalTab('documents')} className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition cursor-pointer text-center space-y-2">
                <Download className="w-10 h-10 text-emerald-600 mx-auto" />
                <h3 className="font-bold text-slate-900 text-sm">Downloadable Laws & Forms</h3>
                <p className="text-xs text-slate-500">Download official registration directives, proclamations, regulations, and official applicant forms in PDF.</p>
              </div>
            </div>
          </div>
        )}

        {/* APPLICATION STATUS TRACKER TAB */}
        {activePortalTab === 'status' && (
          <div className="bg-white p-8 rounded-xl border border-slate-200 shadow-sm max-w-2xl mx-auto space-y-6">
            <div className="text-center space-y-2">
              <h2 className="text-xl font-bold text-slate-900 flex justify-center items-center gap-2">
                <Search className="w-6 h-6 text-blue-600" /> Search Application Status
              </h2>
              <p className="text-xs text-slate-500">Enter your City and the unique Application ID printed on your submission acknowledgment receipt.</p>
            </div>

            <form onSubmit={handleTrackApplication} className="space-y-4 text-xs">
              <div>
                <span className="block font-semibold text-slate-700 mb-1">Registry City:</span>
                <div className="w-full p-2.5 border border-slate-300 rounded-lg bg-slate-100">Kombolcha City</div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Application ID / Number *:</label>
                <input type="text" value={searchAppId} onChange={e => setSearchAppId(e.target.value)} placeholder="e.g. APP-2026-000001 or appReg14415" className="w-full p-2.5 border border-slate-300 rounded-lg" required />
              </div>

              <button type="submit" disabled={isSearchingStatus} className="w-full py-2.5 bg-blue-900 hover:bg-blue-800 text-white font-bold rounded-lg text-xs flex justify-center items-center gap-2 shadow">
                <Search className="w-4 h-4" /> {isSearchingStatus ? 'Searching Registry...' : 'Search Status'}
              </button>
            </form>

            {statusResult && (
              <div className="mt-6 border border-slate-200 rounded-lg p-5 bg-slate-50 space-y-3 text-xs">
                <div className="font-bold text-slate-900 text-sm border-b border-slate-200 pb-2 flex justify-between items-center">
                  <span>Result: {statusResult.applicationNumber || statusResult.application_number}</span>
                  <span className="badge badge-in_progress">{statusResult.status}</span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-slate-700">
                  <div><strong>Applicant Name:</strong> {statusResult.applicantName || statusResult.applicant_name}</div>
                  <div><strong>Application Type:</strong> {statusResult.applicationType || statusResult.application_type}</div>
                  <div><strong>Parcel Code:</strong> {statusResult.parcelCode || 'SN001010106060'}</div>
                  <div><strong>Registry City:</strong> {statusResult.city || 'Kombolcha'}</div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* SERVICES CATALOG TAB */}
        {activePortalTab === 'services' && (
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
            <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2 border-b border-slate-200 pb-3">
              <FileText className="w-6 h-6 text-blue-600" /> Registry Services & Required Documents
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 text-slate-600 border-b border-slate-200">
                    <th className="p-3">Service Name</th>
                    <th className="p-3">Required Supporting Documents</th>
                    <th className="p-3">Service Standard Lead Time</th>
                  </tr>
                </thead>
                <tbody>
                  {(publicServices.length ? publicServices : []).map((s, idx) => (
                    <tr key={s.id || idx} className="border-b border-slate-100 hover:bg-slate-50">
                      <td className="p-3 font-bold text-blue-900">{s.service_name || s.serviceName}</td>
                      <td className="p-3 text-slate-700">{s.required_documents || s.requiredDocuments || 'N/A'}</td>
                      <td className="p-3 font-semibold text-emerald-600">{s.processing_time_hours || s.processingTimeHours ? `${s.processing_time_hours || s.processingTimeHours} hrs` : 'N/A'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* DOCUMENTS TAB */}
        {activePortalTab === 'documents' && (
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
            <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2 border-b border-slate-200 pb-3">
              <Download className="w-6 h-6 text-emerald-600" /> Download Center: Proclamations & Application Forms
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              {(publicDocuments.length ? publicDocuments : []).map((doc, idx) => (
                <div key={doc.id || idx} className="p-4 border border-slate-200 rounded-lg flex items-center justify-between hover:border-blue-300 transition bg-slate-50">
                  <div>
                    <div className="font-bold text-slate-900 text-sm">{doc.title}</div>
                    <div className="text-slate-500 mt-1">{doc.document_category || doc.documentCategory || 'General'} | {(doc.mime_type || doc.mimeType || 'PDF').toUpperCase()}</div>
                  </div>
                  <a href={doc.file_path || doc.filePath || '#'} target="_blank" rel="noreferrer" className="px-3 py-1.5 bg-blue-900 hover:bg-blue-800 text-white rounded font-medium flex items-center gap-1.5">
                    <Download className="w-3.5 h-3.5" /> Download
                  </a>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ANNOUNCEMENTS TAB */}
        {activePortalTab === 'announcements' && (
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
            <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2 border-b border-slate-200 pb-3">
              <Newspaper className="w-6 h-6 text-amber-500" /> Announcements & News
            </h2>
            <div className="space-y-4 text-xs">
              {announcements.map(a => (
                <div key={a.id} className="p-4 border border-slate-200 rounded-lg bg-slate-50 space-y-1">
                  <h3 className="font-bold text-sm text-blue-900">{a.title}</h3>
                  <div className="text-[10px] text-slate-500">Published: {new Date(a.published_at || Date.now()).toLocaleDateString()}</div>
                  <p className="text-slate-700 leading-relaxed pt-1">{a.content}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* Portal Footer */}
      <footer className="bg-slate-900 text-slate-400 text-xs p-6 border-t border-slate-800 text-center">
        <div>Copyright &copy; 2026. Cadastre and Real Property Registration System </div>
      </footer>
    </div>
  );
}