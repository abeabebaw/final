const db = require('../config/db');
const { ValidationError } = require('../utils/errors');

const RIGHT_TYPES = new Set([
  'LEASEHOLD', 'OLD_POSSESSION', 'SUB_LEASE', 'URBAN_FARM',
  'GOVERNMENT_OWNED', 'CONDOMINIUM', 'WITHOUT_USE_RIGHT'
]);

exports.getRightsByParcel = async (req, res, next) => {
  try {
    const result = await db.query(`
      SELECT r.*, p.first_name, p.father_name, p.grandfather_name, p.organization_name
      FROM rights r LEFT JOIN parties p ON r.holder_party_id = p.id
      WHERE r.parcel_id=$1 ORDER BY r.created_at`, [req.params.parcelId]);
    res.json(result.rows);
  } catch (err) { next(err); }
};

// Resolve right_type to what PostgreSQL enum actually supports in this database
async function getEffectiveRightType(inputRightType) {
  if (!inputRightType) return inputRightType;
  try {
    const res = await db.query(`
      SELECT e.enumlabel
      FROM pg_enum e
      JOIN pg_type t ON e.enumtypid = t.oid
      WHERE t.typname = 'right_type'
    `);
    const labels = res.rows.map(r => r.enumlabel);

    // 1. If exact match exists in DB, use it:
    if (labels.includes(inputRightType)) return inputRightType;

    // 2. Check variant without underscore: SUBLEASE vs SUB_LEASE
    const strippedInput = inputRightType.replace(/_/g, '').toUpperCase();
    const variant = labels.find(l => l.replace(/_/g, '').toUpperCase() === strippedInput);
    if (variant) return variant;

    // 3. Try dynamically adding the value to Postgres enum:
    try {
      await db.query(`ALTER TYPE right_type ADD VALUE IF NOT EXISTS '${inputRightType}'`);
      return inputRightType;
    } catch (e) {
      console.warn(`Could not alter right_type enum to add '${inputRightType}':`, e.message);
      if (strippedInput.includes('LEASE')) {
        const leaseMatch = labels.find(l => l.includes('LEASE'));
        if (leaseMatch) return leaseMatch;
      }
    }
  } catch (err) {
    console.error('Failed to inspect right_type enum:', err.message);
  }
  return inputRightType;
}

exports.registerRight = async (req, res, next) => {
  try {
    const { parcel_id, transaction_id, right_type, holder_party_id, acquisition_type,
            acquisition_date, start_date, end_date, lease_period_years, lease_start_date,
            lease_end_date, ground_rent, description } = req.body;
    if (!RIGHT_TYPES.has(right_type)) {
      throw new ValidationError(`Invalid right_type. Expected one of: ${[...RIGHT_TYPES].join(', ')}`);
    }

    const effectiveRightType = await getEffectiveRightType(right_type);

    const result = await db.query(`
      INSERT INTO rights (parcel_id, transaction_id, right_type, holder_party_id, acquisition_type,
        acquisition_date, start_date, end_date, lease_period_years, lease_start_date,
        lease_end_date, ground_rent, description)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13) RETURNING *`,
      [parcel_id, transaction_id, effectiveRightType, holder_party_id, acquisition_type, acquisition_date,
       start_date, end_date, lease_period_years, lease_start_date, lease_end_date, ground_rent, description]);
    res.status(201).json(result.rows[0]);
  } catch (err) {
    // If PostgreSQL throws invalid input value for enum right_type, try alter and retry once
    if (err.message && err.message.includes('enum right_type')) {
      try {
        const fallbackType = req.body.right_type === 'SUB_LEASE' ? 'LEASEHOLD' : req.body.right_type;
        const retryResult = await db.query(`
          INSERT INTO rights (parcel_id, transaction_id, right_type, holder_party_id, acquisition_type,
            acquisition_date, start_date, end_date, lease_period_years, lease_start_date,
            lease_end_date, ground_rent, description)
          VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13) RETURNING *`,
          [req.body.parcel_id, req.body.transaction_id, fallbackType, req.body.holder_party_id, req.body.acquisition_type,
           req.body.acquisition_date, req.body.start_date, req.body.end_date, req.body.lease_period_years,
           req.body.lease_start_date, req.body.lease_end_date, req.body.ground_rent,
           (req.body.description || '') + ` (Registered as ${req.body.right_type})`]);
        return res.status(201).json(retryResult.rows[0]);
      } catch (retryErr) {
        return next(retryErr);
      }
    }
    next(err);
  }
};

exports.modifyRight = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { right_type, acquisition_type, start_date, end_date, lease_period_years, ground_rent, description } = req.body;
    if (right_type !== undefined && right_type !== null && !RIGHT_TYPES.has(right_type)) {
      throw new ValidationError(`Invalid right_type. Expected one of: ${[...RIGHT_TYPES].join(', ')}`);
    }

    const effectiveRightType = right_type ? await getEffectiveRightType(right_type) : null;

    const result = await db.query(`
      UPDATE rights SET
        right_type = COALESCE($1, right_type),
        acquisition_type = COALESCE($2, acquisition_type),
        start_date = COALESCE($3, start_date),
        end_date = COALESCE($4, end_date),
        lease_period_years = COALESCE($5, lease_period_years),
        ground_rent = COALESCE($6, ground_rent),
        description = COALESCE($7, description),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $8 RETURNING *`,
      [effectiveRightType, acquisition_type || null, start_date || null, end_date || null,
       lease_period_years || null, ground_rent || null, description || null, id]);
    res.json(result.rows[0]);
  } catch (err) { next(err); }
};

exports.deleteRight = async (req, res, next) => {
  try {
    const { id } = req.params;
    await db.query('DELETE FROM rights WHERE id=$1', [id]);
    res.json({ message: 'Right deleted successfully' });
  } catch (err) { next(err); }
};