export const UTILITIES_DATA = [
  {
    id: 1,
    pelanggan: 'PLN – Yayasan Sandykara',
    type: 'PLN',
    history: {
      'Des 25': 7336630,
      'Jan': 4592250,
      'Feb': 6556510,
      'Mar': 4631850
    }
  },
  {
    id: 2,
    pelanggan: 'PLN – SMK Telkom',
    type: 'PLN',
    history: {
      'Des 25': 9874990,
      'Jan': 7814800,
      'Feb': 11782720,
      'Mar': 7814800
    }
  },
  {
    id: 3,
    pelanggan: 'PLN – Kantin',
    type: 'PLN',
    history: {
      'Des 25': 4992210,
      'Jan': 2126160,
      'Feb': 5994190,
      'Mar': 3833910
    }
  },
  {
    id: 4,
    pelanggan: 'PDAM – Yys Sandhikara',
    type: 'PDAM',
    history: {
      'Des 25': 1041000,
      'Jan': 1041000,
      'Feb': 792500,
      'Mar': 1072500
    }
  }
];

export const UTILITY_MONTHS = ['Des 25', 'Jan', 'Feb', 'Mar'];

export const getUtilityChartData = () => {
  return UTILITY_MONTHS.map(month => {
    return {
      name: month,
      PLN: UTILITIES_DATA.filter(d => d.type === 'PLN').reduce((acc, curr) => acc + (curr.history[month as keyof typeof curr.history] || 0), 0),
      PDAM: UTILITIES_DATA.filter(d => d.type === 'PDAM').reduce((acc, curr) => acc + (curr.history[month as keyof typeof curr.history] || 0), 0),
    };
  });
};
