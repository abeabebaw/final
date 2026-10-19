import React, { useEffect, useState } from 'react';
import API from '../../api/client';
import toast from 'react-hot-toast';
import { Globe, Megaphone, Briefcase, FileText, Plus, Download } from 'lucide-react';

const tabs = [
  { key: 'announcements', label: 'Announcements', icon: Megaphone },
  { key: 'services', label: 'Services', icon: Briefcase },
  { key: 'documents', label: 'Documents', icon: FileText },
];

const initialForms = {
  announcements: {
    title: '',
    content: '',
    category: 'NEWS',
    is_published: true,
  },
  services: {
    service_name: '',
    description: '',
    required_documents: '',
    fee_amount: '',
    processing_time_hours: '',
  },
  documents: {
    title: '',
    description: '',
    document_category: 'GENERAL',
    file_path: '',
    file_name: '',
    mime_type: 'application/pdf',
  },
};

export default function PublicContentManagement() {
  const [activeTab, setActiveTab] = useState('announcements');
  const [loading, setLoading] = useState(true);
  const [publicContent, setPublicContent] = useState({
    announcements: [],
    services: [],
    documents: [],
  });
  const [forms, setForms] = useState(initialForms);

  useEffect(() => {
    fetchPublicContent();
  }, []);

  const fetchPublicContent = async () => {
    try {
      setLoading(true);
      const [announcementsRes, servicesRes, documentsRes] = await Promise.all([
        API.get('/public/admin/announcements'),
        API.get('/public/admin/services'),
        API.get('/public/admin/documents'),
      ]);

      setPublicContent({
        announcements: Array.isArray(announcementsRes.data) ? announcementsRes.data : [],
        services: Array.isArray(servicesRes.data) ? servicesRes.data : [],
        documents: Array.isArray(documentsRes.data) ? documentsRes.data : [],
      });
    } catch (error) {
      setPublicContent({
        announcements: [
          { id: 'sample-1', title: 'New title certificate guideline', content: 'Updated policy for duplicate title certificate requests.', category: 'NEWS', is_published: true },
        ],
        services: [
          { id: 'sample-2', service_name: 'First Registration of Real Property', required_documents: 'Kebele ID, Adjudication Certificate', fee_amount: 500, processing_time_hours: 120 },
        ],
        documents: [
          { id: 'sample-3', title: 'Land Registration Regulation 324/2014', document_category: 'LEGAL', file_path: '#', file_name: 'Land Registration Regulation 324_2014.pdf' },
        ],
      });
      toast.error('Unable to load public content. Showing example data.');
    } finally {
      setLoading(false);
    }
  };

  const updateForm = (type, field, value) => {
    setForms(prev => ({
      ...prev,
      [type]: {
        ...prev[type],
        [field]: value,
      },
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const payloadMap = {
      announcements: {
        title: forms.announcements.title,
        content: forms.announcements.content,
        category: forms.announcements.category,
        is_published: forms.announcements.is_published,
      },
      services: {
        service_name: forms.services.service_name,
        description: forms.services.description,
        required_documents: forms.services.required_documents,
        fee_amount: forms.services.fee_amount === '' ? 0 : Number(forms.services.fee_amount),
        processing_time_hours: forms.services.processing_time_hours === '' ? 0 : Number(forms.services.processing_time_hours),
      },
      documents: {
        title: forms.documents.title,
        description: forms.documents.description,
        document_category: forms.documents.document_category,
        file_path: forms.documents.file_path,
        file_name: forms.documents.file_name || forms.documents.title,
        mime_type: forms.documents.mime_type,
      },
    };

    const endpointMap = {
      announcements: '/public/admin/announcements',
      services: '/public/admin/services',
      documents: '/public/admin/documents',
    };

    const payload = payloadMap[activeTab];

    if (activeTab === 'announcements' && (!payload.title || !payload.content)) {
      toast.error('Title and content are required');
      return;
    }

    if (activeTab === 'services' && !payload.service_name) {
      toast.error('Service name is required');
      return;
    }

    if (activeTab === 'documents' && (!payload.title || !payload.file_path)) {
      toast.error('Document title and file URL are required');
      return;
    }

    try {
      const { data } = await API.post(endpointMap[activeTab], payload);
      setPublicContent(prev => ({
        ...prev,
        [activeTab]: [data, ...prev[activeTab]],
      }));
      setForms(prev => ({
        ...prev,
        [activeTab]: initialForms[activeTab],
      }));
      toast.success(`${tabs.find(tab => tab.key === activeTab)?.label} saved successfully`);
    } catch (error) {
      const message = error.response?.data?.message || error.message || 'Unknown error';
      console.error(`Unable to save ${activeTab}:`, error);
      toast.error(`Unable to save: ${message}`);
    }
  };

  const renderTable = () => {
    const items = publicContent[activeTab] || [];

    if (activeTab === 'announcements') {
      return (
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-600">
                <th className="p-3">Title</th>
                <th className="p-3">Category</th>
                <th className="p-3">Status</th>
                <th className="p-3">Published</th>
              </tr>
            </thead>
            <tbody>
              {items.map(item => (
                <tr key={item.id} className="border-t border-slate-200 hover:bg-slate-50">
                  <td className="p-3 font-bold text-slate-900">{item.title}</td>
                  <td className="p-3">{item.category || 'NEWS'}</td>
                  <td className="p-3"><span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-700 font-semibold">{item.is_published ? 'Visible' : 'Draft'}</span></td>
                  <td className="p-3">{item.published_at ? new Date(item.published_at).toLocaleDateString() : 'Today'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    }

    if (activeTab === 'services') {
      return (
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-600">
                <th className="p-3">Service</th>
                <th className="p-3">Fee</th>
                <th className="p-3">Processing Time</th>
                <th className="p-3">Required Documents</th>
              </tr>
            </thead>
            <tbody>
              {items.map(item => (
                <tr key={item.id} className="border-t border-slate-200 hover:bg-slate-50">
                  <td className="p-3 font-bold text-slate-900">{item.service_name || item.serviceName}</td>
                  <td className="p-3">{item.fee_amount || item.feeAmount ? `ETB ${(item.fee_amount || item.feeAmount)}` : 'ETB 0'}</td>
                  <td className="p-3">{item.processing_time_hours || item.processingTimeHours ? `${item.processing_time_hours || item.processingTimeHours} hrs` : 'N/A'}</td>
                  <td className="p-3">{item.required_documents || item.requiredDocuments || 'N/A'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    }

    return (
      <div className="overflow-x-auto">
        <table className="min-w-full text-left text-xs border-collapse">
          <thead>
            <tr className="bg-slate-50 text-slate-600">
              <th className="p-3">Title</th>
              <th className="p-3">Category</th>
              <th className="p-3">File</th>
              <th className="p-3">Link</th>
            </tr>
          </thead>
          <tbody>
            {items.map(item => (
              <tr key={item.id} className="border-t border-slate-200 hover:bg-slate-50">
                <td className="p-3 font-bold text-slate-900">{item.title}</td>
                <td className="p-3">{item.document_category || item.documentCategory || 'GENERAL'}</td>
                <td className="p-3">{item.file_name || item.fileName || 'Document'}</td>
                <td className="p-3">
                  {item.file_path || item.filePath ? (
                    <a href={item.file_path || item.filePath} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-blue-700 font-semibold">
                      <Download className="w-3.5 h-3.5" /> Open
                    </a>
                  ) : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  const renderForm = () => {
    if (activeTab === 'announcements') {
      return (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Title</label>
            <input value={forms.announcements.title} onChange={e => updateForm('announcements', 'title', e.target.value)} className="w-full p-2.5 border border-slate-300 rounded-lg" placeholder="Announcement title" required />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Category</label>
            <select value={forms.announcements.category} onChange={e => updateForm('announcements', 'category', e.target.value)} className="w-full p-2.5 border border-slate-300 rounded-lg">
              <option value="NEWS">News</option>
              <option value="REGISTRATION">Registration</option>
              <option value="SURVEY">Survey</option>
              <option value="NOTICE">Notice</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Content</label>
            <textarea value={forms.announcements.content} onChange={e => updateForm('announcements', 'content', e.target.value)} className="w-full p-2.5 border border-slate-300 rounded-lg h-28" placeholder="Write the public announcement here" required />
          </div>
          <label className="inline-flex items-center gap-2 text-xs font-semibold text-slate-700">
            <input type="checkbox" checked={forms.announcements.is_published} onChange={e => updateForm('announcements', 'is_published', e.target.checked)} />
            Publish for public view
          </label>
          <button type="submit" className="w-full bg-blue-900 hover:bg-blue-800 text-white py-2.5 rounded-lg font-semibold text-xs flex justify-center items-center gap-2">
            <Plus className="w-4 h-4" /> Add Announcement
          </button>
        </form>
      );
    }

    if (activeTab === 'services') {
      return (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Service Name</label>
            <input value={forms.services.service_name} onChange={e => updateForm('services', 'service_name', e.target.value)} className="w-full p-2.5 border border-slate-300 rounded-lg" placeholder="First Registration of Real Property" required />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Description</label>
            <textarea value={forms.services.description} onChange={e => updateForm('services', 'description', e.target.value)} className="w-full p-2.5 border border-slate-300 rounded-lg h-24" placeholder="Service summary" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Required Documents</label>
            <input value={forms.services.required_documents} onChange={e => updateForm('services', 'required_documents', e.target.value)} className="w-full p-2.5 border border-slate-300 rounded-lg" placeholder="Kebele ID, Adjudication Certificate" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Fee (ETB)</label>
              <input type="number" value={forms.services.fee_amount} onChange={e => updateForm('services', 'fee_amount', e.target.value)} className="w-full p-2.5 border border-slate-300 rounded-lg" placeholder="500" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Processing Time (hrs)</label>
              <input type="number" value={forms.services.processing_time_hours} onChange={e => updateForm('services', 'processing_time_hours', e.target.value)} className="w-full p-2.5 border border-slate-300 rounded-lg" placeholder="120" />
            </div>
          </div>
          <button type="submit" className="w-full bg-blue-900 hover:bg-blue-800 text-white py-2.5 rounded-lg font-semibold text-xs flex justify-center items-center gap-2">
            <Plus className="w-4 h-4" /> Add Service
          </button>
        </form>
      );
    }

    return (
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">Document Title</label>
          <input value={forms.documents.title} onChange={e => updateForm('documents', 'title', e.target.value)} className="w-full p-2.5 border border-slate-300 rounded-lg" placeholder="Land Registration Regulation 324/2014" required />
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">Document Category</label>
          <select value={forms.documents.document_category} onChange={e => updateForm('documents', 'document_category', e.target.value)} className="w-full p-2.5 border border-slate-300 rounded-lg">
            <option value="LEGAL">Legal</option>
            <option value="FORM">Form</option>
            <option value="GENERAL">General</option>
            <option value="GUIDELINE">Guideline</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">Description</label>
          <textarea value={forms.documents.description} onChange={e => updateForm('documents', 'description', e.target.value)} className="w-full p-2.5 border border-slate-300 rounded-lg h-20" placeholder="Optional document summary" />
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">File URL / Link</label>
          <input value={forms.documents.file_path} onChange={e => updateForm('documents', 'file_path', e.target.value)} className="w-full p-2.5 border border-slate-300 rounded-lg" placeholder="https://example.com/document.pdf" required />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">File Name</label>
            <input value={forms.documents.file_name} onChange={e => updateForm('documents', 'file_name', e.target.value)} className="w-full p-2.5 border border-slate-300 rounded-lg" placeholder="Document.pdf" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">MIME Type</label>
            <input value={forms.documents.mime_type} onChange={e => updateForm('documents', 'mime_type', e.target.value)} className="w-full p-2.5 border border-slate-300 rounded-lg" placeholder="application/pdf" />
          </div>
        </div>
        <button type="submit" className="w-full bg-blue-900 hover:bg-blue-800 text-white py-2.5 rounded-lg font-semibold text-xs flex justify-center items-center gap-2">
          <Plus className="w-4 h-4" /> Add Document
        </button>
      </form>
    );
  };

  return (
    <div className="space-y-6">
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Globe className="w-6 h-6 text-blue-600" /> Public Content Management
          </h2>
          <p className="text-xs text-slate-500 mt-1">Manage the public pages for announcements, services, and downloadable documents.</p>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-6">
        <div className="flex flex-wrap gap-2 border-b border-slate-200 pb-3">
          {tabs.map(tab => {
            const Icon = tab.icon;
            const active = tab.key === activeTab;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key)}
                className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold transition ${active ? 'bg-blue-900 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-[1.3fr_0.7fr] gap-6">
          <div className="overflow-hidden border border-slate-200 rounded-xl">
            <div className="bg-slate-50 p-3 border-b border-slate-200 text-xs font-bold text-slate-700 uppercase tracking-wide">
              {tabs.find(tab => tab.key === activeTab)?.label} List
            </div>
            <div className="p-4">
              {loading ? (
                <div className="text-sm text-slate-500">Loading public content...</div>
              ) : (
                renderTable()
              )}
            </div>
          </div>

          <div className="border border-slate-200 rounded-xl p-4 bg-slate-50">
            <div className="mb-4 text-xs font-bold uppercase tracking-wide text-slate-700">Add New {tabs.find(tab => tab.key === activeTab)?.label.slice(0, -1)}</div>
            {renderForm()}
          </div>
        </div>
      </div>
    </div>
  );
}
