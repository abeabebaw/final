const prisma = require('../config/prisma');
const db = require('../config/db');
const { NotFoundError, ValidationError, handlePrismaError, validateRequiredFields } = require('../utils/errors');
const { serialize } = require('../utils/serializer');
const { createAuditLog } = require('../utils/audit');

/**
 * Cadastral Spatial Controller (RECS)
 * Handles PostGIS topological operations, parcel split/merge,
 * boundary validation, and GeoJSON cadastral services.
 */

// Border Points
exports.createBorderPoint = async (req, res, next) => {
  try {
    const { parcel_id, point_number, geometry_wkt } = req.body;

    validateRequiredFields(req.body, ['parcel_id', 'point_number']);

    if (typeof point_number !== 'string' || point_number.trim().length === 0) {
      throw new ValidationError('Point number must be a non-empty string');
    }

    const parcel = await prisma.parcel.findUnique({
      where: { id: parcel_id }
    });

    if (!parcel) {
      throw new NotFoundError('Parcel not found');
    }

    const existingPoint = await prisma.borderPoint.findFirst({
      where: {
        parcelId: parcel_id,
        pointNumber: point_number
      }
    });

    if (existingPoint) {
      throw new ValidationError(`Point ${point_number} already exists for this parcel`);
    }

    const borderPoint = await prisma.borderPoint.create({
      data: {
        parcelId: parcel_id,
        pointNumber: point_number,
        geometryWkt: geometry_wkt || null
      }
    });

    await createAuditLog({
      userId: req.user?.id,
      action: 'BORDER_POINT_CREATED',
      entityType: 'BORDER_POINT',
      entityId: borderPoint.id,
      newValue: { parcelId: parcel_id, pointNumber: point_number },
      req
    });

    res.status(201).json(serialize(borderPoint));
  } catch (err) {
    console.error('Create border point error:', err);
    next(err);
  }
};

exports.deleteBorderPoint = async (req, res, next) => {
  try {
    const { id } = req.params;
    const borderPoint = await prisma.borderPoint.findUnique({ where: { id } });

    if (!borderPoint) {
      throw new NotFoundError('Border point not found');
    }

    await prisma.borderPoint.delete({ where: { id } });

    await createAuditLog({
      userId: req.user?.id,
      action: 'BORDER_POINT_DELETED',
      entityType: 'BORDER_POINT',
      entityId: id,
      previousValue: { parcelId: borderPoint.parcelId, pointNumber: borderPoint.pointNumber },
      req
    });

    res.json({ message: 'Border point deleted successfully' });
  } catch (err) {
    console.error('Delete border point error:', err);
    next(err);
  }
};

// Boundary Lines
exports.createBoundaryLine = async (req, res, next) => {
  try {
    const { parcel_id, line_number, length_m, geometry_wkt } = req.body;

    validateRequiredFields(req.body, ['parcel_id', 'line_number']);

    if (typeof line_number !== 'string' || line_number.trim().length === 0) {
      throw new ValidationError('Line number must be a non-empty string');
    }

    const parcel = await prisma.parcel.findUnique({ where: { id: parcel_id } });
    if (!parcel) {
      throw new NotFoundError('Parcel not found');
    }

    const boundaryLine = await prisma.boundaryLine.create({
      data: {
        parcelId: parcel_id,
        lineNumber: line_number,
        lengthM: length_m ? parseFloat(length_m) : null,
        geometryWkt: geometry_wkt || null
      }
    });

    await createAuditLog({
      userId: req.user?.id,
      action: 'BOUNDARY_LINE_CREATED',
      entityType: 'BOUNDARY_LINE',
      entityId: boundaryLine.id,
      newValue: { parcelId: parcel_id, lineNumber: line_number, lengthM: length_m },
      req
    });

    res.status(201).json(serialize(boundaryLine));
  } catch (err) {
    console.error('Create boundary line error:', err);
    next(err);
  }
};

exports.deleteBoundaryLine = async (req, res, next) => {
  try {
    const { id } = req.params;
    const boundaryLine = await prisma.boundaryLine.findUnique({ where: { id } });

    if (!boundaryLine) {
      throw new NotFoundError('Boundary line not found');
    }

    await prisma.boundaryLine.delete({ where: { id } });

    await createAuditLog({
      userId: req.user?.id,
      action: 'BOUNDARY_LINE_DELETED',
      entityType: 'BOUNDARY_LINE',
      entityId: id,
      previousValue: { parcelId: boundaryLine.parcelId, lineNumber: boundaryLine.lineNumber },
      req
    });

    res.json({ message: 'Boundary line deleted successfully' });
  } catch (err) {
    console.error('Delete boundary line error:', err);
    next(err);
  }
};

// GeoJSON FeatureCollection for Cadastral Maps
exports.getParcelsGeoJson = async (req, res, next) => {
  try {
    // Try PostGIS query first
    try {
      const result = await db.query(`
        SELECT json_build_object(
          'type', 'FeatureCollection',
          'features', COALESCE(json_agg(
            json_build_object(
              'type', 'Feature',
              'id', p.id,
              'geometry', CASE 
                WHEN p.geometry IS NOT NULL THEN ST_AsGeoJSON(p.geometry)::json
                WHEN p.geometry_wkt IS NOT NULL AND p.geometry_wkt != '' THEN ST_AsGeoJSON(ST_GeomFromText(p.geometry_wkt, 4326))::json
                ELSE NULL
              END,
              'properties', json_build_object(
                'id', p.id,
                'parcelCode', p.parcel_code,
                'areaSqm', p.area_sqm,
                'landUse', p.land_use,
                'city', p.city,
                'region', p.region,
                'subCity', p.sub_city,
                'woreda', p.woreda,
                'isRegistered', p.is_registered
              )
            )
          ), '[]'::json)
        ) AS geojson
        FROM parcels p
        WHERE p.city ILIKE '%Kombolcha%'
          AND p.merged_into_parcel_id IS NULL
          AND NOT EXISTS (
            SELECT 1 FROM parcels child WHERE child.parent_parcel_id=p.id
          )
      `);

      if (result.rows[0]?.geojson) {
        return res.json(result.rows[0].geojson);
      }
    } catch (spatialErr) {
      console.warn('PostGIS ST_AsGeoJSON query fallback to Prisma:', spatialErr.message);
    }

    // Fallback: build standard FeatureCollection from Prisma records
    const parcels = await prisma.parcel.findMany({
      where: {
        city: { contains: 'Kombolcha', mode: 'insensitive' },
        splitChildren: { none: {} },
        mergedIntoParcelId: null
      },
      orderBy: { createdAt: 'desc' },
      take: 200
    });

    const features = parcels.map((p, idx) => {
      let geometry = null;
      if (p.geometryWkt) {
        try {
          // Parse basic POLYGON ((lon lat, ...))
          const match = p.geometryWkt.match(/\(\((.*?)\)\)/);
          if (match) {
            const rings = match[1].split(',').map(coord => {
              const [lon, lat] = coord.trim().split(/\s+/).map(Number);
              return [lon, lat];
            });
            geometry = { type: 'Polygon', coordinates: [rings] };
          }
        } catch (e) {
          geometry = null;
        }
      }

      return {
        type: 'Feature',
        id: p.id,
        geometry,
        properties: {
          id: p.id,
          parcelCode: p.parcelCode,
          areaSqm: p.areaSqm ? Number(p.areaSqm) : null,
          landUse: p.landUse || 'Residential',
          city: p.city || 'Kombolcha',
          region: p.region || 'Amhara',
          subCity: p.subCity || '',
          woreda: p.woreda || '',
          isRegistered: p.isRegistered
        }
      };
    });

    res.json({
      type: 'FeatureCollection',
      features
    });

  } catch (err) {
    console.error('Get parcels GeoJSON error:', err);
    next(err);
  }
};

// Parcel Split
exports.splitParcel = async (req, res, next) => {
  try {
    const { parcel_id, transaction_id, sub_parcels, remarks } = req.body;

    if (!parcel_id) {
      throw new ValidationError('Parcel ID is required for parcel split');
    }
    if (!transaction_id) {
      throw new ValidationError('Transaction ID is required for parcel split');
    }
    if (!Array.isArray(sub_parcels) || sub_parcels.length !== 2) {
      throw new ValidationError('A parcel split must provide exactly two sub-parcels');
    }
    if (sub_parcels.some(parcel => !parcel || typeof parcel !== 'object')) {
      throw new ValidationError('Each sub-parcel must be an object');
    }
    if (new Set(sub_parcels.map(parcel => parcel.parcel_code)).size !== 2) {
      throw new ValidationError('Split parcel codes must be unique');
    }
    for (const parcel of sub_parcels) {
      if (
        typeof parcel.parcel_code !== 'string'
        || !parcel.parcel_code.trim()
        || parcel.parcel_code.length > 50
        || !Number.isFinite(Number(parcel.area_sqm))
        || Number(parcel.area_sqm) <= 0
      ) {
        throw new ValidationError('Each sub-parcel requires a parcel code and a positive area');
      }
      if (typeof parcel.geometry_wkt !== 'string' || !/^POLYGON\s*\(\(/i.test(parcel.geometry_wkt.trim())) {
        throw new ValidationError('Each sub-parcel requires polygon geometry');
      }
    }

    const transaction = await prisma.transaction.findUnique({
      where: { id: transaction_id },
      select: { parcelId: true, status: true }
    });
    if (!transaction) {
      throw new NotFoundError('Transaction not found');
    }
    if (transaction.parcelId !== parcel_id) {
      throw new ValidationError('The selected parcel does not belong to this transaction');
    }
    if (transaction.status !== 'IN_PROCESS') {
      throw new ValidationError('The transaction must be in process before its parcel can be split');
    }

    const parentParcel = await prisma.parcel.findUnique({
      where: { id: parcel_id }
    });

    if (!parentParcel) {
      throw new NotFoundError('Parent parcel not found');
    }
    if (await prisma.parcel.findFirst({ where: { splitTransactionId: transaction_id } })) {
      throw new ValidationError('This transaction already has split parcels');
    }
    const existingCodes = await prisma.parcel.findMany({
      where: { parcelCode: { in: sub_parcels.map(parcel => parcel.parcel_code) } },
      select: { parcelCode: true }
    });
    if (existingCodes.length) {
      throw new ValidationError(`Parcel code already exists: ${existingCodes.map(parcel => parcel.parcelCode).join(', ')}`);
    }

    const result = await prisma.$transaction(async (tx) => {
      const subParcels = [];
      for (const parcel of sub_parcels) {
        subParcels.push(await tx.parcel.create({
          data: {
            parcelCode: parcel.parcel_code,
            areaSqm: Number(parcel.area_sqm),
            geometryWkt: parcel.geometry_wkt,
            landUse: parentParcel.landUse,
            region: parentParcel.region,
            city: parentParcel.city,
            subCity: parentParcel.subCity,
            woreda: parentParcel.woreda,
            parentParcelId: parcel_id,
            splitTransactionId: transaction_id,
            isRegistered: false
          }
        }));
      }

      // Mark parent parcel as superseded / inactive
      await tx.parcel.update({
        where: { id: parcel_id },
        data: { isRegistered: false }
      });

      return { parent: parentParcel, subParcels };
    });

    await createAuditLog({
      userId: req.user?.id,
      action: 'PARCEL_SPLIT',
      entityType: 'PARCEL',
      entityId: parcel_id,
      previousValue: { parcelCode: parentParcel.parcelCode, areaSqm: parentParcel.areaSqm },
      newValue: {
        splitInto: result.subParcels.map(parcel => parcel.parcelCode),
        areas: result.subParcels.map(parcel => parcel.areaSqm),
        transactionId: transaction_id,
        remarks: remarks || 'Cadastral parcel split'
      },
      req
    });

    res.status(201).json(serialize(result));

  } catch (err) {
    console.error('Parcel split error:', err);
    next(err);
  }
};

// Parcel Merge
exports.mergeParcels = async (req, res, next) => {
  try {
    const {
      parcel_ids,
      parcel_codes,
      merged_parcel_code,
      land_use,
      geometry_wkt,
      transaction_id
    } = req.body;

    if (!parcel_ids || !Array.isArray(parcel_ids) || parcel_ids.length < 2) {
      throw new ValidationError('At least 2 parcel IDs are required for a parcel merge');
    }
    if (new Set(parcel_ids).size !== parcel_ids.length) {
      throw new ValidationError('Parcel IDs must be unique');
    }
    if (parcel_codes !== undefined && (
      !Array.isArray(parcel_codes)
      || parcel_codes.length !== parcel_ids.length
      || parcel_codes.some(code => typeof code !== 'string' || !code.trim())
      || new Set(parcel_codes).size !== parcel_codes.length
    )) {
      throw new ValidationError('Parcel codes must be unique and match the selected parcel IDs');
    }
    if (geometry_wkt !== undefined && (
      typeof geometry_wkt !== 'string' || !/^POLYGON\s*\(\(/i.test(geometry_wkt.trim())
    )) {
      throw new ValidationError('Merged parcel geometry must be a WKT polygon');
    }
    if (transaction_id && !geometry_wkt) {
      throw new ValidationError('Merged parcel geometry is required for a transaction merge');
    }

    const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    const validParcelIds = parcel_ids.filter(id => typeof id === 'string' && uuidPattern.test(id));
    const parcelCodes = parcel_codes || parcel_ids.map(id => (
      typeof id === 'string' && !uuidPattern.test(id) ? id : null
    ));
    const foundParcels = await prisma.parcel.findMany({
      where: {
        OR: [
          ...(validParcelIds.length ? [{ id: { in: validParcelIds } }] : []),
          ...(parcelCodes.some(Boolean) ? [{ parcelCode: { in: parcelCodes.filter(Boolean) } }] : [])
        ]
      }
    });
    const parcelsToMerge = parcel_ids.map((id, index) => (
      foundParcels.find(parcel => parcel.id === id)
      || (parcelCodes[index]
        ? foundParcels.find(parcel => parcel.parcelCode === parcelCodes[index])
        : null)
    ));
    const missingParcels = parcelsToMerge
      .map((parcel, index) => parcel ? null : parcelCodes[index] || parcel_ids[index])
      .filter(Boolean);
    if (missingParcels.length || new Set(parcelsToMerge.filter(Boolean).map(parcel => parcel.id)).size !== parcel_ids.length) {
      throw new NotFoundError(`Selected parcel records were not found: ${missingParcels.join(', ') || 'duplicate parcel selection'}`);
    }
    if (parcelsToMerge.some(parcel => parcel.mergedIntoParcelId)) {
      throw new ValidationError('One or more selected parcels have already been merged');
    }

    let transaction = null;
    if (transaction_id) {
      transaction = await prisma.transaction.findUnique({
        where: { id: transaction_id },
        select: { id: true, parcelId: true, status: true }
      });
      if (!transaction) {
        throw new NotFoundError('Transaction not found');
      }
      if (transaction.status !== 'IN_PROCESS') {
        throw new ValidationError('The transaction must be in process before its parcels can be merged');
      }
    }

    const totalArea = parcelsToMerge.reduce((acc, p) => acc + (p.areaSqm ? Number(p.areaSqm) : 0), 0);
    const primary = parcelsToMerge[0];
    const newCode = merged_parcel_code || `PRC-MERGE-${Date.now().toString().slice(-6)}`;

    const result = await prisma.$transaction(async (tx) => {
      const merged = await tx.parcel.create({
        data: {
          parcelCode: newCode,
          areaSqm: parseFloat(totalArea.toFixed(2)),
          geometryWkt: geometry_wkt || null,
          landUse: land_use || primary.landUse || 'Residential',
          region: primary.region,
          city: primary.city,
          subCity: primary.subCity,
          woreda: primary.woreda,
          isRegistered: false,
          mergeTransactionId: transaction_id || null
        }
      });

      await tx.parcel.updateMany({
        where: { id: { in: parcelsToMerge.map(parcel => parcel.id) } },
        data: {
          isRegistered: false,
          mergedIntoParcelId: merged.id
        }
      });

      if (transaction) {
        await tx.transaction.update({
          where: { id: transaction.id },
          data: { parcelId: merged.id }
        });
      }

      return merged;
    });

    await createAuditLog({
      userId: req.user?.id,
      action: 'PARCEL_MERGED',
      entityType: 'PARCEL',
      entityId: result.id,
      newValue: {
        mergedFrom: parcelsToMerge.map(p => p.parcelCode),
        mergedParcelCode: result.parcelCode,
        totalAreaSqm: result.areaSqm,
        transactionId: transaction_id || null
      },
      req
    });

    res.status(201).json(serialize({
      mergedParcel: result,
      sourceParcelCodes: parcelsToMerge.map(p => p.parcelCode),
      transactionId: transaction_id || null
    }));

  } catch (err) {
    console.error('Parcel merge error:', err);
    next(err);
  }
};

// Validate Cadastral Topology
exports.validateTopology = async (req, res, next) => {
  try {
    const { geometry_wkt, parcel_id } = req.body;

    if (!geometry_wkt) {
      throw new ValidationError('geometry_wkt is required for topology validation');
    }

    // Attempt PostGIS validation
    try {
      const validQuery = await db.query(
        `SELECT ST_IsValid(ST_GeomFromText($1, 4326)) AS is_valid,
                ST_IsValidReason(ST_GeomFromText($1, 4326)) AS reason,
                ST_Area(ST_GeomFromText($1, 4326)::geography) AS area_sqm`,
        [geometry_wkt]
      );

      const { is_valid, reason, area_sqm } = validQuery.rows[0];

      // Check overlaps
      let overlaps = [];
      if (is_valid) {
        const overlapQuery = await db.query(
          `SELECT id, parcel_code FROM parcels 
           WHERE ($1::uuid IS NULL OR id != $1::uuid)
             AND geometry IS NOT NULL
             AND ST_Overlaps(geometry, ST_GeomFromText($2, 4326))
           LIMIT 5`,
          [parcel_id || null, geometry_wkt]
        );
        overlaps = overlapQuery.rows;
      }

      return res.json({
        isValid: is_valid && overlaps.length === 0,
        postgisReason: reason,
        areaSqm: area_sqm ? Number(area_sqm).toFixed(2) : null,
        hasOverlap: overlaps.length > 0,
        overlappingParcels: overlaps
      });

    } catch (pgErr) {
      // Basic fallback validation if PostGIS function call fails
      const hasPolygon = geometry_wkt.toUpperCase().startsWith('POLYGON');
      return res.json({
        isValid: hasPolygon,
        reason: hasPolygon ? 'Geometry syntax valid' : 'Geometry must be a valid WKT POLYGON',
        overlappingParcels: []
      });
    }

  } catch (err) {
    console.error('Validate topology error:', err);
    next(err);
  }
};
