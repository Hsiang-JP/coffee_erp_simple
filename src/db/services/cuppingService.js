import { execute } from '../dbSetup';

/**
 * Fetches distinct filter options for cupping reports.
 */
export async function getCuppingFilterOptions() {
  const farms = await execute("SELECT DISTINCT name FROM farms ORDER BY name ASC");
  const cuppers = await execute("SELECT DISTINCT cupper_name FROM cupping_sessions ORDER BY cupper_name ASC");
  const lots = await execute("SELECT DISTINCT public_id FROM lots ORDER BY public_id ASC");
  
  return {
    farms: farms.map(f => f.name),
    cuppers: cuppers.map(c => c.cupper_name),
    lots: lots.map(l => l.public_id)
  };
}

/**
 * Fetches cupping reports based on provided filters.
 * @param {Object} filters - Filter criteria (farmName, cupperName, lotPublicId).
 */
export async function getFilteredCuppingReports(filters = {}) {
  let query = `
    SELECT 
      cs.*, 
      l.public_id as lot_code, 
      f.name as farm_name,
      l.variety,
      l.process_method
    FROM cupping_sessions cs
    JOIN lots l ON cs.lot_id = l.id
    JOIN farms f ON l.farm_id = f.id
    WHERE 1=1
  `;
  const params = [];

  if (filters.farmName) {
    query += ` AND f.name = ?`;
    params.push(filters.farmName);
  }
  if (filters.cupperName) {
    query += ` AND cs.cupper_name = ?`;
    params.push(filters.cupperName);
  }
  if (filters.lotPublicId) {
    query += ` AND l.public_id = ?`;
    params.push(filters.lotPublicId);
  }

  query += ` ORDER BY cs.cupping_date DESC`;

  return await execute(query, params);
}

/**
 * Creates a new cupping session record.
 * @param {Object} sessionData - The cupping session data.
 */
export async function createCuppingSession(sessionData) {
  const {
    id, public_id, lot_id, cupper_name, cupping_date,
    score_fragrance, score_flavor, score_aftertaste, score_acidity,
    score_body, score_balance, score_overall, 
    uniformity_cups, score_uniformity, 
    clean_cup_cups, score_clean_cup, 
    sweetness_cups, score_sweetness,
    defect_type, defect_cups, defect_score_subtract,
    total_score, final_score, notes, primary_flavor_note
  } = sessionData;

  return await execute(`
    INSERT INTO cupping_sessions (
      id, public_id, lot_id, cupper_name, cupping_date,
      score_fragrance, score_flavor, score_aftertaste, score_acidity,
      score_body, score_balance, score_overall, 
      uniformity_cups, score_uniformity, 
      clean_cup_cups, score_clean_cup, 
      sweetness_cups, score_sweetness,
      defect_type, defect_cups, defect_score_subtract,
      total_score, final_score, notes, primary_flavor_note
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `, [
    id, public_id, lot_id, cupper_name, cupping_date,
    score_fragrance, score_flavor, score_aftertaste, score_acidity,
    score_body, score_balance, score_overall,
    uniformity_cups, score_uniformity,
    clean_cup_cups, score_clean_cup,
    sweetness_cups, score_sweetness,
    defect_type, defect_cups, defect_score_subtract,
    total_score, final_score, notes, primary_flavor_note
  ]);
}
