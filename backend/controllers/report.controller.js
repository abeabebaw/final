const db = require('../config/db');

const CITY_SCOPE = "p.city ILIKE '%Kombolcha%'";

exports.dashboard = async (req, res, next) => {
  try {
    const totalApps = await db.query('SELECT COUNT(*) FROM applications');
    const totalParcels = await db.query('SELECT COUNT(*) FROM parcels WHERE is_registered=TRUE');
    const pendingTxns = await db.query("SELECT COUNT(*) FROM transactions WHERE status IN ('CREATED','INITIATED','IN_PROCESS','READY_FOR_APPROVAL')");
    const completedApps = await db.query("SELECT COUNT(*) FROM applications WHERE status='COMPLETED'");
    const appsByStatus = await db.query('SELECT status, COUNT(*) FROM applications GROUP BY status');
    const txnsByType = await db.query('SELECT transaction_type, COUNT(*) FROM transactions GROUP BY transaction_type ORDER BY count DESC');
    res.json({
      totalApplications: parseInt(totalApps.rows[0].count),
      registeredParcels: parseInt(totalParcels.rows[0].count),
      pendingTransactions: parseInt(pendingTxns.rows[0].count),
      completedApplications: parseInt(completedApps.rows[0].count),
      applicationsByStatus: appsByStatus.rows,
      transactionsByType: txnsByType.rows
    });
  } catch (err) { next(err); }
};

exports.leadTime = async (req, res, next) => {
  try {
    const { year, month } = req.query;
    let query = `
      SELECT a.application_type,
             AVG(EXTRACT(EPOCH FROM (COALESCE(a.delivered_at, CURRENT_TIMESTAMP) - a.submitted_at))/3600)::numeric(10,2) as avg_lead_time_hours,
             COUNT(*) as total
      FROM applications a
      JOIN parcels p ON p.id=a.parcel_id
      WHERE ${CITY_SCOPE} AND a.status IN ('COMPLETED','FINISHED')`;
    const params = []; let idx = 1;
    if (year) { query += ` AND EXTRACT(YEAR FROM a.submitted_at)=$${idx++}`; params.push(year); }
    if (month) { query += ` AND EXTRACT(MONTH FROM a.submitted_at)=$${idx++}`; params.push(month); }
    query += ' GROUP BY a.application_type ORDER BY avg_lead_time_hours DESC';
    const result = await db.query(query, params);
    res.json(result.rows);
  } catch (err) { next(err); }
};

exports.waitingTime = async (req, res, next) => {
  try {
    const result = await db.query(`
      WITH wait_times AS (
        SELECT ah.to_status,
               EXTRACT(EPOCH FROM (LEAD(ah.created_at) OVER (PARTITION BY ah.application_id ORDER BY ah.created_at) - ah.created_at))/3600 AS wait_hours
        FROM application_history ah
        JOIN applications a ON a.id=ah.application_id
        JOIN parcels p ON p.id=a.parcel_id
        WHERE ${CITY_SCOPE}
      )
      SELECT to_status,
             AVG(wait_hours)::numeric(10,2) AS avg_wait_hours,
             COUNT(*) AS count
      FROM wait_times
      WHERE wait_hours IS NOT NULL
      GROUP BY to_status
      ORDER BY avg_wait_hours DESC`);
    res.json(result.rows);
  } catch (err) { next(err); }
};

exports.employeePerformance = async (req, res, next) => {
  try {
    const result = await db.query(`
      SELECT u.full_name, u.role, COUNT(t.id) as transactions_processed
      FROM users u
      JOIN transactions t ON t.assigned_to = u.id
      JOIN applications a ON a.id=t.application_id
      JOIN parcels p ON p.id=COALESCE(t.parcel_id,a.parcel_id)
      WHERE ${CITY_SCOPE} AND t.status IN ('APPROVED','DELIVERED')
      GROUP BY u.id, u.full_name, u.role ORDER BY transactions_processed DESC`);
    res.json(result.rows);
  } catch (err) { next(err); }
};

exports.propertyRightReport = async (req, res, next) => {
  try {
    const result = await db.query(`
      SELECT r.right_type, COUNT(*) as count
      FROM rights r JOIN parcels p ON p.id=r.parcel_id
      WHERE ${CITY_SCOPE} AND r.status='ACTIVE'
      GROUP BY r.right_type ORDER BY count DESC`);
    res.json(result.rows);
  } catch (err) { next(err); }
};

exports.propertyOwnerReport = async (req, res, next) => {
  try {
    const byAge = await db.query(`
      SELECT CASE
        WHEN EXTRACT(YEAR FROM AGE(date_of_birth)) < 25 THEN '18-25'
        WHEN EXTRACT(YEAR FROM AGE(date_of_birth)) < 35 THEN '26-35'
        WHEN EXTRACT(YEAR FROM AGE(date_of_birth)) < 50 THEN '36-50'
        ELSE '50+' END as age_group,
        r.right_type, COUNT(*) as count
      FROM parties p JOIN rights r ON r.holder_party_id = p.id
      JOIN parcels parcel ON parcel.id=r.parcel_id
      WHERE parcel.city ILIKE '%Kombolcha%' AND p.party_type='NATURAL' AND p.date_of_birth IS NOT NULL
      GROUP BY age_group, r.right_type ORDER BY age_group`);
    
    const byGender = await db.query(`
      SELECT p.sex, r.right_type, COUNT(*) as count
      FROM parties p JOIN rights r ON r.holder_party_id = p.id
      JOIN parcels parcel ON parcel.id=r.parcel_id
      WHERE parcel.city ILIKE '%Kombolcha%' AND p.party_type='NATURAL'
      GROUP BY p.sex, r.right_type ORDER BY p.sex`);
    
    res.json({ byAge: byAge.rows, byGender: byGender.rows });
  } catch (err) { next(err); }
};