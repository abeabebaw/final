import React, { useState } from 'react';
import { X, Upload, FileText, Check, Database, MapPin } from 'lucide-react';
import toast from 'react-hot-toast';

// Sample survey datasets collected by surveyors (Total Station / GPS in EPSG:20137 UTM 37N)
export const SAMPLE_SURVEY_DATASETS = {
  sefere_01: {
    name: 'Sefere_01_Point',
    file: 'Sefere_01_Point.csv',
    color: '#15803d', // Green dots
    points: [
      { id: 'PT-101', x: 444012.30, y: 778759.10, z: 1680.5, code: 'BND_CORNER', lat: 7.0621, lng: 38.4731 },
      { id: 'PT-102', x: 444025.50, y: 778770.80, z: 1680.7, code: 'BND_CORNER', lat: 7.0624, lng: 38.4735 },
      { id: 'PT-103', x: 444038.90, y: 778782.40, z: 1681.0, code: 'BND_LINE', lat: 7.0627, lng: 38.4739 },
      { id: 'PT-104', x: 444052.10, y: 778794.20, z: 1681.2, code: 'BND_CORNER', lat: 7.0630, lng: 38.4743 },
      { id: 'PT-105', x: 444065.40, y: 778806.00, z: 1681.5, code: 'BND_LINE', lat: 7.0633, lng: 38.4747 },
      { id: 'PT-106', x: 444078.60, y: 778817.80, z: 1681.8, code: 'BND_CORNER', lat: 7.0636, lng: 38.4751 },
      { id: 'PT-107', x: 444091.80, y: 778829.50, z: 1682.0, code: 'BND_CORNER', lat: 7.0639, lng: 38.4755 }
    ]
  },
  sefere_02: {
    name: 'Sefere_02_Point',
    file: 'Sefere_02_Point.csv',
    color: '#b45309', // Brown dots
    points: [
      { id: 'PT-201', x: 444030.10, y: 778740.20, z: 1679.8, code: 'ROAD_CL', lat: 7.0617, lng: 38.4736 },
      { id: 'PT-202', x: 444043.40, y: 778752.00, z: 1680.1, code: 'ROAD_CL', lat: 7.0620, lng: 38.4740 },
      { id: 'PT-203', x: 444056.70, y: 778763.80, z: 1680.3, code: 'ROAD_CL', lat: 7.0623, lng: 38.4744 },
      { id: 'PT-204', x: 444070.00, y: 778775.50, z: 1680.6, code: 'ROAD_CL', lat: 7.0626, lng: 38.4748 },
      { id: 'PT-205', x: 444083.30, y: 778787.30, z: 1680.9, code: 'ROAD_CL', lat: 7.0629, lng: 38.4752 },
      { id: 'PT-206', x: 444096.50, y: 778799.10, z: 1681.1, code: 'ROAD_CL', lat: 7.0632, lng: 38.4756 },
      { id: 'PT-207', x: 444109.80, y: 778810.90, z: 1681.4, code: 'ROAD_CL', lat: 7.0635, lng: 38.4760 }
    ]
  }
};

export default function AddVectorLayerModal({ isOpen, onClose, onImportLayer }) {
  const [sourceType, setSourceType] = useState('File'); // File, Directory, Database, Protocol
  const [encoding, setEncoding] = useState('System (UTF-8)');
  const [selectedDatasetKey, setSelectedDatasetKey] = useState('sefere_01');
  const [customFileName, setCustomFileName] = useState('');
  const [crs, setCrs] = useState('EPSG:20137 - Adindan / UTM zone 37N');

  if (!isOpen) return null;

  const handleImport = () => {
    const dataset = SAMPLE_SURVEY_DATASETS[selectedDatasetKey];
    if (!dataset) {
      toast.error('Please select valid surveyed data');
      return;
    }

    onImportLayer({
      id: `survey-${Date.now()}`,
      name: dataset.name,
      file: dataset.file,
      color: dataset.color,
      points: dataset.points,
      visible: true
    });

    toast.success(`Survey data "${dataset.name}" successfully imported into RECS`);
    onClose();
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      setCustomFileName(file.name);
      toast.success(`Loaded survey file: ${file.name}`);
    }
  };

  const currentPreview = SAMPLE_SURVEY_DATASETS[selectedDatasetKey]?.points || [];

  return (
    <div className="fixed inset-0 z-[9999] bg-black/60 backdrop-blur-[2px] flex items-center justify-center p-4">
      {/* Exact replica of QGIS/RECS "Add Vector Layer" dialog */}
      <div className="bg-[#f0f0f0] border-2 border-[#1e3a5f] rounded-xs shadow-2xl w-[580px] max-w-[95vw] text-xs font-sans text-slate-800 select-none relative z-10">
        
        {/* Title bar */}
        <div className="bg-[#1b365d] text-white px-3 py-1.5 flex items-center justify-between font-semibold">
          <div className="flex items-center gap-1.5">
            <span className="text-emerald-400 font-bold">V+</span>
            <span>Add Vector Layer - Import Survey Data</span>
          </div>
          <button onClick={onClose} className="text-slate-300 hover:text-white font-bold">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <div className="p-4 space-y-3 bg-white">
          
          {/* Source Type */}
          <div className="border border-slate-300 p-2.5 rounded-xs bg-[#fafafa]">
            <span className="block font-bold text-slate-700 mb-1.5">Source Type</span>
            <div className="flex items-center gap-6">
              {['File', 'Directory', 'Database', 'Protocol'].map((type) => (
                <label key={type} className="flex items-center gap-1.5 cursor-pointer">
                  <input 
                    type="radio" 
                    name="sourceType" 
                    checked={sourceType === type} 
                    onChange={() => setSourceType(type)}
                    className="text-blue-600"
                  />
                  <span>{type}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Dataset selection */}
          <div className="border border-slate-300 p-3 rounded-xs space-y-2 bg-[#fafafa]">
            <span className="block font-bold text-slate-700">Source Dataset (Surveyor Total Station / RTK GPS)</span>
            
            <div className="space-y-1.5">
              <label className="flex items-center gap-2 p-1.5 bg-white border border-slate-200 rounded cursor-pointer hover:bg-blue-50">
                <input 
                  type="radio" 
                  name="sampleSurvey" 
                  checked={selectedDatasetKey === 'sefere_01'}
                  onChange={() => setSelectedDatasetKey('sefere_01')}
                />
                <span className="w-3 h-3 rounded-full bg-emerald-600 inline-block"></span>
                <span className="font-semibold text-slate-800">Sefere_01_Point.csv</span>
                <span className="text-[11px] text-slate-500 ml-auto">7 Cadastral Boundary Points (Green)</span>
              </label>

              <label className="flex items-center gap-2 p-1.5 bg-white border border-slate-200 rounded cursor-pointer hover:bg-blue-50">
                <input 
                  type="radio" 
                  name="sampleSurvey" 
                  checked={selectedDatasetKey === 'sefere_02'}
                  onChange={() => setSelectedDatasetKey('sefere_02')}
                />
                <span className="w-3 h-3 rounded-full bg-amber-700 inline-block"></span>
                <span className="font-semibold text-slate-800">Sefere_02_Point.csv</span>
                <span className="text-[11px] text-slate-500 ml-auto">7 Road Centerline / Reserve Points (Brown)</span>
              </label>
            </div>

            {/* Custom file upload */}
            <div className="pt-2 flex items-center gap-2">
              <label className="px-3 py-1 bg-slate-200 hover:bg-slate-300 border border-slate-400 rounded text-slate-700 cursor-pointer flex items-center gap-1.5 text-xs">
                <Upload className="w-3.5 h-3.5" />
                <span>Browse File (.csv, .txt, .dxf, .shp)</span>
                <input type="file" accept=".csv,.txt,.dxf,.shp" className="hidden" onChange={handleFileUpload} />
              </label>
              <span className="text-slate-500 italic text-[11px] truncate flex-1">
                {customFileName || 'No custom file selected (using standard sample)'}
              </span>
            </div>
          </div>

          {/* Coordinate System & Encoding */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-0.5">Encoding:</label>
              <select 
                value={encoding} 
                onChange={e => setEncoding(e.target.value)}
                className="w-full border border-slate-300 p-1 text-xs bg-white rounded-none outline-none"
              >
                <option>System (UTF-8)</option>
                <option>ISO-8859-1</option>
                <option>US-ASCII</option>
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-0.5">Coordinate System (CRS):</label>
              <select 
                value={crs} 
                onChange={e => setCrs(e.target.value)}
                className="w-full border border-slate-300 p-1 text-xs bg-white rounded-none outline-none font-mono"
              >
                <option>EPSG:20137 - Adindan / UTM zone 37N</option>
                <option>EPSG:20138 - Adindan / UTM zone 38N</option>
                <option>EPSG:4326 - WGS 84</option>
              </select>
            </div>
          </div>

          {/* Points Data Preview Table */}
          <div className="border border-slate-300 rounded-xs overflow-hidden">
            <div className="bg-[#eaeaea] px-2 py-1 font-semibold text-slate-700 text-[11px] border-b border-slate-300 flex justify-between">
              <span>Preview Survey Points Data ({currentPreview.length} points)</span>
              <span className="text-slate-500 font-mono text-[10px]">Format: Point_ID, X, Y, Z, Code</span>
            </div>
            <div className="max-h-28 overflow-y-auto bg-white">
              <table className="w-full text-left text-[11px] border-collapse font-mono">
                <thead>
                  <tr className="bg-slate-100 border-b border-slate-200 text-slate-600">
                    <th className="p-1">Point_ID</th>
                    <th className="p-1">Easting (X)</th>
                    <th className="p-1">Northing (Y)</th>
                    <th className="p-1">Elev (Z)</th>
                    <th className="p-1">Feature_Code</th>
                  </tr>
                </thead>
                <tbody>
                  {currentPreview.map(pt => (
                    <tr key={pt.id} className="border-b border-slate-100 hover:bg-blue-50">
                      <td className="p-1 font-semibold text-blue-900">{pt.id}</td>
                      <td className="p-1">{pt.x.toFixed(2)}</td>
                      <td className="p-1">{pt.y.toFixed(2)}</td>
                      <td className="p-1">{pt.z.toFixed(1)}</td>
                      <td className="p-1 text-emerald-700">{pt.code}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="bg-[#f0f0f0] border-t border-slate-300 px-4 py-2 flex justify-end gap-2">
          <button 
            type="button"
            onClick={handleImport}
            className="bg-[#0078d7] hover:bg-[#0063b1] text-white px-5 py-1 text-xs font-semibold rounded-none shadow-xs active:scale-95"
          >
            Open
          </button>
          <button 
            type="button"
            onClick={onClose}
            className="bg-[#e1e1e1] hover:bg-[#d0d0d0] text-slate-800 border border-slate-300 px-5 py-1 text-xs font-semibold rounded-none shadow-xs active:scale-95"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
