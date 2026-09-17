const { ApiError } = require('../lib/http');
const { integerString } = require('../lib/validation');
function list(rows, query, config) {
  const allowed = new Set(['page', 'limit', 'search', 'sort', 'order', ...Object.keys(config.filters)]);
  const errors = Object.create(null);
  for (const [key, value] of Object.entries(query)) {
    if (!allowed.has(key)) errors[key] = ['Parameter tidak diizinkan.'];
    else if (typeof value !== 'string') errors[key] = ['Parameter tidak boleh berulang atau berupa objek.'];
  }
  const page = query.page === undefined ? 1 : Number(query.page);
  const limit = query.limit === undefined ? 10 : Number(query.limit);
  if (query.page !== undefined && !integerString(query.page)) errors.page = ['Page harus integer positif.'];
  if (query.limit !== undefined && (!integerString(query.limit) || limit > 100)) errors.limit = ['Limit harus integer 1–100.'];
  let search = '';
  if (query.search !== undefined) {
    if (typeof query.search !== 'string' || [...query.search.trim()].length > 100) errors.search = ['Search maksimal 100 karakter.'];
    else search = query.search.trim().toLowerCase();
  }
  const sort = query.sort ?? config.defaultSort ?? 'id';
  const order = query.order ?? config.defaultOrder ?? 'asc';
  if (!config.sort.includes(sort)) errors.sort = ['Field sorting tidak diizinkan.'];
  if (!['asc', 'desc'].includes(order)) errors.order = ['Order harus asc atau desc.'];
  for (const [field, rule] of Object.entries(config.filters)) {
    if (query[field] === undefined) continue;
    if (rule === 'id' ? !integerString(query[field]) : !rule.includes(query[field])) errors[field] = ['Nilai filter tidak valid.'];
  }
  if (Object.keys(errors).length) throw new ApiError(400, 'Query tidak valid.', errors);
  let result = rows.filter(row => !search || config.search.some(field => row[field].toLowerCase().includes(search)));
  for (const field of Object.keys(config.filters)) {
    if (query[field] === undefined) continue;
    result = result.filter(row => field === 'subject_id' ? row.subject_ids.includes(Number(query[field])) : String(row[field]) === query[field]);
  }
  result.sort((a, b) => {
    const comparison = typeof a[sort] === 'number' ? a[sort] - b[sort] : a[sort].localeCompare(b[sort], 'id');
    return comparison ? comparison * (order === 'desc' ? -1 : 1) : a.id - b.id;
  });
  const total = result.length;
  const start = (page - 1) * limit;
  return { data: result.slice(start, start + limit), meta: { page, limit, total, total_pages: Math.ceil(total / limit) } };
}
module.exports = { list };
