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

const extractItemsBySignature = (row) => {
  const items = [];
  const visited = new WeakSet();

  const search = (obj) => {
    let parsed = parseMaybeJsonValue(obj) ?? obj;
    
    if (typeof parsed === 'string') {
      const matchName = parsed.match(/"name"\s*:\s*"([^"]+)"/i);
      const matchQty = parsed.match(/"quantity"\s*:\s*(\d+)/i);
      const matchAssetId = parsed.match(/"asset_id"/i);
      if (matchName && matchAssetId) {
        items.push({ name: matchName[1], qty: matchQty ? Number(matchQty[1]) : 1 });
        return;
      }
    }

    if (!isDetailRecord(parsed)) {
      if (Array.isArray(parsed)) parsed.forEach(search);
      return;
    }

    if (visited.has(parsed)) return;
    visited.add(parsed);

    const hasItemSignature = parsed.asset_id !== undefined || parsed.date_of_procurement !== undefined || parsed.item_id !== undefined || parsed.tool_id !== undefined || parsed.condition !== undefined;
    const hasName = parsed.name || parsed.nama || parsed.title || parsed.asset_name || parsed.item_name;
    
    if (hasItemSignature && hasName && typeof hasName === 'string') {
      const qty = Number(parsed.quantity || parsed.qty || parsed.jumlah) || 1;
      if (!parsed.email && !parsed.password && !parsed.role) {
        items.push({ name: hasName, qty });
      }
    }

    Object.values(parsed).forEach(search);
  };

  search(row);
  
  const uniqueItems = new Map();
  items.forEach(item => {
    uniqueItems.set(item.name, Math.max(uniqueItems.get(item.name) || 0, item.qty));
  });
  
  return Array.from(uniqueItems.entries()).map(([name, qty]) => ({ name, qty }));
};

const testStr = '{"asset_id":"599555b8-cd12-4d03-9aad-25216fd1a6ac","name":"Videotron Indoor","description":"...","date_of_procurement":"2024-12-17T00:00:00.000Z","quantity":2}';
console.log(extractItemsBySignature({ data: testStr }));
