const db = require('../config/db');

exports.getAnnouncements = async (req, res, next) => {
  try {
    const result = await db.query("SELECT * FROM announcements WHERE is_published=TRUE ORDER BY published_at DESC");
    if (result.rows.length === 0) {
      // Default public announcements matching CRPRS Manual
      return res.json([
        {
          id: 'anc-1',
          title: 'Public Notice: Cadastral Boundary Survey in Kombolcha City',
          title_am: 'የሕዝብ ማስታወቂያ፡ በኮምቦልቻ ከተማ የካዳስተር ድንበር ቅየሳ',
          content: 'Cadastral surveying teams from the Real Property Registration Agency will conduct field verifications beginning next Monday.',
          category: 'SURVEY',
          is_published: true,
          published_at: new Date('2026-08-01')
        },
        {
          id: 'anc-2',
          title: 'Notice on Verification of Leasehold Titles and Conversions',
          title_am: 'የሊዝ ይዞታ ማረጋገጫ እና ምዝገባ ማስታወቂያ',
          content: 'Holders of provisional certificates are advised to present their documentation for formal title deed issuance.',
          category: 'REGISTRATION',
          is_published: true,
          published_at: new Date('2026-08-15')
        }
      ]);
    }
    res.json(result.rows);
  } catch (err) { next(err); }
};

exports.getServices = async (req, res, next) => {
  try {
    const result = await db.query('SELECT * FROM services ORDER BY service_name');
    if (result.rows.length === 0) {
      return res.json([
        { id: 'srv-1', service_name: 'First Registration of Real Property', fee_amount: 500, processing_days: 5, category: 'REGISTRATION' },
        { id: 'srv-2', service_name: 'Title Deed Extract / Duplicate Issuance', fee_amount: 250, processing_days: 2, category: 'TITLE' },
        { id: 'srv-3', service_name: 'Mortgage / Encumbrance Registration', fee_amount: 300, processing_days: 3, category: 'ENCUMBRANCE' },
        { id: 'srv-4', service_name: 'Cadastral Parcel Split & Merge Survey', fee_amount: 800, processing_days: 10, category: 'CADASTRE' }
      ]);
    }
    res.json(result.rows);
  } catch (err) { next(err); }
};

exports.getPublicDocuments = async (req, res, next) => {
  try {
    const result = await db.query('SELECT * FROM public_documents ORDER BY created_at DESC');
    if (result.rows.length === 0) {
      return res.json([
        {
          id: 'doc-1',
          title: 'Land Registration Regulation 324/2014',
          description: 'Official regulation governing land registration and title issuance.',
          document_category: 'LEGAL',
          file_path: '/uploads/land-registration-regulation.pdf',
          file_name: 'Land Registration Regulation 324_2014.pdf',
          mime_type: 'application/pdf',
          file_size: 450000,
          created_at: new Date('2026-08-01')
        },
        {
          id: 'doc-2',
          title: 'Registration Service Application Form 19',
          description: 'Application form for first-time title registration.',
          document_category: 'FORM',
          file_path: '/uploads/form-19.pdf',
          file_name: 'Form_19.pdf',
          mime_type: 'application/pdf',
          file_size: 280000,
          created_at: new Date('2026-08-10')
        }
      ]);
    }
    res.json(result.rows);
  } catch (err) { next(err); }
};

exports.getAnnouncementsAdmin = async (req, res, next) => {
  try {
    const result = await db.query('SELECT * FROM announcements ORDER BY published_at DESC, created_at DESC');
    res.json(result.rows);
  } catch (err) { next(err); }
};

exports.getServicesAdmin = async (req, res, next) => {
  try {
    const result = await db.query('SELECT * FROM services ORDER BY service_name ASC');
    res.json(result.rows);
  } catch (err) { next(err); }
};

exports.getPublicDocumentsAdmin = async (req, res, next) => {
  try {
    const result = await db.query('SELECT * FROM public_documents ORDER BY created_at DESC');
    res.json(result.rows);
  } catch (err) { next(err); }
};

exports.createAnnouncement = async (req, res, next) => {
  try {
    const { title, content, category, is_published, published_at } = req.body;
    if (!title || !title.trim() || !content || !content.trim()) {
      return res.status(400).json({ message: 'Announcement title and content are required' });
    }

    const result = await db.query(
      `INSERT INTO announcements (title, content, category, is_published, published_at, created_by)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [title.trim(), content.trim(), category || 'NEWS', is_published !== undefined ? Boolean(is_published) : true, published_at || new Date(), req.user?.id || null]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) { next(err); }
};

exports.createService = async (req, res, next) => {
  try {
    const { service_name, description, required_documents, fee_amount, processing_time_hours } = req.body;
    if (!service_name || !service_name.trim()) {
      return res.status(400).json({ message: 'Service name is required' });
    }

    const result = await db.query(
      `INSERT INTO services (service_name, description, required_documents, fee_amount, processing_time_hours)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [service_name.trim(), description || '', required_documents || '', fee_amount || 0, processing_time_hours || 0]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) { next(err); }
};

exports.createPublicDocument = async (req, res, next) => {
  try {
    const { title, description, document_category, file_path, file_name, file_size, mime_type } = req.body;
    if (!title || !title.trim() || !file_path || !file_path.trim()) {
      return res.status(400).json({ message: 'Document title and file path are required' });
    }

    const result = await db.query(
      `INSERT INTO public_documents (title, description, document_category, file_path, file_name, file_size, mime_type, uploaded_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [title.trim(), description || '', document_category || 'GENERAL', file_path.trim(), file_name || title.trim(), file_size || 0, mime_type || 'application/pdf', req.user?.id || null]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) { next(err); }
};

exports.checkApplicationStatus = async (req, res, next) => {
  try {
    const { applicationId } = req.query;
    if (!applicationId || !applicationId.trim()) {
      return res.status(400).json({ message: 'Application number is required' });
    }

    const cleanAppId = applicationId.trim();
    const result = await db.query(`
      SELECT 
        a.id,
        a.application_number,
        a.application_type,
        a.applicant_name,
        a.status,
        a.submitted_at,
        a.delivered_at,
        p.parcel_code,
        p.city,
        p.sub_city,
        p.woreda,
        p.area_sqm,
        p.land_use
      FROM applications a 
      LEFT JOIN parcels p ON a.parcel_id = p.id
      WHERE UPPER(a.application_number) = UPPER($1)
      LIMIT 1`,
      [cleanAppId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ message: `No application found with number "${cleanAppId}"` });
    }

    res.json(result.rows[0]);
  } catch (err) { next(err); }
};

exports.getLayers = async (req, res, next) => {
  try {
    const result = await db.query('SELECT * FROM map_layers WHERE is_published=TRUE ORDER BY layer_name');
    if (result.rows.length === 0) {
      return res.json([
        { id: 'lyr-1', layer_name: 'Cadastral Parcels', layer_type: 'WMS', is_published: true },
        { id: 'lyr-2', layer_name: 'Administrative Wereda Boundaries', layer_type: 'WFS', is_published: true },
        { id: 'lyr-3', layer_name: 'Block & Neighborhood Grid', layer_type: 'WMS', is_published: true },
        { id: 'lyr-4', layer_name: 'Buildings & Footprints', layer_type: 'WFS', is_published: true }
      ]);
    }
    res.json(result.rows);
  } catch (err) { next(err); }
};

exports.getPredefinedMaps = async (req, res, next) => {
  try {
    const result = await db.query('SELECT * FROM predefined_maps ORDER BY created_at DESC');
    res.json(result.rows);
  } catch (err) { next(err); }
};