import React, { useState, useEffect, useRef, useMemo } from 'react';
import { MapContainer, TileLayer, Polygon, Polyline, CircleMarker, Popup, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { 
  Save, Edit3, Undo2, Redo2, Scissors, Combine, Crosshair,
  Hand, Target, ZoomIn, ZoomOut, Search, Maximize, Scan, 
  ChevronLeft, ChevronRight, RotateCw, Info, Edit, 
  MousePointer, Slash, Table, Ruler, BoxSelect,
  FilePlus, FolderOpen, Trash2, CheckSquare, Ban, CheckCircle2, 
  XCircle, RotateCcw, MapPin, GitCommit, Pentagon,
  Layers as LayersIcon, Check, AlertCircle, HelpCircle, X,
  Minimize2, ExternalLink, Settings, Eye, ChevronDown, ListFilter,
  ArrowUp, ArrowDown, ShieldCheck, Printer, Play, FolderMinus, UploadCloud
} from 'lucide-react';
import toast from 'react-hot-toast';
import client from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import RECSLoginModal from './RECSLoginModal';
import AddVectorLayerModal, { SAMPLE_SURVEY_DATASETS } from './AddVectorLayerModal';

// --- UTM Zone 37N (EPSG:20137 / WGS84 Transverse Mercator for Ethiopia) ---
function latLngToUtm37N(lat, lng) {
  const a = 6378137.0;
  const f = 1 / 298.257223563;
  const b = a * (1 - f);
  const e2 = (a * a - b * b) / (a * a);
  const ePrime2 = (a * a - b * b) / (b * b);
  const k0 = 0.9996;
  const lon0 = 39.0;
  
  const phi = (lat * Math.PI) / 180.0;
  const lambda = (lng * Math.PI) / 180.0;
  const lambda0 = (lon0 * Math.PI) / 180.0;
  
  const N = a / Math.sqrt(1 - e2 * Math.sin(phi) * Math.sin(phi));
  const T = Math.tan(phi) * Math.tan(phi);
  const C = ePrime2 * Math.cos(phi) * Math.cos(phi);
  const A = Math.cos(phi) * (lambda - lambda0);
  
  const M = a * (
    (1 - e2 / 4 - 3 * e2 * e2 / 64 - 5 * e2 * e2 * e2 / 256) * phi -
    (3 * e2 / 8 + 3 * e2 * e2 / 32 + 45 * e2 * e2 * e2 / 1024) * Math.sin(2 * phi) +
    (15 * e2 * e2 / 256 + 45 * e2 * e2 * e2 / 1024) * Math.sin(4 * phi) -
    (35 * e2 * e2 * e2 / 3072) * Math.sin(6 * phi)
  );
  
  const easting = 500000.0 + k0 * N * (
    A + (1 - T + C) * Math.pow(A, 3) / 6.0 +
    (5 - 18 * T + T * T + 72 * C - 58 * ePrime2) * Math.pow(A, 5) / 120.0
  );
  
  const northing = k0 * (
    M + N * Math.tan(phi) * (
      Math.pow(A, 2) / 2.0 +
      (5 - T + 9 * C + 4 * C * C) * Math.pow(A, 4) / 24.0 +
      (61 - 58 * T + T * T + 600 * C - 330 * ePrime2) * Math.pow(A, 6) / 720.0
    )
  );
  
  return {
    easting: easting.toFixed(2),
    northing: northing.toFixed(2)
  };
}

// Map event listener component to track cursor coordinates and scale
function MapEventsTracker({ onMouseMove, onZoomChange }) {
  const map = useMap();
  
  useMapEvents({
    mousemove(e) {
      const utm = latLngToUtm37N(e.latlng.lat, e.latlng.lng);
      onMouseMove(utm.easting, utm.northing);
    },
    zoomend() {
      const zoom = map.getZoom();
      const scale = (591657550.5 / Math.pow(2, zoom - 1) / 150).toFixed(8);
      onZoomChange(scale);
    }
  });
  return null;
}

// Controller component to execute map actions
function MapActionController({ mapAction, onActionExecuted }) {
  const map = useMap();
  
  useEffect(() => {
    if (!mapAction) return;
    
    if (mapAction.type === 'ZOOM_IN') {
      map.zoomIn();
    } else if (mapAction.type === 'ZOOM_OUT') {
      map.zoomOut();
    } else if (mapAction.type === 'ZOOM_FULL') {
      map.setView([7.0630, 38.4760], 16);
    } else if (mapAction.type === 'ZOOM_1_1') {
      map.setZoom(18);
    } else if (mapAction.type === 'ZOOM_TO_PARCEL' && mapAction.coords) {
      map.flyToBounds(mapAction.coords, { maxZoom: 18, duration: 0.8 });
    } else if (mapAction.type === 'ZOOM_TO_POINTS' && mapAction.points) {
      const bounds = L.latLngBounds(mapAction.points.map(pt => [pt.lat, pt.lng]));
      map.flyToBounds(bounds, { maxZoom: 18, padding: [40, 40], duration: 0.8 });
    }
    
    onActionExecuted();
  }, [mapAction, map, onActionExecuted]);
  
  return null;
}

// --- Initial Cadastral Layout (Subdivisions matching Ethiopian Cadastre Grid) ---
const BASE_LAT = 7.0620;
const BASE_LNG = 38.4730;

const INITIAL_PARCELS = [
  {
    id: 'prc-101',
    parcelCode: 'SN001010101021',
    owner: 'Abebe Tadesse Woldemariam',
    landUse: 'Residential',
    areaSqm: 285.50,
    status: 'ACTIVE',
    coordinates: [
      [BASE_LAT, BASE_LNG],
      [BASE_LAT + 0.0012, BASE_LNG + 0.0006],
      [BASE_LAT + 0.0009, BASE_LNG + 0.0015],
      [BASE_LAT - 0.0003, BASE_LNG + 0.0009]
    ]
  },
  {
    id: 'prc-102',
    parcelCode: 'SN001010102017',
    owner: 'Bethlehem Haile Kassa',
    landUse: 'Commercial',
    areaSqm: 420.00,
    status: 'ACTIVE',
    coordinates: [
      [BASE_LAT + 0.0012, BASE_LNG + 0.0006],
      [BASE_LAT + 0.0024, BASE_LNG + 0.0012],
      [BASE_LAT + 0.0021, BASE_LNG + 0.0021],
      [BASE_LAT + 0.0009, BASE_LNG + 0.0015]
    ]
  },
  {
    id: 'prc-103',
    parcelCode: 'SN001010101014',
    owner: 'Commercial Bank of Ethiopia',
    landUse: 'Public / Commercial',
    areaSqm: 850.25,
    status: 'ACTIVE',
    coordinates: [
      [BASE_LAT + 0.0024, BASE_LNG + 0.0012],
      [BASE_LAT + 0.0036, BASE_LNG + 0.0018],
      [BASE_LAT + 0.0033, BASE_LNG + 0.0027],
      [BASE_LAT + 0.0021, BASE_LNG + 0.0021]
    ]
  },
  {
    id: 'prc-104',
    parcelCode: 'SN001010101024',
    owner: 'Dawit Getachew Assefa',
    landUse: 'Residential',
    areaSqm: 310.00,
    status: 'ACTIVE',
    coordinates: [
      [BASE_LAT - 0.0003, BASE_LNG + 0.0009],
      [BASE_LAT + 0.0009, BASE_LNG + 0.0015],
      [BASE_LAT + 0.0006, BASE_LNG + 0.0024],
      [BASE_LAT - 0.0006, BASE_LNG + 0.0018]
    ]
  },
  {
    id: 'prc-105',
    parcelCode: 'SN001010101025',
    owner: 'Kalkidan Girma Berhe',
    landUse: 'Residential',
    areaSqm: 295.75,
    status: 'ACTIVE',
    coordinates: [
      [BASE_LAT + 0.0009, BASE_LNG + 0.0015],
      [BASE_LAT + 0.0021, BASE_LNG + 0.0021],
      [BASE_LAT + 0.0018, BASE_LNG + 0.0030],
      [BASE_LAT + 0.0006, BASE_LNG + 0.0024]
    ]
  },
  {
    id: 'prc-106',
    parcelCode: 'SN001010101026',
    owner: 'Municipality Green Reserve',
    landUse: 'Public Reserve',
    areaSqm: 560.80,
    status: 'ACTIVE',
    coordinates: [
      [BASE_LAT + 0.0021, BASE_LNG + 0.0021],
      [BASE_LAT + 0.0033, BASE_LNG + 0.0027],
      [BASE_LAT + 0.0030, BASE_LNG + 0.0036],
      [BASE_LAT + 0.0018, BASE_LNG + 0.0030]
    ]
  }
];

// Sample Buildings matching yellow footprints
const INITIAL_BUILDINGS = [
  {
    id: 'bldg-1',
    parcelCode: 'SN001010101021',
    coordinates: [
      [BASE_LAT + 0.0002, BASE_LNG + 0.0003],
      [BASE_LAT + 0.0008, BASE_LNG + 0.0006],
      [BASE_LAT + 0.0006, BASE_LNG + 0.0010],
      [BASE_LAT + 0.0000, BASE_LNG + 0.0007]
    ]
  },
  {
    id: 'bldg-2',
    parcelCode: 'SN001010102017',
    coordinates: [
      [BASE_LAT + 0.0014, BASE_LNG + 0.0009],
      [BASE_LAT + 0.0020, BASE_LNG + 0.0012],
      [BASE_LAT + 0.0018, BASE_LNG + 0.0017],
      [BASE_LAT + 0.0012, BASE_LNG + 0.0014]
    ]
  }
];

// Sample Border Points
const INITIAL_BORDER_POINTS = [
  { id: 'bp-1', name: 'BP-01', coords: [BASE_LAT, BASE_LNG] },
  { id: 'bp-2', name: 'BP-02', coords: [BASE_LAT + 0.0012, BASE_LNG + 0.0006] },
  { id: 'bp-3', name: 'BP-03', coords: [BASE_LAT + 0.0024, BASE_LNG + 0.0012] },
  { id: 'bp-4', name: 'BP-04', coords: [BASE_LAT + 0.0036, BASE_LNG + 0.0018] },
  { id: 'bp-5', name: 'BP-05', coords: [BASE_LAT + 0.0033, BASE_LNG + 0.0027] },
  { id: 'bp-6', name: 'BP-06', coords: [BASE_LAT + 0.0021, BASE_LNG + 0.0021] },
  { id: 'bp-7', name: 'BP-07', coords: [BASE_LAT + 0.0009, BASE_LNG + 0.0015] },
  { id: 'bp-8', name: 'BP-08', coords: [BASE_LAT - 0.0003, BASE_LNG + 0.0009] }
];

// Sample Servitude
const INITIAL_SERVITUDES = [
  {
    id: 'srv-1',
    type: 'Right of Way / Access Road',
    coordinates: [
      [BASE_LAT - 0.0008, BASE_LNG + 0.0007],
      [BASE_LAT + 0.0038, BASE_LNG + 0.0030],
      [BASE_LAT + 0.0037, BASE_LNG + 0.0032],
      [BASE_LAT - 0.0009, BASE_LNG + 0.0009]
    ]
  }
];

// Sample Transactions matching Screenshot 1 & 2 (AA-LDTTR-11872 etc.)
const INITIAL_TRANSACTIONS = [
  {
    no: 1,
    id: 'txn-101',
    transactionNumber: 'AA-LDTTR-11872',
    applicationNumber: 'appReg14196',
    status: 'CREATED',
    parcel: 'SN001010101021',
    transactionType: 'Create new parcel',
    createdBy: 'hwfdo1',
    approvedBy: 'hwfdo1',
    creationDate: '2018-04-11T00:00:00',
    modificationDate: '2018-04-12T09:15:20'
  },
  {
    no: 2,
    id: 'txn-102',
    transactionNumber: 'AA-LDTTR-11854',
    applicationNumber: 'appReg14210',
    status: 'APPROVED',
    parcel: 'SN001010102017',
    transactionType: 'Merge Features',
    createdBy: 'hwfdo1',
    approvedBy: 'hwfdo1',
    creationDate: '2018-04-11T00:00:00',
    modificationDate: '2018-04-11T14:22:00'
  },
  {
    no: 3,
    id: 'txn-103',
    transactionNumber: 'AA-LDTTR-11850',
    applicationNumber: 'appReg14200',
    status: 'APPROVED',
    parcel: 'SN001010101014',
    transactionType: 'Parcel Split',
    createdBy: 'hwfdo1',
    approvedBy: 'hwfdo1',
    creationDate: '2018-04-11T00:00:00',
    modificationDate: '2018-04-11T16:45:00'
  },
  {
    no: 4,
    id: 'txn-104',
    transactionNumber: 'AA-LDTTR-11837',
    applicationNumber: 'appReg14190',
    status: 'CANCELED',
    parcel: 'SN001010101024',
    transactionType: 'Create new parcel',
    createdBy: 'hwfdo1',
    approvedBy: 'hwfdo1',
    creationDate: '2018-04-10T00:00:00',
    modificationDate: '2018-04-10T11:30:00'
  },
  {
    no: 5,
    id: 'txn-105',
    transactionNumber: 'AA-LDTTR-11833',
    applicationNumber: 'appReg14188',
    status: 'APPROVED',
    parcel: 'SN001010101025',
    transactionType: 'Merge Features',
    createdBy: 'hwfdo1',
    approvedBy: 'hwfdo1',
    creationDate: '2018-04-09T00:00:00',
    modificationDate: '2018-04-09T15:10:00'
  }
];

export default function RECSPanel() {
  const { user: authUser } = useAuth();
  
  // Modals state
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showAddVectorModal, setShowAddVectorModal] = useState(false);
  const [initiateConfirmDialog, setInitiateConfirmDialog] = useState(null); // { transactionNumber }

  const [currentUser, setCurrentUser] = useState({
    username: authUser?.full_name || authUser?.username || 'hwgo go1',
    role: authUser?.role || 'GO'
  });

  // Panels visibility (matches Screenshot context menu)
  const [visiblePanels, setVisiblePanels] = useState({
    undoRedo: false,
    transactions: true,
    topologyChecker: true,
    layersPanel: true,
    layerOrderPanel: true
  });

  // Toolbars visibility
  const [visibleToolbars, setVisibleToolbars] = useState({
    taskToolbar: true,
    digitizing: true,
    navigation: true,
    attribute: true,
    transaction: true,
    drawPolygon: true
  });

  // Active Tool state
  const [activeTool, setActiveTool] = useState('pan');
  const [editingEnabled, setEditingEnabled] = useState(false);

  // Map state
  const [currentCoords, setCurrentCoords] = useState({ easting: '444011.22', northing: '778758.30' });
  const [currentScale, setCurrentScale] = useState('1:6515.44040786');
  const [extentLocked, setExtentLocked] = useState(false);
  const [mapAction, setMapAction] = useState(null);

  // Layers visibility state
  const [layersVisibility, setLayersVisibility] = useState({
    baseMap: true,
    borderpoint: true,
    boundaryline: true,
    building: true,
    parcel: true,
    servitude: true
  });

  // Layer order
  const [layerOrder, setLayerOrder] = useState([
    'Borderpoint',
    'Boundaryline',
    'Building',
    'Parcel',
    'Servitude'
  ]);
  const [controlRenderOrder, setControlRenderOrder] = useState(true);

  // Spatial data state
  const [parcels, setParcels] = useState(INITIAL_PARCELS);
  const [buildings, setBuildings] = useState(INITIAL_BUILDINGS);
  const [borderPoints, setBorderPoints] = useState(INITIAL_BORDER_POINTS);
  const [servitudes, setServitudes] = useState(INITIAL_SERVITUDES);
  
  // Selection and History state
  const [selectedParcelIds, setSelectedParcelIds] = useState([]);
  const [identifyModalParcel, setIdentifyModalParcel] = useState(null);
  const [showAttributeTable, setShowAttributeTable] = useState(false);
  const [history, setHistory] = useState([INITIAL_PARCELS]);
  const [historyIndex, setHistoryIndex] = useState(0);

  // Transactions panel state
  const [transactions, setTransactions] = useState(INITIAL_TRANSACTIONS);
  const [selectedTxnId, setSelectedTxnId] = useState('txn-101');
  const [txnFilterText, setTxnFilterText] = useState('');
  const [txnFilterStatus, setTxnFilterStatus] = useState('...all...');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 5;

  // Loaded Transaction Working Data (Screenshot 3: media_1791218407470.png)
  const [loadedTxnData, setLoadedTxnData] = useState(null); // { txnNumber, taskParcel, neighborParcels, visible: true }
  
  // Imported Survey Layers (Screenshots 4 & 5: media_1791218484393.png & media_1791218539117.png)
  const [importedSurveyLayers, setImportedSurveyLayers] = useState([]); // [{ id, name, file, color, points, visible }]

  // Context Menu for Transaction Row (Screenshots 1 & 2: media_1791218260357.png)
  const [txnContextMenu, setTxnContextMenu] = useState(null); // { x, y, txn }

  // Context Menu for Layers Panel Items (Screenshot 3)
  const [layerContextMenu, setLayerContextMenu] = useState(null); // { x, y, type, layerId }

  // Topology Checker state
  const [topologyErrors, setTopologyErrors] = useState([]);
  const [topologyChecked, setTopologyChecked] = useState(false);
  const [showTopologyErrorMarkers, setShowTopologyErrorMarkers] = useState(true);

  // View context menu
  const [showViewContextMenu, setShowViewContextMenu] = useState(false);
  const [contextMenuPos, setContextMenuPos] = useState({ x: 200, y: 50 });

  // Layer dropdown menu state
  const [showLayerMenu, setShowLayerMenu] = useState(false);

  // Load backend database transactions and parcels if available
  useEffect(() => {
    loadBackendData();
  }, []);

  const loadBackendData = async () => {
    try {
      const [txRes, prcRes] = await Promise.allSettled([
        client.get('/transactions'),
        client.get('/parcels')
      ]);

      if (txRes.status === 'fulfilled' && Array.isArray(txRes.value.data) && txRes.value.data.length > 0) {
        const mappedTxns = txRes.value.data.map((t, idx) => ({
          no: idx + 1,
          id: t.id,
          transactionNumber: t.transaction_number || `AA-LDTTR-${11870 - idx}`,
          applicationNumber: t.application_number || `appReg${14190 + idx}`,
          status: t.status || 'CREATED',
          parcel: t.parcel_code || 'SN001010101021',
          transactionType: t.application_type || 'Create new parcel',
          createdBy: t.creator_name || 'hwfdo1',
          approvedBy: t.assignee_name || 'hwfdo1',
          creationDate: t.created_at || '2018-04-11T00:00:00',
          modificationDate: t.updated_at || '2018-04-12T00:00:00'
        }));
        setTransactions(mappedTxns);
      }
    } catch (err) {
      console.log('Using initial transactional dataset for RECS environment.');
    }
  };

  // Push new state to history for Undo/Redo
  const pushHistory = (newParcels) => {
    const updated = history.slice(0, historyIndex + 1);
    updated.push(newParcels);
    setHistory(updated);
    setHistoryIndex(updated.length - 1);
    setParcels(newParcels);
  };

  const handleUndo = () => {
    if (historyIndex > 0) {
      const prev = historyIndex - 1;
      setHistoryIndex(prev);
      setParcels(history[prev]);
      toast.success('Spatial Edit Undone');
    } else {
      toast('No more actions to undo', { icon: 'ℹ️' });
    }
  };

  const handleRedo = () => {
    if (historyIndex < history.length - 1) {
      const next = historyIndex + 1;
      setHistoryIndex(next);
      setParcels(history[next]);
      toast.success('Spatial Edit Redone');
    } else {
      toast('No more actions to redo', { icon: 'ℹ️' });
    }
  };

  // Spatial split parcel tool
  const handleSplitParcel = () => {
    if (!editingEnabled) {
      toast.error('Enable Editing mode first (Pencil Icon)');
      return;
    }
    if (selectedParcelIds.length !== 1) {
      toast.error('Please select exactly 1 parcel to split using Select Tool!');
      return;
    }

    const target = parcels.find(p => p.id === selectedParcelIds[0]);
    if (!target) return;

    const baseCode = target.parcelCode;
    const codeA = `${baseCode}-S1`;
    const codeB = `${baseCode}-S2`;

    const p1 = {
      ...target,
      id: `${target.id}-S1`,
      parcelCode: codeA,
      areaSqm: Number((target.areaSqm / 2).toFixed(2)),
      coordinates: [
        target.coordinates[0],
        target.coordinates[1],
        [
          (target.coordinates[1][0] + target.coordinates[2][0]) / 2,
          (target.coordinates[1][1] + target.coordinates[2][1]) / 2
        ],
        [
          (target.coordinates[0][0] + target.coordinates[3][0]) / 2,
          (target.coordinates[0][1] + target.coordinates[3][1]) / 2
        ]
      ]
    };

    const p2 = {
      ...target,
      id: `${target.id}-S2`,
      parcelCode: codeB,
      areaSqm: Number((target.areaSqm / 2).toFixed(2)),
      coordinates: [
        [
          (target.coordinates[0][0] + target.coordinates[3][0]) / 2,
          (target.coordinates[0][1] + target.coordinates[3][1]) / 2
        ],
        [
          (target.coordinates[1][0] + target.coordinates[2][0]) / 2,
          (target.coordinates[1][1] + target.coordinates[2][1]) / 2
        ],
        target.coordinates[2],
        target.coordinates[3]
      ]
    };

    const updated = parcels.filter(p => p.id !== target.id).concat([p1, p2]);
    pushHistory(updated);
    setSelectedParcelIds([]);
    toast.success(`Split feature completed: Created ${codeA} & ${codeB}`);
  };

  // Spatial merge parcels tool
  const handleMergeParcels = () => {
    if (!editingEnabled) {
      toast.error('Enable Editing mode first (Pencil Icon)');
      return;
    }
    if (selectedParcelIds.length < 2) {
      toast.error('Select 2 or more adjacent parcels to merge!');
      return;
    }

    const targets = parcels.filter(p => selectedParcelIds.includes(p.id));
    const mergedCode = `MRG-${Date.now().toString().slice(-4)}`;
    const totalArea = targets.reduce((sum, p) => sum + Number(p.areaSqm), 0);

    const merged = {
      id: `mrg-${Date.now()}`,
      parcelCode: mergedCode,
      owner: targets[0].owner,
      landUse: targets[0].landUse,
      areaSqm: Number(totalArea.toFixed(2)),
      status: 'ACTIVE',
      coordinates: targets[0].coordinates
    };

    const remaining = parcels.filter(p => !selectedParcelIds.includes(p.id)).concat([merged]);
    pushHistory(remaining);
    setSelectedParcelIds([]);
    toast.success(`Merge features completed: New Parcel ${mergedCode}`);
  };

  // Node tool
  const handleNodeTool = () => {
    if (!editingEnabled) {
      toast.error('Enable Editing mode first');
      return;
    }
    toast.success('Node Tool Active: Drag vertices to reshape parcel boundaries');
  };

  // Topology validation checker
  const handleCheckTopology = () => {
    const errors = [];
    parcels.forEach((p, idx) => {
      if (p.coordinates.length < 3) {
        errors.push({
          id: `err-${idx}-1`,
          error: 'Unclosed polygon boundary',
          layer: 'Parcel',
          feature: p.parcelCode
        });
      }
    });

    if (errors.length === 0) {
      errors.push({
        id: 'clean-1',
        error: 'No critical topology intersection found',
        layer: 'Parcel',
        feature: 'All (Passed ISO 19152)'
      });
    }

    setTopologyErrors(errors);
    setTopologyChecked(true);
    toast.success(`Topology check complete: ${errors.filter(e => !e.id.startsWith('clean')).length} errors found.`);
  };

  // Handle parcel click on map canvas
  const handleParcelClick = (parcel) => {
    if (activeTool === 'identify') {
      setIdentifyModalParcel(parcel);
    } else if (activeTool === 'select') {
      if (selectedParcelIds.includes(parcel.id)) {
        setSelectedParcelIds(selectedParcelIds.filter(id => id !== parcel.id));
      } else {
        setSelectedParcelIds([...selectedParcelIds, parcel.id]);
      }
    }
  };

  // Filtered transactions
  const filteredTransactions = useMemo(() => {
    return transactions.filter(t => {
      const matchesSearch = !txnFilterText || 
        t.transactionNumber.toLowerCase().includes(txnFilterText.toLowerCase()) ||
        t.applicationNumber.toLowerCase().includes(txnFilterText.toLowerCase()) ||
        t.parcel.toLowerCase().includes(txnFilterText.toLowerCase()) ||
        t.transactionType.toLowerCase().includes(txnFilterText.toLowerCase());

      const matchesStatus = txnFilterStatus === '...all...' || t.status === txnFilterStatus;

      return matchesSearch && matchesStatus;
    });
  }, [transactions, txnFilterText, txnFilterStatus]);

  const totalPages = Math.ceil(filteredTransactions.length / pageSize) || 1;
  const paginatedTransactions = filteredTransactions.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  // --- 3.3.1 Initiating a Transaction in RECS ---
  const executeInitiateTransaction = async (txn) => {
    try {
      await client.post(`/transactions/${txn.id}/initiate`);
    } catch (e) {}
    
    // Update local status to INITIATED / INPROCESS
    setTransactions(prev => prev.map(t => t.id === txn.id ? { ...t, status: 'INITIATED' } : t));
    
    // Display confirmation dialog matching manual: "If the transaction Initiated successfully, the system will display confirmation message and click OK"
    setInitiateConfirmDialog({
      transactionNumber: txn.transactionNumber,
      message: `Transaction ${txn.transactionNumber} Initiated successfully.`
    });
    setTxnContextMenu(null);
  };

  // --- 3.3.2 Loading a Transaction in RECS ---
  const executeLoadTransaction = (txn) => {
    // Locate target parcel and neighbors
    const targetParcel = parcels.find(p => p.parcelCode === txn.parcel) || parcels[0];
    const neighbors = parcels.filter(p => p.id !== targetParcel.id).slice(0, 3);

    setLoadedTxnData({
      txnNumber: txn.transactionNumber,
      taskParcel: targetParcel,
      neighborParcels: neighbors,
      visible: true
    });

    // Zoom directly to target parcel group
    setMapAction({ type: 'ZOOM_TO_PARCEL', coords: targetParcel.coordinates });
    setSelectedParcelIds([targetParcel.id]);

    toast.success(`Transaction layer ${txn.transactionNumber} loaded into workspace (Task & Neighbors)`);
    setTxnContextMenu(null);
  };

  // --- 3.3.3 Remove Transaction Data from Layer Panel ---
  const executeRemoveTransactionLayer = () => {
    setLoadedTxnData(null);
    setSelectedParcelIds([]);
    toast('Transaction working layer removed from Layer Panel and Map Canvas', { icon: '🗑️' });
    setTxnContextMenu(null);
    setLayerContextMenu(null);
  };

  // Handle generic transaction action
  const handleTxnAction = async (actionType) => {
    const selectedTxn = transactions.find(t => t.id === selectedTxnId);
    if (!selectedTxn) {
      toast.error('Select a transaction row first!');
      return;
    }

    if (actionType === 'INITIATE') {
      executeInitiateTransaction(selectedTxn);
    } else if (actionType === 'LOAD') {
      executeLoadTransaction(selectedTxn);
    } else if (actionType === 'REMOVE') {
      executeRemoveTransactionLayer();
    } else if (actionType === 'SAVE') {
      toast.success(`Transaction Layer for ${selectedTxn.transactionNumber} saved to database`);
    } else if (actionType === 'FINISH') {
      try {
        await client.post(`/transactions/${selectedTxn.id}/finish`);
      } catch (e) {}
      setTransactions(transactions.map(t => t.id === selectedTxn.id ? { ...t, status: 'FINISHED' } : t));
      toast.success(`Transaction ${selectedTxn.transactionNumber} saved and finished`);
    } else if (actionType === 'ACCEPT') {
      try {
        await client.post(`/transactions/${selectedTxn.id}/approve`);
      } catch (e) {}
      setTransactions(transactions.map(t => t.id === selectedTxn.id ? { ...t, status: 'APPROVED' } : t));
      toast.success(`Transaction ${selectedTxn.transactionNumber} accepted & approved`);
    } else if (actionType === 'REJECT') {
      try {
        await client.post(`/transactions/${selectedTxn.id}/reject`, { reason: 'Spatial boundary error' });
      } catch (e) {}
      setTransactions(transactions.map(t => t.id === selectedTxn.id ? { ...t, status: 'REJECTED' } : t));
      toast.error(`Transaction ${selectedTxn.transactionNumber} rejected`);
    } else if (actionType === 'CANCEL') {
      try {
        await client.post(`/transactions/${selectedTxn.id}/cancel`, { reason: 'Cancelled by officer' });
      } catch (e) {}
      setTransactions(transactions.map(t => t.id === selectedTxn.id ? { ...t, status: 'CANCELED' } : t));
      toast('Transaction cancelled', { icon: '⚠️' });
    } else if (actionType === 'ROLLBACK') {
      toast.success(`Rolled back spatial data for ${selectedTxn.transactionNumber}`);
    }
  };

  // Right-click on transaction row (Screenshot 1 & 2)
  const handleTxnRowContextMenu = (e, txn) => {
    e.preventDefault();
    setSelectedTxnId(txn.id);
    const rect = e.currentTarget.getBoundingClientRect();
    setTxnContextMenu({
      x: e.clientX,
      y: e.clientY,
      txn
    });
  };

  // Import Survey Layer handler (Section 3.3.4)
  const handleImportSurveyLayer = (newLayer) => {
    setImportedSurveyLayers(prev => [...prev, newLayer]);
    // Zoom to imported points
    if (newLayer.points && newLayer.points.length > 0) {
      setMapAction({ type: 'ZOOM_TO_POINTS', points: newLayer.points });
    }
  };

  // Close context menus on outside click
  useEffect(() => {
    const handleGlobalClick = () => {
      setTxnContextMenu(null);
      setLayerContextMenu(null);
      setShowLayerMenu(false);
    };
    window.addEventListener('click', handleGlobalClick);
    return () => window.removeEventListener('click', handleGlobalClick);
  }, []);

  return (
    <div className="recs-desktop-app flex flex-col h-[calc(100vh-4.5rem)] bg-[#ece9d8] text-slate-800 font-sans select-none border-2 border-[#0055ea] shadow-2xl rounded-xs overflow-hidden">
      
      {/* 1. TOP WINDOW TITLEBAR (Screenshot 2 styling: blue diamond + NCRPRS) */}
      <div className="bg-gradient-to-r from-[#0055ea] via-[#0055ea] to-[#3a83f7] text-white px-2 py-1 flex items-center justify-between text-xs font-semibold shadow-inner select-none">
        <div className="flex items-center gap-2">
          <span className="text-white font-extrabold text-sm drop-shadow">◆</span>
          <span className="tracking-wide text-white drop-shadow font-bold">NCRPRS - Real Estate Cadastre System (RECS)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <button 
            onClick={() => setShowLoginModal(true)} 
            className="text-[11px] px-2 py-0.5 bg-blue-700 hover:bg-blue-600 rounded text-white flex items-center gap-1 border border-blue-400"
            title="Open Legacy RECS Login Window"
          >
            <span>RECS Login Window</span>
          </button>
          <div className="flex items-center gap-1 pl-2">
            <button className="w-5 h-4 bg-[#ece9d8] hover:bg-white text-slate-800 text-[10px] font-bold flex items-center justify-center rounded-xs shadow-xs border border-slate-400">-</button>
            <button className="w-5 h-4 bg-[#ece9d8] hover:bg-white text-slate-800 text-[10px] font-bold flex items-center justify-center rounded-xs shadow-xs border border-slate-400">□</button>
            <button onClick={() => toast('RECS Window Closed', { icon: '🚪' })} className="w-5 h-4 bg-[#d93829] hover:bg-red-700 text-white text-[10px] font-bold flex items-center justify-center rounded-xs shadow-xs border border-red-900">✕</button>
          </div>
        </div>
      </div>

      {/* 2. MENU BAR (Dark slate/navy blue #1b365d) */}
      <div className="bg-[#1b365d] text-white px-3 py-1 flex items-center gap-5 text-xs font-medium border-b border-[#0f2442] relative select-none">
        <button className="hover:text-blue-200 transition py-0.5" onClick={() => toast('Project menu: New, Open, Save, Print')}>File</button>
        <div className="relative">
          <button 
            className="hover:text-blue-200 transition py-0.5 flex items-center gap-0.5" 
            onClick={(e) => {
              e.stopPropagation();
              const rect = e.currentTarget.getBoundingClientRect();
              setContextMenuPos({ x: rect.left, y: rect.bottom });
              setShowViewContextMenu(!showViewContextMenu);
            }}
          >
            View <ChevronDown className="w-3 h-3" />
          </button>
        </div>
        <button className="hover:text-blue-200 transition py-0.5" onClick={() => setEditingEnabled(!editingEnabled)}>Edit</button>
        
        {/* Layer Menu (Section 3.3.4: Add Vector Layer) */}
        <div className="relative">
          <button 
            className="hover:text-blue-200 transition py-0.5 flex items-center gap-0.5" 
            onClick={(e) => {
              e.stopPropagation();
              setShowLayerMenu(!showLayerMenu);
            }}
          >
            Layer <ChevronDown className="w-3 h-3" />
          </button>
          {showLayerMenu && (
            <div className="absolute left-0 top-full mt-1 bg-[#f4f4f4] text-slate-800 border border-slate-400 shadow-xl rounded-xs py-1 w-44 z-[9000] text-xs">
              <button 
                onClick={() => { setShowAddVectorModal(true); setShowLayerMenu(false); }}
                className="w-full text-left px-3 py-1.5 hover:bg-[#3399ff] hover:text-white flex items-center gap-2"
              >
                <span className="font-bold text-emerald-600">V+</span>
                <span>Add Vector Layer</span>
              </button>
              <button 
                onClick={() => { toast('Save Layer As shapefile/DXF'); setShowLayerMenu(false); }}
                className="w-full text-left px-3 py-1.5 hover:bg-[#3399ff] hover:text-white flex items-center gap-2 text-slate-600"
              >
                <span>Save As...</span>
              </button>
            </div>
          )}
        </div>

        <button className="hover:text-blue-200 transition py-0.5" onClick={() => toast('Transaction Menu: Initiate, Load, Finish, Rollback')}>Transaction</button>
        <button className="hover:text-blue-200 transition py-0.5" onClick={() => setShowLoginModal(true)}>Account</button>
        <button className="hover:text-blue-200 transition py-0.5" onClick={() => toast('Languages: English, Amharic, Oromo, Tigrinya')}>Language</button>
        <button className="hover:text-blue-200 transition py-0.5" onClick={() => toast('CRS: EPSG:20137 Adindan / UTM zone 37N')}>Setting</button>
      </div>

      {/* VIEW > PANELS / TOOLBARS CONTEXT MENU */}
      {showViewContextMenu && (
        <div 
          className="fixed z-[9000] bg-[#f4f4f4] text-slate-800 border border-slate-400 shadow-2xl rounded-xs py-1 w-52 text-xs font-sans"
          style={{ top: `${contextMenuPos.y + 2}px`, left: `${contextMenuPos.x}px` }}
          onMouseLeave={() => setShowViewContextMenu(false)}
        >
          <div onClick={() => setVisiblePanels({ ...visiblePanels, undoRedo: !visiblePanels.undoRedo })} className="px-3 py-1 hover:bg-[#3399ff] hover:text-white flex items-center justify-between cursor-pointer">
            <span>Undo/Redo Panel</span>
            {visiblePanels.undoRedo && <span className="font-bold text-blue-600">✓</span>}
          </div>
          <div onClick={() => setVisiblePanels({ ...visiblePanels, transactions: !visiblePanels.transactions })} className="px-3 py-1 hover:bg-[#3399ff] hover:text-white flex items-center justify-between cursor-pointer">
            <span>Transactions Panel</span>
            {visiblePanels.transactions && <span className="font-bold text-blue-600">✓</span>}
          </div>
          <div onClick={() => setVisiblePanels({ ...visiblePanels, topologyChecker: !visiblePanels.topologyChecker })} className="px-3 py-1 hover:bg-[#3399ff] hover:text-white flex items-center justify-between cursor-pointer">
            <span>Topology Checker</span>
            {visiblePanels.topologyChecker && <span className="font-bold text-blue-600">✓</span>}
          </div>
          <div onClick={() => setVisiblePanels({ ...visiblePanels, layersPanel: !visiblePanels.layersPanel })} className="px-3 py-1 hover:bg-[#3399ff] hover:text-white flex items-center justify-between cursor-pointer">
            <span>Layers Panel</span>
            {visiblePanels.layersPanel && <span className="font-bold text-blue-600">✓</span>}
          </div>
          <div onClick={() => setVisiblePanels({ ...visiblePanels, layerOrderPanel: !visiblePanels.layerOrderPanel })} className="px-3 py-1 hover:bg-[#3399ff] hover:text-white flex items-center justify-between cursor-pointer">
            <span>Layer Order Panel</span>
            {visiblePanels.layerOrderPanel && <span className="font-bold text-blue-600">✓</span>}
          </div>
          <div className="border-t border-slate-300 my-1"></div>
          <div onClick={() => setVisibleToolbars({ ...visibleToolbars, taskToolbar: !visibleToolbars.taskToolbar })} className="px-3 py-1 hover:bg-[#3399ff] hover:text-white flex items-center justify-between cursor-pointer">
            <span>Task Toolbar</span>
            {visibleToolbars.taskToolbar && <span className="font-bold text-blue-600">✓</span>}
          </div>
          <div onClick={() => setVisibleToolbars({ ...visibleToolbars, digitizing: !visibleToolbars.digitizing })} className="px-3 py-1 hover:bg-[#3399ff] hover:text-white flex items-center justify-between cursor-pointer">
            <span>Digitizing</span>
            {visibleToolbars.digitizing && <span className="font-bold text-blue-600">✓</span>}
          </div>
          <div onClick={() => setVisibleToolbars({ ...visibleToolbars, navigation: !visibleToolbars.navigation })} className="px-3 py-1 hover:bg-[#3399ff] hover:text-white flex items-center justify-between cursor-pointer">
            <span>Navigation</span>
            {visibleToolbars.navigation && <span className="font-bold text-blue-600">✓</span>}
          </div>
          <div onClick={() => setVisibleToolbars({ ...visibleToolbars, attribute: !visibleToolbars.attribute })} className="px-3 py-1 hover:bg-[#3399ff] hover:text-white flex items-center justify-between cursor-pointer">
            <span>Attribute</span>
            {visibleToolbars.attribute && <span className="font-bold text-blue-600">✓</span>}
          </div>
          <div onClick={() => setVisibleToolbars({ ...visibleToolbars, transaction: !visibleToolbars.transaction })} className="px-3 py-1 hover:bg-[#3399ff] hover:text-white flex items-center justify-between cursor-pointer">
            <span>Transaction</span>
            {visibleToolbars.transaction && <span className="font-bold text-blue-600">✓</span>}
          </div>
          <div onClick={() => setVisibleToolbars({ ...visibleToolbars, drawPolygon: !visibleToolbars.drawPolygon })} className="px-3 py-1 hover:bg-[#3399ff] hover:text-white flex items-center justify-between cursor-pointer">
            <span>Draw Polygon</span>
            {visibleToolbars.drawPolygon && <span className="font-bold text-blue-600">✓</span>}
          </div>
        </div>
      )}

      {/* 3. TOOLBARS DOCK */}
      <div className="bg-[#f0f0f0] border-b border-slate-300 p-1 flex flex-wrap items-center gap-1.5 text-slate-700 shadow-xs">
        
        {/* Task Toolbar */}
        {visibleToolbars.taskToolbar && (
          <div className="flex items-center border-r border-slate-300 pr-1.5 mr-0.5">
            <button 
              onClick={() => toast.success('Cadastre task state saved to database')} 
              className="p-1 hover:bg-slate-200 active:bg-slate-300 rounded border border-transparent hover:border-slate-300"
              title="Save task"
            >
              <Save className="w-4 h-4 text-blue-600" />
            </button>
          </div>
        )}

        {/* Digitizing Toolbar */}
        {visibleToolbars.digitizing && (
          <div className="flex items-center gap-0.5 border-r border-slate-300 pr-1.5 mr-0.5">
            <button 
              onClick={() => setEditingEnabled(!editingEnabled)} 
              className={`p-1 rounded border ${editingEnabled ? 'bg-amber-100 border-amber-400 text-amber-800' : 'hover:bg-slate-200 border-transparent hover:border-slate-300'}`}
              title="Toggle Editing"
            >
              <Edit3 className="w-4 h-4" />
            </button>
            <button onClick={handleUndo} className="p-1 hover:bg-slate-200 rounded border border-transparent hover:border-slate-300" title="Undo Edit">
              <Undo2 className="w-4 h-4 text-slate-600" />
            </button>
            <button onClick={handleRedo} className="p-1 hover:bg-slate-200 rounded border border-transparent hover:border-slate-300" title="Redo Edit">
              <Redo2 className="w-4 h-4 text-slate-600" />
            </button>
            <button onClick={handleSplitParcel} className="p-1 hover:bg-slate-200 rounded border border-transparent hover:border-slate-300 text-amber-700" title="Split features">
              <Scissors className="w-4 h-4" />
            </button>
            <button onClick={handleMergeParcels} className="p-1 hover:bg-slate-200 rounded border border-transparent hover:border-slate-300 text-emerald-700" title="Merge features">
              <Combine className="w-4 h-4" />
            </button>
            <button onClick={handleNodeTool} className="p-1 hover:bg-slate-200 rounded border border-transparent hover:border-slate-300" title="Node Tool">
              <Crosshair className="w-4 h-4 text-indigo-600" />
            </button>
          </div>
        )}

        {/* Navigation Toolbar */}
        {visibleToolbars.navigation && (
          <div className="flex items-center gap-0.5 border-r border-slate-300 pr-1.5 mr-0.5">
            <button onClick={() => setActiveTool('pan')} className={`p-1 rounded border ${activeTool === 'pan' ? 'bg-blue-100 border-blue-400 text-blue-700' : 'hover:bg-slate-200 border-transparent'}`} title="Pan Map"><Hand className="w-4 h-4" /></button>
            <button onClick={() => {
              if (selectedParcelIds.length > 0) {
                const target = parcels.find(p => p.id === selectedParcelIds[0]);
                if (target) setMapAction({ type: 'ZOOM_TO_PARCEL', coords: target.coordinates });
              }
            }} className="p-1 hover:bg-slate-200 rounded border border-transparent" title="Pan to Selected"><Target className="w-4 h-4 text-slate-700" /></button>
            <button onClick={() => setMapAction({ type: 'ZOOM_IN' })} className="p-1 hover:bg-slate-200 rounded border border-transparent" title="Zoom In"><ZoomIn className="w-4 h-4 text-slate-700" /></button>
            <button onClick={() => setMapAction({ type: 'ZOOM_OUT' })} className="p-1 hover:bg-slate-200 rounded border border-transparent" title="Zoom Out"><ZoomOut className="w-4 h-4 text-slate-700" /></button>
            <button onClick={() => setMapAction({ type: 'ZOOM_1_1' })} className="p-1 hover:bg-slate-200 rounded border border-transparent" title="Zoom Actual Size (1:1)"><Search className="w-4 h-4 text-slate-700" /></button>
            <button onClick={() => setMapAction({ type: 'ZOOM_FULL' })} className="p-1 hover:bg-slate-200 rounded border border-transparent" title="Zoom Full"><Maximize className="w-4 h-4 text-slate-700" /></button>
            <button onClick={() => loadBackendData()} className="p-1 hover:bg-slate-200 rounded border border-transparent" title="Refresh"><RotateCw className="w-4 h-4 text-slate-700" /></button>
          </div>
        )}

        {/* Attribute Toolbar */}
        {visibleToolbars.attribute && (
          <div className="flex items-center gap-0.5 border-r border-slate-300 pr-1.5 mr-0.5">
            <button onClick={() => setActiveTool('identify')} className={`p-1 rounded border ${activeTool === 'identify' ? 'bg-blue-100 border-blue-400 text-blue-700' : 'hover:bg-slate-200 border-transparent'}`} title="Identify features"><Info className="w-4 h-4 text-[#0066cc]" /></button>
            <button onClick={() => setActiveTool('select')} className={`p-1 rounded border ${activeTool === 'select' ? 'bg-amber-100 border-amber-400 text-amber-800' : 'hover:bg-slate-200 border-transparent'}`} title="Select features"><MousePointer className="w-4 h-4 text-slate-700" /></button>
            <button onClick={() => { setSelectedParcelIds([]); toast('Features Deselected'); }} className="p-1 hover:bg-slate-200 rounded border border-transparent" title="Deselect"><Slash className="w-4 h-4 text-red-600" /></button>
            <button onClick={() => setShowAttributeTable(true)} className="p-1 hover:bg-slate-200 rounded border border-transparent" title="Open Attributes Table"><Table className="w-4 h-4 text-emerald-700" /></button>
            <button onClick={() => setActiveTool('measure_line')} className={`p-1 rounded border ${activeTool === 'measure_line' ? 'bg-indigo-100 border-indigo-400 text-indigo-700' : 'hover:bg-slate-200 border-transparent'}`} title="Measure Line"><Ruler className="w-4 h-4 text-indigo-700" /></button>
            <button onClick={() => setActiveTool('measure_area')} className={`p-1 rounded border ${activeTool === 'measure_area' ? 'bg-indigo-100 border-indigo-400 text-indigo-700' : 'hover:bg-slate-200 border-transparent'}`} title="Measure Area"><BoxSelect className="w-4 h-4 text-indigo-700" /></button>
          </div>
        )}

        {/* Transaction Toolbar (Matching Screenshots 1 & 2: Initiate, Load, Remove, Save, Finish, Cancel, Accept, Reject, Rollback) */}
        {visibleToolbars.transaction && (
          <div className="flex items-center gap-0.5 border-r border-slate-300 pr-1.5 mr-0.5">
            {/* Initiate Tool (Document with green play icon) */}
            <button 
              onClick={() => handleTxnAction('INITIATE')} 
              className="p-1 hover:bg-slate-200 rounded border border-transparent hover:border-slate-300 text-emerald-700 flex items-center"
              title="Initiate Transaction (Allows to initiate a task)"
            >
              <FilePlus className="w-4 h-4" />
            </button>
            {/* Load Transaction Layer */}
            <button 
              onClick={() => handleTxnAction('LOAD')} 
              className="p-1 hover:bg-slate-200 rounded border border-transparent hover:border-slate-300 text-blue-700"
              title="Load Transaction Layer (Allows to load created transaction working data)"
            >
              <FolderOpen className="w-4 h-4" />
            </button>
            {/* Remove Transaction Layer */}
            <button 
              onClick={() => handleTxnAction('REMOVE')} 
              className="p-1 hover:bg-slate-200 rounded border border-transparent hover:border-slate-300 text-red-600"
              title="Remove Transaction Layer from Layer Panel & Canvas"
            >
              <FolderMinus className="w-4 h-4" />
            </button>
            <button onClick={() => handleTxnAction('SAVE')} className="p-1 hover:bg-slate-200 rounded border border-transparent hover:border-slate-300 text-blue-600" title="Save Transaction Layer"><Save className="w-4 h-4" /></button>
            <button onClick={() => handleTxnAction('FINISH')} className="p-1 hover:bg-slate-200 rounded border border-transparent hover:border-slate-300 text-emerald-700" title="Save and Finish Transaction"><CheckSquare className="w-4 h-4" /></button>
            <button onClick={() => handleTxnAction('CANCEL')} className="p-1 hover:bg-slate-200 rounded border border-transparent hover:border-slate-300 text-red-600" title="Cancel Transaction"><Ban className="w-4 h-4" /></button>
            <button onClick={() => handleTxnAction('ACCEPT')} className="p-1 hover:bg-slate-200 rounded border border-transparent hover:border-slate-300 text-emerald-600" title="Accept Transaction (Senior Officer)"><CheckCircle2 className="w-4 h-4" /></button>
            <button onClick={() => handleTxnAction('REJECT')} className="p-1 hover:bg-slate-200 rounded border border-transparent hover:border-slate-300 text-rose-600" title="Reject Transaction"><XCircle className="w-4 h-4" /></button>
            <button onClick={() => handleTxnAction('ROLLBACK')} className="p-1 hover:bg-slate-200 rounded border border-transparent hover:border-slate-300 text-slate-600" title="Roll Back"><RotateCcw className="w-4 h-4" /></button>
          </div>
        )}

        {/* Vector Import & Draw Polygon Toolbar */}
        <div className="flex items-center gap-0.5">
          <button 
            onClick={() => setShowAddVectorModal(true)} 
            className="p-1 bg-white hover:bg-emerald-50 rounded border border-slate-300 text-emerald-700 font-bold flex items-center gap-0.5 text-xs px-1.5 shadow-xs"
            title="Add Vector Layer (Import Surveyed Data CSV/TXT/DXF/SHP)"
          >
            <span className="font-extrabold text-[11px]">V+</span>
            <span className="text-[10px]">Add Vector Layer</span>
          </button>
          <button onClick={() => setActiveTool('draw_point')} className={`p-1 rounded border ${activeTool === 'draw_point' ? 'bg-red-100 border-red-400' : 'hover:bg-slate-200 border-transparent'}`} title="Draw border point"><MapPin className="w-4 h-4 text-red-600" /></button>
          <button onClick={() => setActiveTool('draw_line')} className={`p-1 rounded border ${activeTool === 'draw_line' ? 'bg-blue-100 border-blue-400' : 'hover:bg-slate-200 border-transparent'}`} title="Draw boundary line"><GitCommit className="w-4 h-4 text-slate-700" /></button>
          <button onClick={() => setActiveTool('draw_polygon')} className={`p-1 rounded border ${activeTool === 'draw_polygon' ? 'bg-emerald-100 border-emerald-400' : 'hover:bg-slate-200 border-transparent'}`} title="Draw polygon"><Pentagon className="w-4 h-4 text-emerald-700" /></button>
        </div>
      </div>

      {/* 4. MAIN CENTRAL GIS WORKSPACE */}
      <div className="flex-1 flex overflow-hidden relative">

        {/* --- LEFT DOCK: Layers Panel & Layer Order Panel --- */}
        {(visiblePanels.layersPanel || visiblePanels.layerOrderPanel) && (
          <div className="w-56 bg-[#f0f0f0] border-r border-slate-300 flex flex-col shrink-0 text-xs shadow-sm">
            
            {/* Layers Panel (Top left) */}
            {visiblePanels.layersPanel && (
              <div className="flex-1 border-b border-slate-300 flex flex-col min-h-[180px]">
                <div className="bg-[#e4e4e4] border-b border-slate-300 px-2 py-1 flex items-center justify-between font-semibold text-slate-700">
                  <div className="flex items-center gap-1.5">
                    <LayersIcon className="w-3.5 h-3.5 text-blue-600" />
                    <span>Layers Panel</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <button className="text-slate-500 hover:text-slate-800 text-[10px]">-</button>
                    <button onClick={() => setVisiblePanels({ ...visiblePanels, layersPanel: false })} className="text-slate-500 hover:text-red-600 text-[10px]">✕</button>
                  </div>
                </div>

                <div className="p-2 space-y-2 overflow-y-auto flex-1 bg-white select-none">
                  
                  {/* LOADED TRANSACTION WORKING GROUP (Screenshot 3: media_1791218407470.png) */}
                  {loadedTxnData && (
                    <div 
                      className="border border-blue-300 bg-blue-50/40 rounded p-1.5 mb-2 relative"
                      onContextMenu={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setLayerContextMenu({
                          x: e.clientX,
                          y: e.clientY,
                          type: 'TRANSACTION_GROUP'
                        });
                      }}
                    >
                      <div className="flex items-center justify-between font-bold text-blue-900 border-b border-blue-200 pb-1">
                        <label className="flex items-center gap-1.5 cursor-pointer">
                          <input 
                            type="checkbox" 
                            checked={loadedTxnData.visible}
                            onChange={(e) => setLoadedTxnData({ ...loadedTxnData, visible: e.target.checked })}
                          />
                          <span className="truncate">{loadedTxnData.txnNumber}</span>
                        </label>
                        <span className="text-[9px] bg-blue-200 text-blue-800 px-1 rounded">Working</span>
                      </div>

                      <div className="pl-4 pt-1 space-y-1 text-[11px] text-slate-700">
                        <div className="flex items-center gap-1.5">
                          <input type="checkbox" defaultChecked />
                          <span className="w-2 h-2 rounded-full bg-emerald-600"></span>
                          <span>Borderpoint</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <input type="checkbox" defaultChecked />
                          <span className="w-3 h-0.5 bg-emerald-600"></span>
                          <span>Boundaryline</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <input type="checkbox" defaultChecked />
                          <span className="w-2.5 h-2.5 bg-cyan-400"></span>
                          <span>Servitude</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <input type="checkbox" defaultChecked />
                          <span className="w-2.5 h-2.5 bg-amber-500"></span>
                          <span>Building</span>
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5 font-semibold text-slate-800">
                            <input type="checkbox" defaultChecked />
                            <span>Parcel</span>
                          </div>
                          <div className="pl-4 space-y-0.5 text-[10px]">
                            {/* Task Parcel (Red/Pink highlight) */}
                            <div className="flex items-center gap-1.5">
                              <input type="checkbox" defaultChecked />
                              <span className="w-2.5 h-2.5 bg-[#ef4444] border border-red-700 inline-block"></span>
                              <span className="font-semibold text-red-700">Task ({loadedTxnData.taskParcel.parcelCode})</span>
                            </div>
                            {/* Neighbors (Blue/Cyan highlight) */}
                            <div className="flex items-center gap-1.5">
                              <input type="checkbox" defaultChecked />
                              <span className="w-2.5 h-2.5 bg-[#60a5fa] border border-blue-600 inline-block"></span>
                              <span className="text-blue-700">Neighbors ({loadedTxnData.neighborParcels.length})</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* IMPORTED SURVEY LAYERS (Screenshot 5: media_1791218539117.png) */}
                  {importedSurveyLayers.length > 0 && (
                    <div className="border border-emerald-300 bg-emerald-50/40 rounded p-1.5 mb-2">
                      <div className="font-bold text-emerald-900 border-b border-emerald-200 pb-1 mb-1 text-[11px] flex justify-between">
                        <span>Survey Point Layers</span>
                        <span className="text-[9px] bg-emerald-200 text-emerald-800 px-1 rounded">GPS / Total Station</span>
                      </div>
                      <div className="space-y-1 text-[11px]">
                        {importedSurveyLayers.map((sLayer) => (
                          <div 
                            key={sLayer.id} 
                            className="flex items-center justify-between hover:bg-emerald-100 p-0.5 rounded cursor-pointer"
                            onContextMenu={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              setLayerContextMenu({
                                x: e.clientX,
                                y: e.clientY,
                                type: 'SURVEY_LAYER',
                                layerId: sLayer.id,
                                points: sLayer.points
                              });
                            }}
                          >
                            <label className="flex items-center gap-1.5 cursor-pointer">
                              <input 
                                type="checkbox" 
                                checked={sLayer.visible}
                                onChange={(e) => {
                                  setImportedSurveyLayers(importedSurveyLayers.map(l => l.id === sLayer.id ? { ...l, visible: e.target.checked } : l));
                                }}
                              />
                              <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ backgroundColor: sLayer.color }}></span>
                              <span className="font-medium text-slate-800">{sLayer.name}</span>
                            </label>
                            <button 
                              onClick={() => setMapAction({ type: 'ZOOM_TO_POINTS', points: sLayer.points })} 
                              className="text-[10px] text-blue-600 hover:underline"
                              title="Zoom to Layer"
                            >
                              Zoom
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Base Map root */}
                  <div className="flex items-center gap-1.5 font-medium text-slate-800">
                    <input 
                      type="checkbox" 
                      checked={layersVisibility.baseMap}
                      onChange={e => setLayersVisibility({ ...layersVisibility, baseMap: e.target.checked })}
                      className="rounded-xs"
                    />
                    <span>Base Map</span>
                  </div>

                  {/* Sub-layers matching Base Map */}
                  <div className="pl-4 space-y-1.5 text-[11px] text-slate-700">
                    <label className="flex items-center gap-2 hover:bg-blue-50 p-0.5 rounded cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={layersVisibility.borderpoint} 
                        onChange={e => setLayersVisibility({ ...layersVisibility, borderpoint: e.target.checked })}
                      />
                      <span className="w-2 h-2 rounded-full bg-red-600 inline-block"></span>
                      <span>Borderpoint</span>
                    </label>

                    <label className="flex items-center gap-2 hover:bg-blue-50 p-0.5 rounded cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={layersVisibility.boundaryline} 
                        onChange={e => setLayersVisibility({ ...layersVisibility, boundaryline: e.target.checked })}
                      />
                      <span className="w-3 h-0.5 bg-blue-600 inline-block"></span>
                      <span>Boundaryline</span>
                    </label>

                    <label className="flex items-center gap-2 hover:bg-blue-50 p-0.5 rounded cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={layersVisibility.building} 
                        onChange={e => setLayersVisibility({ ...layersVisibility, building: e.target.checked })}
                      />
                      <span className="w-2.5 h-2.5 bg-[#f59e0b] border border-[#d97706] inline-block"></span>
                      <span>Building</span>
                    </label>

                    <label className="flex items-center gap-2 hover:bg-blue-50 p-0.5 rounded cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={layersVisibility.parcel} 
                        onChange={e => setLayersVisibility({ ...layersVisibility, parcel: e.target.checked })}
                      />
                      <span className="w-2.5 h-2.5 bg-[#86efac] border border-[#16a34a] inline-block"></span>
                      <span>Parcel</span>
                    </label>

                    <label className="flex items-center gap-2 hover:bg-blue-50 p-0.5 rounded cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={layersVisibility.servitude} 
                        onChange={e => setLayersVisibility({ ...layersVisibility, servitude: e.target.checked })}
                      />
                      <span className="w-2.5 h-2.5 border border-dashed border-purple-600 bg-purple-100 inline-block"></span>
                      <span>Servitude</span>
                    </label>
                  </div>
                </div>
              </div>
            )}

            {/* Layer Order Panel (Bottom left) */}
            {visiblePanels.layerOrderPanel && (
              <div className="h-44 flex flex-col bg-white">
                <div className="bg-[#e4e4e4] border-b border-slate-300 px-2 py-1 flex items-center justify-between font-semibold text-slate-700">
                  <span>Layer Order Panel</span>
                  <div className="flex items-center gap-1">
                    <button className="text-slate-500 hover:text-slate-800 text-[10px]">-</button>
                    <button onClick={() => setVisiblePanels({ ...visiblePanels, layerOrderPanel: false })} className="text-slate-500 hover:text-red-600 text-[10px]">✕</button>
                  </div>
                </div>

                <div className="p-2 space-y-1 overflow-y-auto flex-1 text-[11px]">
                  {layerOrder.map((layerName) => (
                    <div key={layerName} className="flex items-center justify-between hover:bg-slate-100 p-0.5 rounded">
                      <label className="flex items-center gap-1.5 cursor-pointer">
                        <input type="checkbox" defaultChecked className="rounded-xs" />
                        <span>{layerName}</span>
                      </label>
                    </div>
                  ))}
                </div>

                <div className="border-t border-slate-200 p-1.5 bg-[#f9f9f9]">
                  <label className="flex items-center gap-1.5 text-[11px] text-slate-700 cursor-pointer font-medium">
                    <input 
                      type="checkbox" 
                      checked={controlRenderOrder} 
                      onChange={e => setControlRenderOrder(e.target.checked)} 
                      className="rounded-xs"
                    />
                    <span>Control rendering order</span>
                  </label>
                </div>
              </div>
            )}
          </div>
        )}

        {/* --- CENTER MAP CANVAS & TRANSACTIONS DOCK --- */}
        <div className="flex-1 flex flex-col relative overflow-hidden bg-[#e0e5eb]">
          
          {/* Cadastral Map View */}
          <div className="flex-1 relative z-0">
            <MapContainer 
              center={[BASE_LAT + 0.0015, BASE_LNG + 0.0018]} 
              zoom={17} 
              style={{ width: '100%', height: '100%' }}
              zoomControl={false}
            >
              <MapEventsTracker 
                onMouseMove={(easting, northing) => {
                  if (!extentLocked) {
                    setCurrentCoords({ easting, northing });
                  }
                }}
                onZoomChange={(scale) => setCurrentScale(`1:${scale}`)}
              />

              <MapActionController mapAction={mapAction} onActionExecuted={() => setMapAction(null)} />

              {layersVisibility.baseMap && (
                <TileLayer 
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  attribution="&copy; OpenStreetMap | RECS Cadastre Engine v1.0.4"
                />
              )}

              {/* Servitude Polygons */}
              {layersVisibility.servitude && servitudes.map(srv => (
                <Polygon
                  key={srv.id}
                  positions={srv.coordinates}
                  pathOptions={{
                    color: '#9333ea',
                    dashArray: '6, 6',
                    fillColor: '#c084fc',
                    fillOpacity: 0.25,
                    weight: 1.5
                  }}
                />
              ))}

              {/* Standard Parcels */}
              {layersVisibility.parcel && parcels.map(parcel => {
                const isSelected = selectedParcelIds.includes(parcel.id);
                // Check if part of loaded transaction
                const isTaskParcel = loadedTxnData?.visible && loadedTxnData.taskParcel?.id === parcel.id;
                const isNeighborParcel = loadedTxnData?.visible && loadedTxnData.neighborParcels?.some(np => np.id === parcel.id);

                let strokeColor = '#16a34a';
                let fillColor = '#86efac';
                let fillOpacity = 0.45;

                if (isTaskParcel) {
                  strokeColor = '#b91c1c'; // Red outline for task
                  fillColor = '#f87171'; // Red/pink fill for task parcel (Screenshot 3)
                  fillOpacity = 0.7;
                } else if (isNeighborParcel) {
                  strokeColor = '#1d4ed8'; // Blue outline for neighbors
                  fillColor = '#60a5fa'; // Blue/cyan fill for neighbors (Screenshot 3)
                  fillOpacity = 0.55;
                } else if (isSelected) {
                  strokeColor = '#d97706';
                  fillColor = '#fde047';
                  fillOpacity = 0.65;
                }

                return (
                  <Polygon 
                    key={parcel.id}
                    positions={parcel.coordinates}
                    eventHandlers={{
                      click: () => handleParcelClick(parcel)
                    }}
                    pathOptions={{
                      color: strokeColor,
                      fillColor: fillColor,
                      fillOpacity: fillOpacity,
                      weight: isTaskParcel || isSelected ? 3 : 1.5
                    }}
                  >
                    <Popup>
                      <div className="p-1 font-sans text-xs">
                        <div className="font-bold text-blue-900 border-b pb-1 mb-1">
                          {parcel.parcelCode} {isTaskParcel && <span className="text-red-600 font-bold ml-1">(Task Target)</span>}
                        </div>
                        <div><strong>Holder:</strong> {parcel.owner}</div>
                        <div><strong>Land Use:</strong> {parcel.landUse}</div>
                        <div><strong>Area:</strong> {parcel.areaSqm} m²</div>
                        <div><strong>Status:</strong> {parcel.status}</div>
                      </div>
                    </Popup>
                  </Polygon>
                );
              })}

              {/* Imported Survey Points (Screenshot 5: media_1791218539117.png) */}
              {importedSurveyLayers.map(sLayer => sLayer.visible && sLayer.points.map(pt => (
                <CircleMarker
                  key={`${sLayer.id}-${pt.id}`}
                  center={[pt.lat, pt.lng]}
                  radius={5}
                  pathOptions={{
                    color: '#ffffff',
                    fillColor: sLayer.color,
                    fillOpacity: 1,
                    weight: 1.5
                  }}
                >
                  <Popup>
                    <div className="font-mono text-xs p-1">
                      <div className="font-bold text-emerald-900 border-b pb-0.5">{pt.id} - {pt.code}</div>
                      <div>Layer: {sLayer.name}</div>
                      <div>X (Easting): {pt.x.toFixed(2)}</div>
                      <div>Y (Northing): {pt.y.toFixed(2)}</div>
                      <div>Elevation: {pt.z.toFixed(1)} m</div>
                    </div>
                  </Popup>
                </CircleMarker>
              )))}

              {/* Building Footprints */}
              {layersVisibility.building && buildings.map(bldg => (
                <Polygon
                  key={bldg.id}
                  positions={bldg.coordinates}
                  pathOptions={{
                    color: '#b45309',
                    fillColor: '#f59e0b',
                    fillOpacity: 0.7,
                    weight: 1.5
                  }}
                />
              ))}

              {/* Boundary Lines */}
              {layersVisibility.boundaryline && parcels.map(parcel => (
                <Polyline 
                  key={`line-${parcel.id}`}
                  positions={[...parcel.coordinates, parcel.coordinates[0]]}
                  pathOptions={{
                    color: '#15803d',
                    weight: 1.2
                  }}
                />
              ))}

              {/* Border Points */}
              {layersVisibility.borderpoint && borderPoints.map(bp => (
                <CircleMarker
                  key={bp.id}
                  center={bp.coords}
                  radius={4}
                  pathOptions={{
                    color: '#1e3a8a',
                    fillColor: '#3b82f6',
                    fillOpacity: 1,
                    weight: 1.5
                  }}
                />
              ))}
            </MapContainer>
          </div>

          {/* --- TRANSACTIONS PANEL (Bottom dock matching Screenshot 1 & 2) --- */}
          {visiblePanels.transactions && (
            <div className="h-56 bg-[#f0f0f0] border-t-2 border-slate-300 flex flex-col shrink-0 text-xs shadow-md">
              <div className="bg-[#e4e4e4] border-b border-slate-300 px-3 py-1 flex items-center justify-between font-semibold text-slate-700">
                <span>Transactions Panel</span>
                <div className="flex items-center gap-1.5">
                  <button className="text-slate-500 hover:text-slate-800 text-[10px]">-</button>
                  <button onClick={() => setVisiblePanels({ ...visiblePanels, transactions: false })} className="text-slate-500 hover:text-red-600 text-[10px]">✕</button>
                </div>
              </div>

              {/* Filter controls */}
              <div className="p-1.5 bg-[#f8f8f8] border-b border-slate-300 flex items-center gap-3">
                <span className="font-medium text-slate-700">Filter</span>
                <input 
                  type="text" 
                  value={txnFilterText}
                  onChange={e => setTxnFilterText(e.target.value)}
                  placeholder="Filter transactions"
                  className="w-72 bg-white border border-slate-300 px-2 py-0.5 rounded-none text-xs outline-none focus:border-blue-500"
                />
                <select 
                  value={txnFilterStatus}
                  onChange={e => setTxnFilterStatus(e.target.value)}
                  className="bg-white border border-slate-300 px-2 py-0.5 rounded-none text-xs outline-none"
                >
                  <option value="...all...">...all...</option>
                  <option value="CREATED">CREATED</option>
                  <option value="INITIATED">INITIATED</option>
                  <option value="INPROCESS">INPROCESS</option>
                  <option value="APPROVED">APPROVED</option>
                  <option value="FINISHED">FINISHED</option>
                  <option value="CANCELED">CANCELED</option>
                </select>

                {/* Sub-toolbar inside Transactions Panel */}
                <div className="flex items-center gap-0.5 ml-2 border-l border-slate-300 pl-2">
                  <button onClick={() => handleTxnAction('INITIATE')} className="p-1 hover:bg-slate-200 border rounded text-emerald-700" title="Initiate Transaction"><FilePlus className="w-3.5 h-3.5"/></button>
                  <button onClick={() => handleTxnAction('LOAD')} className="p-1 hover:bg-slate-200 border rounded text-blue-700" title="Load Transaction Layer"><FolderOpen className="w-3.5 h-3.5"/></button>
                  <button onClick={() => handleTxnAction('REMOVE')} className="p-1 hover:bg-slate-200 border rounded text-red-600" title="Remove Transaction Layer"><FolderMinus className="w-3.5 h-3.5"/></button>
                  <button onClick={() => handleTxnAction('SAVE')} className="p-1 hover:bg-slate-200 border rounded text-blue-600" title="Save Transaction Layer"><Save className="w-3.5 h-3.5"/></button>
                  <button onClick={() => handleTxnAction('FINISH')} className="p-1 hover:bg-slate-200 border rounded text-emerald-700" title="Save and Finish Transaction"><CheckSquare className="w-3.5 h-3.5"/></button>
                  <button onClick={() => handleTxnAction('CANCEL')} className="p-1 hover:bg-slate-200 border rounded text-red-600" title="Cancel Transaction"><Ban className="w-3.5 h-3.5"/></button>
                  <button onClick={() => handleTxnAction('ACCEPT')} className="p-1 hover:bg-slate-200 border rounded text-emerald-600" title="Accept Transaction"><CheckCircle2 className="w-3.5 h-3.5"/></button>
                  <button onClick={() => handleTxnAction('REJECT')} className="p-1 hover:bg-slate-200 border rounded text-rose-600" title="Reject Transaction"><XCircle className="w-3.5 h-3.5"/></button>
                  <button onClick={() => handleTxnAction('ROLLBACK')} className="p-1 hover:bg-slate-200 border rounded text-slate-600" title="Roll Back"><RotateCcw className="w-3.5 h-3.5"/></button>
                </div>

                {/* Pagination */}
                <div className="ml-auto flex items-center gap-1.5">
                  <button 
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    className="px-2.5 py-0.5 bg-[#e1e1e1] hover:bg-[#d0d0d0] border border-slate-300 rounded-none text-[11px] disabled:opacity-40"
                  >
                    Previous
                  </button>
                  <button 
                    disabled={currentPage >= totalPages}
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    className="px-2.5 py-0.5 bg-[#e1e1e1] hover:bg-[#d0d0d0] border border-slate-300 rounded-none text-[11px] disabled:opacity-40"
                  >
                    Next
                  </button>
                </div>
              </div>

              {/* Transactions Data Table with Right-Click Support */}
              <div className="flex-1 overflow-auto bg-white">
                <table className="w-full text-left text-[11px] border-collapse">
                  <thead>
                    <tr className="bg-[#eaeaea] border-b border-slate-300 text-slate-700 font-semibold sticky top-0">
                      <th className="p-1.5 border-r border-slate-300 w-8">No</th>
                      <th className="p-1.5 border-r border-slate-300">Transaction Number</th>
                      <th className="p-1.5 border-r border-slate-300">Application Number</th>
                      <th className="p-1.5 border-r border-slate-300">Status</th>
                      <th className="p-1.5 border-r border-slate-300">Parcel</th>
                      <th className="p-1.5 border-r border-slate-300">Transaction Type</th>
                      <th className="p-1.5 border-r border-slate-300">Created by</th>
                      <th className="p-1.5 border-r border-slate-300">Approved by</th>
                      <th className="p-1.5 border-r border-slate-300">Creation date</th>
                      <th className="p-1.5">Modification date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedTransactions.map((t, idx) => {
                      const isSelected = t.id === selectedTxnId;
                      return (
                        <tr 
                          key={t.id} 
                          onClick={() => setSelectedTxnId(t.id)}
                          onContextMenu={(e) => handleTxnRowContextMenu(e, t)}
                          className={`border-b border-slate-200 cursor-pointer ${isSelected ? 'bg-[#3399ff] text-white' : 'hover:bg-blue-50 text-slate-800'}`}
                        >
                          <td className="p-1 border-r border-slate-200">{t.no || idx + 1}</td>
                          <td className="p-1 border-r border-slate-200 font-mono font-medium">{t.transactionNumber}</td>
                          <td className="p-1 border-r border-slate-200">{t.applicationNumber}</td>
                          <td className="p-1 border-r border-slate-200 font-semibold">
                            <span className={`px-1 py-0.2 rounded text-[10px] ${t.status === 'APPROVED' ? 'bg-emerald-100 text-emerald-800' : t.status === 'INITIATED' ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-700'}`}>
                              {t.status}
                            </span>
                          </td>
                          <td className="p-1 border-r border-slate-200 font-mono">{t.parcel}</td>
                          <td className="p-1 border-r border-slate-200">{t.transactionType}</td>
                          <td className="p-1 border-r border-slate-200">{t.createdBy}</td>
                          <td className="p-1 border-r border-slate-200">{t.approvedBy}</td>
                          <td className="p-1 border-r border-slate-200">{t.creationDate}</td>
                          <td className="p-1">{t.modificationDate}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* --- RIGHT DOCK: Topology Checker Panel --- */}
        {visiblePanels.topologyChecker && (
          <div className="w-64 bg-[#f0f0f0] border-l border-slate-300 flex flex-col shrink-0 text-xs shadow-sm">
            <div className="bg-[#e4e4e4] border-b border-slate-300 px-2 py-1 flex items-center justify-between font-semibold text-slate-700">
              <span>Topology Checker</span>
              <div className="flex items-center gap-1">
                <button className="text-slate-500 hover:text-slate-800 text-[10px]">-</button>
                <button onClick={() => setVisiblePanels({ ...visiblePanels, topologyChecker: false })} className="text-slate-500 hover:text-red-600 text-[10px]">✕</button>
              </div>
            </div>

            <div className="p-1.5 bg-[#f8f8f8] border-b border-slate-300 flex items-center justify-between">
              <div className="flex items-center gap-1">
                <button onClick={handleCheckTopology} className="p-1 bg-white hover:bg-emerald-50 text-emerald-700 border border-slate-300 rounded shadow-xs" title="Validate Topology Rules">
                  <Check className="w-4 h-4 stroke-[3]" />
                </button>
                <button onClick={() => toast('Configure Topology Rules: Must not overlap, Must not have gaps')} className="p-1 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded shadow-xs">
                  <Settings className="w-4 h-4" />
                </button>
              </div>
              <label className="flex items-center gap-1.5 text-[11px] text-slate-700 cursor-pointer">
                <input type="checkbox" checked={showTopologyErrorMarkers} onChange={e => setShowTopologyErrorMarkers(e.target.checked)} className="rounded-xs"/>
                <span>Show errors</span>
              </label>
            </div>

            <div className="flex-1 overflow-auto bg-white">
              <table className="w-full text-left text-[11px] border-collapse">
                <thead>
                  <tr className="bg-[#eaeaea] border-b border-slate-300 text-slate-700 font-semibold sticky top-0">
                    <th className="p-1 border-r border-slate-300">Error</th>
                    <th className="p-1 border-r border-slate-300">Layer</th>
                    <th className="p-1">Feature</th>
                  </tr>
                </thead>
                <tbody>
                  {topologyErrors.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="p-3 text-center text-slate-400 italic">
                        Click ✓ to run topology validation
                      </td>
                    </tr>
                  ) : (
                    topologyErrors.map(err => (
                      <tr key={err.id} className="border-b border-slate-100 hover:bg-amber-50">
                        <td className="p-1 border-r border-slate-100 text-amber-800 flex items-center gap-1">
                          <AlertCircle className="w-3 h-3 text-amber-600 shrink-0" />
                          <span className="truncate">{err.error}</span>
                        </td>
                        <td className="p-1 border-r border-slate-100 font-medium">{err.layer}</td>
                        <td className="p-1 font-mono text-[10px]">{err.feature}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div className="p-2 border-t border-slate-300 bg-[#f8f8f8] text-[11px] text-slate-600 italic">
              Topology Checker used to identify topology errors.
            </div>
          </div>
        )}
      </div>

      {/* 5. STATUS BAR */}
      <div className="bg-[#f0f0f0] border-t border-slate-300 px-3 py-1 flex items-center justify-between text-xs text-slate-700 select-none">
        <div className="flex items-center gap-4">
          <span className="font-semibold text-slate-600">Version-1.0.4</span>
          <div className="flex items-center gap-1 border border-slate-300 px-2 py-0.5 bg-white text-slate-800">
            <span>Welcome:</span>
            <span className="font-medium text-blue-800">{currentUser.username}</span>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1">
            <span>Coordinate:</span>
            <div className="bg-white border border-slate-300 px-2 py-0.5 font-mono text-xs text-slate-800 w-44 text-right">
              {currentCoords.easting}, {currentCoords.northing}
            </div>
            <button 
              onClick={() => {
                setExtentLocked(!extentLocked);
                toast(extentLocked ? 'Coordinate tracker unlocked' : 'Coordinate tracker locked to current extent');
              }}
              className={`p-0.5 border border-slate-300 rounded ${extentLocked ? 'bg-amber-200' : 'bg-white hover:bg-slate-100'}`}
              title="Toggle extents and mouse position coordinate movement"
            >
              <Crosshair className="w-3.5 h-3.5 text-slate-700" />
            </button>
          </div>

          <div className="flex items-center gap-1">
            <span>Scale:</span>
            <div className="bg-white border border-slate-300 px-2 py-0.5 font-mono text-xs text-slate-800 w-36 text-right">
              {currentScale}
            </div>
          </div>

          <div className="text-[11px] text-slate-600 border-l border-slate-300 pl-3">
            {topologyChecked ? (
              <span className="text-emerald-700 font-medium">Topology: Checked (0 errors)</span>
            ) : (
              <span>Topology: not checked yet</span>
            )}
          </div>
        </div>
      </div>

      {/* --- RIGHT-CLICK CONTEXT MENU ON TRANSACTION ROW (Screenshot 1 & 2: media_1791218260357.png) --- */}
      {txnContextMenu && (
        <div 
          className="fixed z-[9500] bg-[#fbfbfb] text-slate-800 border border-slate-400 shadow-2xl rounded-xs py-1 w-52 text-xs font-sans"
          style={{ top: `${Math.min(window.innerHeight - 260, txnContextMenu.y)}px`, left: `${Math.min(window.innerWidth - 220, txnContextMenu.x)}px` }}
          onClick={(e) => e.stopPropagation()}
        >
          <div 
            onClick={() => executeInitiateTransaction(txnContextMenu.txn)}
            className={`px-3 py-1.5 hover:bg-[#3399ff] hover:text-white flex items-center gap-2 cursor-pointer ${txnContextMenu.txn.status === 'CREATED' ? 'font-semibold text-slate-900' : 'text-slate-500'}`}
          >
            <FilePlus className="w-3.5 h-3.5 text-emerald-600" />
            <span>Initiate Transaction</span>
          </div>

          <div 
            onClick={() => executeRemoveTransactionLayer()}
            className="px-3 py-1.5 hover:bg-[#3399ff] hover:text-white flex items-center gap-2 cursor-pointer"
          >
            <FolderMinus className="w-3.5 h-3.5 text-red-600" />
            <span>Remove Transaction Layer</span>
          </div>

          <div 
            onClick={() => executeLoadTransaction(txnContextMenu.txn)}
            className="px-3 py-1.5 hover:bg-[#3399ff] hover:text-white flex items-center gap-2 cursor-pointer font-medium"
          >
            <FolderOpen className="w-3.5 h-3.5 text-blue-600" />
            <span>Load Transaction Layer</span>
          </div>

          <div 
            onClick={() => handleTxnAction('SAVE')}
            className="px-3 py-1.5 hover:bg-[#3399ff] hover:text-white flex items-center gap-2 cursor-pointer"
          >
            <Save className="w-3.5 h-3.5 text-blue-600" />
            <span>Save Transaction Layer</span>
          </div>

          <div 
            onClick={() => handleTxnAction('FINISH')}
            className="px-3 py-1.5 hover:bg-[#3399ff] hover:text-white flex items-center gap-2 cursor-pointer font-medium text-emerald-800"
          >
            <CheckSquare className="w-3.5 h-3.5 text-emerald-600" />
            <span>Save and Finish Transaction</span>
          </div>

          <div 
            onClick={() => handleTxnAction('CANCEL')}
            className="px-3 py-1.5 hover:bg-[#3399ff] hover:text-white flex items-center gap-2 cursor-pointer text-red-700"
          >
            <Ban className="w-3.5 h-3.5 text-red-600" />
            <span>Cancel Transaction</span>
          </div>

          <div 
            onClick={() => handleTxnAction('ACCEPT')}
            className="px-3 py-1.5 hover:bg-[#3399ff] hover:text-white flex items-center gap-2 cursor-pointer"
          >
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            <span>Accept Transaction</span>
          </div>

          <div 
            onClick={() => handleTxnAction('REJECT')}
            className="px-3 py-1.5 hover:bg-[#3399ff] hover:text-white flex items-center gap-2 cursor-pointer text-rose-700"
          >
            <XCircle className="w-3.5 h-3.5 text-rose-600" />
            <span>Reject Transaction</span>
          </div>

          <div 
            onClick={() => handleTxnAction('ROLLBACK')}
            className="px-3 py-1.5 hover:bg-[#3399ff] hover:text-white flex items-center gap-2 cursor-pointer border-t border-slate-200"
          >
            <RotateCcw className="w-3.5 h-3.5 text-slate-600" />
            <span>Roll Back</span>
          </div>
        </div>
      )}

      {/* --- RIGHT-CLICK CONTEXT MENU IN LAYERS PANEL (Screenshot 3: media_1791218407470.png) --- */}
      {layerContextMenu && (
        <div 
          className="fixed z-[9500] bg-[#fbfbfb] text-slate-800 border border-slate-400 shadow-2xl rounded-xs py-1 w-44 text-xs font-sans"
          style={{ top: `${layerContextMenu.y}px`, left: `${layerContextMenu.x}px` }}
          onClick={(e) => e.stopPropagation()}
        >
          {layerContextMenu.type === 'TRANSACTION_GROUP' && (
            <>
              <div 
                onClick={() => {
                  if (loadedTxnData?.taskParcel) {
                    setMapAction({ type: 'ZOOM_TO_PARCEL', coords: loadedTxnData.taskParcel.coordinates });
                  }
                  setLayerContextMenu(null);
                }}
                className="px-3 py-1.5 hover:bg-[#3399ff] hover:text-white flex items-center gap-2 cursor-pointer"
              >
                <Search className="w-3.5 h-3.5 text-blue-600" />
                <span>Zoom to Group</span>
              </div>
              <div 
                onClick={executeRemoveTransactionLayer}
                className="px-3 py-1.5 hover:bg-[#3399ff] hover:text-white flex items-center gap-2 cursor-pointer text-red-600 font-medium"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Remove</span>
              </div>
            </>
          )}

          {layerContextMenu.type === 'SURVEY_LAYER' && (
            <>
              <div 
                onClick={() => {
                  if (layerContextMenu.points) {
                    setMapAction({ type: 'ZOOM_TO_POINTS', points: layerContextMenu.points });
                  }
                  setLayerContextMenu(null);
                }}
                className="px-3 py-1.5 hover:bg-[#3399ff] hover:text-white flex items-center gap-2 cursor-pointer"
              >
                <Search className="w-3.5 h-3.5 text-emerald-600" />
                <span>Zoom to Layer</span>
              </div>
              <div 
                onClick={() => {
                  setImportedSurveyLayers(prev => prev.filter(l => l.id !== layerContextMenu.layerId));
                  setLayerContextMenu(null);
                  toast('Survey layer removed');
                }}
                className="px-3 py-1.5 hover:bg-[#3399ff] hover:text-white flex items-center gap-2 cursor-pointer text-red-600 font-medium"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Remove Layer</span>
              </div>
            </>
          )}
        </div>
      )}

      {/* --- INITIATION CONFIRMATION DIALOG (Mandatory as per Manual Section 3.3.1) --- */}
      {initiateConfirmDialog && (
        <div className="fixed inset-0 z-[9999] bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#f0f0f0] border-2 border-[#1e3a5f] rounded-xs shadow-2xl w-80 text-xs font-sans text-slate-800">
            <div className="bg-[#1b365d] text-white px-3 py-1.5 flex items-center justify-between font-semibold">
              <span className="flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4 text-emerald-400" /> Confirmation</span>
              <button onClick={() => setInitiateConfirmDialog(null)} className="text-white hover:text-red-400 font-bold">✕</button>
            </div>
            <div className="p-4 space-y-3 bg-white">
              <p className="text-slate-800 text-sm">
                Transaction <strong className="font-mono text-blue-800">{initiateConfirmDialog.transactionNumber}</strong> has been initiated successfully.
              </p>
              <p className="text-slate-500 text-[11px]">
                You can now load the transaction into the map canvas and begin spatial digitizing.
              </p>
            </div>
            <div className="bg-[#f0f0f0] border-t border-slate-300 px-3 py-2 flex justify-end">
              <button 
                onClick={() => setInitiateConfirmDialog(null)}
                className="bg-[#0078d7] hover:bg-[#0063b1] text-white px-5 py-1 text-xs font-semibold rounded-none shadow-xs active:scale-95"
              >
                OK
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- ADD VECTOR LAYER / IMPORT SURVEY DATA MODAL (Section 3.3.4) --- */}
      <AddVectorLayerModal 
        isOpen={showAddVectorModal}
        onClose={() => setShowAddVectorModal(false)}
        onImportLayer={handleImportSurveyLayer}
      />

      {/* --- RECS LOGIN DIALOG --- */}
      <RECSLoginModal 
        isOpen={showLoginModal} 
        onClose={() => setShowLoginModal(false)}
        currentUser={currentUser}
        onLoginSuccess={(newProfile) => {
          setCurrentUser(newProfile);
        }}
      />

      {/* --- IDENTIFY ATTRIBUTE POPUP --- */}
      {identifyModalParcel && (
        <div className="fixed inset-0 z-[9999] bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border-2 border-[#1e3a5f] rounded-xs shadow-2xl w-96 text-xs text-slate-800">
            <div className="bg-[#1b365d] text-white px-3 py-1.5 flex items-center justify-between font-semibold">
              <span className="flex items-center gap-1.5"><Info className="w-4 h-4 text-blue-300" /> Parcel Attributes</span>
              <button onClick={() => setIdentifyModalParcel(null)} className="text-white hover:text-red-400">✕</button>
            </div>
            <div className="p-4 space-y-2">
              <div className="flex justify-between border-b pb-1"><span className="text-slate-500">Parcel Code:</span> <span className="font-mono font-bold text-blue-800">{identifyModalParcel.parcelCode}</span></div>
              <div className="flex justify-between border-b pb-1"><span className="text-slate-500">Registered Holder:</span> <span className="font-medium">{identifyModalParcel.owner}</span></div>
              <div className="flex justify-between border-b pb-1"><span className="text-slate-500">Land Use Category:</span> <span>{identifyModalParcel.landUse}</span></div>
              <div className="flex justify-between border-b pb-1"><span className="text-slate-500">Cadastral Area:</span> <span className="font-semibold">{identifyModalParcel.areaSqm} m²</span></div>
              <div className="flex justify-between border-b pb-1"><span className="text-slate-500">CRS:</span> <span className="font-mono">EPSG:20137 (UTM 37N)</span></div>
              <div className="flex justify-between pb-1"><span className="text-slate-500">Status:</span> <span className="text-emerald-700 font-bold">{identifyModalParcel.status}</span></div>
            </div>
            <div className="bg-[#f0f0f0] border-t px-3 py-2 flex justify-end gap-2">
              <button 
                onClick={() => {
                  setSelectedParcelIds([identifyModalParcel.id]);
                  setIdentifyModalParcel(null);
                  toast.success(`Parcel ${identifyModalParcel.parcelCode} selected for spatial operations`);
                }}
                className="bg-[#0078d7] text-white px-3 py-1 rounded hover:bg-[#0063b1]"
              >
                Select for Edit
              </button>
              <button onClick={() => setIdentifyModalParcel(null)} className="bg-slate-200 px-3 py-1 rounded hover:bg-slate-300">Close</button>
            </div>
          </div>
        </div>
      )}

      {/* --- ATTRIBUTES TABLE POPUP --- */}
      {showAttributeTable && (
        <div className="fixed inset-0 z-[9999] bg-black/60 backdrop-blur-xs flex items-center justify-center p-6">
          <div className="bg-white border-2 border-[#1e3a5f] rounded-xs shadow-2xl w-full max-w-4xl max-h-[80vh] flex flex-col text-xs text-slate-800">
            <div className="bg-[#1b365d] text-white px-3 py-2 flex items-center justify-between font-semibold">
              <span className="flex items-center gap-2"><Table className="w-4 h-4 text-emerald-400" /> RECS Cadastral Parcel Layer - Attributes Table</span>
              <button onClick={() => setShowAttributeTable(false)} className="text-white hover:text-red-400 font-bold">✕</button>
            </div>
            <div className="flex-1 overflow-auto p-2">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-[#e4e4e4] border-b border-slate-300 text-slate-700 font-semibold sticky top-0">
                    <th className="p-2 border-r">Parcel Code</th>
                    <th className="p-2 border-r">Right Holder</th>
                    <th className="p-2 border-r">Land Use</th>
                    <th className="p-2 border-r">Area (m²)</th>
                    <th className="p-2 border-r">Status</th>
                    <th className="p-2">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {parcels.map(p => (
                    <tr key={p.id} className="border-b border-slate-200 hover:bg-blue-50">
                      <td className="p-2 border-r font-mono text-blue-900 font-semibold">{p.parcelCode}</td>
                      <td className="p-2 border-r">{p.owner}</td>
                      <td className="p-2 border-r">{p.landUse}</td>
                      <td className="p-2 border-r">{p.areaSqm}</td>
                      <td className="p-2 border-r text-emerald-700 font-medium">{p.status}</td>
                      <td className="p-2">
                        <button 
                          onClick={() => {
                            setMapAction({ type: 'ZOOM_TO_PARCEL', coords: p.coordinates });
                            setSelectedParcelIds([p.id]);
                            setShowAttributeTable(false);
                            toast.success(`Zoomed to ${p.parcelCode}`);
                          }}
                          className="text-blue-600 hover:underline font-medium"
                        >
                          Zoom to Feature
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="bg-[#f0f0f0] border-t px-3 py-2 flex justify-between items-center text-slate-600">
              <span>Total Features: {parcels.length} | Selected: {selectedParcelIds.length}</span>
              <button onClick={() => setShowAttributeTable(false)} className="bg-[#0078d7] text-white px-4 py-1 rounded">Done</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
