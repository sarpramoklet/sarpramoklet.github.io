const pickDetailValue = (source, paths) => {
  const isDetailRecord = (value) => typeof value === 'object' && value !== null && !Array.isArray(value);

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

const obj = {
  item: {
    asset: {
      name: "Videotron Indoor",
      quantity: 1
    }
  }
};

console.log(pickDetailValue(obj, ['item.asset.name']));
console.log(pickDetailValue(obj, ['label.asset.name']));

