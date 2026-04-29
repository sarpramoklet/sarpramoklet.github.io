const parseMaybeJsonValue = (value) => {
  if (typeof value === 'object' && value !== null && !Array.isArray(value)) return value;
  if (Array.isArray(value)) return value;
  if (typeof value !== 'string') return null;

  const trimmed = value.trim();
  if (!((trimmed.startsWith('{') && trimmed.endsWith('}')) || (trimmed.startsWith('[') && trimmed.endsWith(']')))) return null;

  try {
    const parsed = JSON.parse(trimmed);
    return typeof parsed === 'string' ? parseMaybeJsonValue(parsed) ?? parsed : parsed;
  } catch {
    return null;
  }
};

const isDetailRecord = (value) => typeof value === 'object' && value !== null && !Array.isArray(value);

const expandDetailRecord = (detail) => {
  const normalized = parseMaybeJsonValue(detail) ?? detail;
  if (isDetailRecord(normalized)) {
    const expanded = { ...normalized };
    for (const key of ['asset_id', 'tool_id', 'item_id', 'asset', 'tool', 'item', 'goods', 'barang', 'procurement', 'procurements']) {
      if (typeof expanded[key] === 'string' && (expanded[key].startsWith('{') || expanded[key].startsWith('['))) {
        const parsed = parseMaybeJsonValue(expanded[key]);
        if (parsed !== null) {
          expanded[key] = parsed;
        }
      }
    }
    return expanded;
  }
  return normalized;
};

const pickDetailValue = (source, paths) => {
  if (!isDetailRecord(source)) return undefined;

  for (const path of paths) {
    const value = path.split('.').reduce((current, key) => {
      if (!isDetailRecord(current)) return undefined;
      return current[key];
    }, source);

    if (value !== undefined && value !== null && value !== '') return value;
  }
  return undefined;
};

const formatDetailValue = (value) => {
  if (value === null || value === undefined || value === '') return '-';
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') return String(value);
  return JSON.stringify(value);
};

const formatHumanValue = (value) => {
  if (isDetailRecord(value)) {
    const readable = pickDetailValue(value, ['name', 'nama', 'full_name', 'fullname', 'title', 'label', 'description', 'code', 'kode', 'email']);
    if (readable !== undefined) return formatDetailValue(readable);
  }

  if (Array.isArray(value)) {
    if (value.length === 0) return '-';
    return value.map(formatHumanValue).filter((item) => item !== '-').join(', ') || '-';
  }

  return formatDetailValue(value);
};

const pickHumanValue = (row, paths) => {
  return formatHumanValue(pickDetailValue(row, paths));
};

const getDetailCollection = (row, paths) => {
  const raw = pickDetailValue(row, paths);
  const parsed = parseMaybeJsonValue(raw) ?? raw;

  if (Array.isArray(parsed)) return parsed;
  if (isDetailRecord(parsed)) return [parsed];

  const aliases = new Set(paths.map((path) => {
    const parts = path.split('.');
    return parts[parts.length - 1];
  }));

  const visited = new WeakSet();
  const findNestedCollection = (value, allowDirectCollection = false) => {
    const normalized = parseMaybeJsonValue(value) ?? value;
    if (Array.isArray(normalized)) return allowDirectCollection ? normalized : [];
    if (!isDetailRecord(normalized) || visited.has(normalized)) return [];
    if (allowDirectCollection) return [normalized];

    visited.add(normalized);

    for (const ObjectEntry of Object.entries(normalized)) {
      const key = ObjectEntry[0];
      const child = ObjectEntry[1];
      if (aliases.has(key)) {
        const found = findNestedCollection(child, true);
        if (found.length > 0) return found;
      }
    }

    for (const child of Object.values(normalized)) {
      const found = findNestedCollection(child, false);
      if (found.length > 0) return found;
    }

    return [];
  };

  return findNestedCollection(row);
};

const formatBorrowItems = (row) => {
  const expandedRow = expandDetailRecord(row);
  const direct = pickHumanValue(expandedRow, [
    'tool.name', 'tool.nama', 'tool_id.name', 'tool_id.nama',
    'item.name', 'item.nama', 'item_id.name', 'item_id.nama',
    'asset.name', 'asset.nama', 'asset_id.name', 'asset_id.nama',
    'goods.name', 'barang.name', 'procurement.name', 'procurement.asset.name', 'procurements.name', 'procurements.asset.name', 'tool_name', 'item_name', 'asset_name', 'name'
  ]);
  if (direct !== '-') return direct;

  const details = getDetailCollection(expandedRow, ['procurements', 'sarpra_detail_borrow', 'sarpra_detail_borrows', 'detail_borrow', 'detail_borrows', 'borrow_details', 'details', 'items', 'tools', 'assets']);
  if (details.length === 0) return '-';

  return details.map((detail) => {
    const normalizedDetail = expandDetailRecord(detail);
    const itemName = pickHumanValue(normalizedDetail, [
      'asset.name', 'asset.nama', 'asset.title', 'asset.label',
      'asset_id.name', 'asset_id.nama', 'asset_id.title', 'asset_id.label',
      'procurement.name', 'procurement.nama', 'procurements.name', 'procurements.nama',
      'procurements.asset.name', 'procurements.asset.nama',
      'sarpra.name', 'sarpra.nama', 'sarpra_item.name', 'sarpra_item.nama',
      'item.name', 'item.nama', 'item_id.name', 'item_id.nama',
      'tool.name', 'tool.nama', 'tool_id.name', 'tool_id.nama',
      'goods.name', 'barang.name', 'name', 'nama',
    ]);
    const qty = pickHumanValue(normalizedDetail, [
      'quantity', 'qty', 'jumlah', 'amount', 'total', 
      'procurement.quantity', 'procurement.qty', 'procurements.quantity', 'procurements.qty',
      'asset_id.quantity', 'asset_id.qty', 'asset_id.jumlah',
      'item_id.quantity', 'item_id.qty', 'item_id.jumlah',
      'tool_id.quantity', 'tool_id.qty', 'tool_id.jumlah'
    ]);
    return qty !== '-' ? `${itemName} (${qty})` : itemName;
  }).filter((item) => item !== '-').join(', ') || '-';
};

const formatBorrowQuantity = (row) => {
  const expandedRow = expandDetailRecord(row);
  const direct = pickHumanValue(expandedRow, ['quantity', 'qty', 'jumlah', 'amount', 'total']);
  if (direct !== '-') return direct;

  const details = getDetailCollection(expandedRow, ['procurements', 'sarpra_detail_borrow', 'sarpra_detail_borrows', 'detail_borrow', 'detail_borrows', 'borrow_details', 'details', 'items', 'tools', 'assets']);
  if (details.length === 0) return '-';

  const quantities = details
    .map((detail) => pickHumanValue(expandDetailRecord(detail), [
      'quantity', 'qty', 'jumlah', 'amount', 'total', 
      'procurement.quantity', 'procurement.qty', 'procurements.quantity', 'procurements.qty',
      'asset_id.quantity', 'asset_id.qty', 'asset_id.jumlah',
      'item_id.quantity', 'item_id.qty', 'item_id.jumlah',
      'tool_id.quantity', 'tool_id.qty', 'tool_id.jumlah'
    ]))
    .filter((quantity) => quantity !== '-');

  return quantities.join(', ') || '-';
};

// Test cases
const test1 = {
  sarpra_detail_borrow: [
    { asset_id: "{\"asset_id\":\"123\",\"name\":\"Videotron Indoor\",\"quantity\":1}" }
  ]
};

const test2 = {
  asset_id: "{\"asset_id\":\"123\",\"name\":\"Videotron Indoor\",\"quantity\":1}"
};

const test3 = {
  sarpra_detail_borrow: [
    {
      "asset_id":"599555b8-cd12-4d03-9aad-25216fd1a6ac",
      "name":"Videotron Indoor",
      "description":"{\"Ukuran\":\"5 x 2,5\",\"P\":\"2,5\",\"Panel\":\"25 Panel\"}",
      "date_of_procurement":"2024-12-17T00:00:00.000Z",
      "quantity":1
    }
  ]
};

console.log("Test 1 Items:", formatBorrowItems(test1));
console.log("Test 1 Qty:", formatBorrowQuantity(test1));
console.log("Test 2 Items:", formatBorrowItems(test2));
console.log("Test 2 Qty:", formatBorrowQuantity(test2));
console.log("Test 3 Items:", formatBorrowItems(test3));
console.log("Test 3 Qty:", formatBorrowQuantity(test3));

