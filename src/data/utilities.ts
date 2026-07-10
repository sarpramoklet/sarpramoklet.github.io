export const UTILITIES_DATA = [
  {
    id: 1,
    pelanggan: 'PLN – Yayasan Sandykara',
    type: 'PLN',
    history: {
      'Des 25': 7336630,
      'Jan': 4592250,
      'Feb': 6556510,
      'Mar': 4631850,
      'Apr': 4155570,
      'Mei': 7234570,
      'Jun': 5174380,
      'Jul': 3557610,
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
      'Mar': 7814800,
      'Apr': 7815700,
      'Mei': 12784510,
      'Jun': 9443260,
      'Jul': 7815700,
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
      'Mar': 3833910,
      'Apr': 2626020,
      'Mei': 5337730,
      'Jun': 2889360,
      'Jul': 1840950,
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
      'Mar': 1072500,
      'Apr': 866000,
      'Mei': 764500,
      'Jun': 1051500,
      'Jul': 995500,
    }
  }
];

export const UTILITY_MONTHS = ['Des 25', 'Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul'];

export const getUtilityChartData = () => {
  return UTILITY_MONTHS.map(month => {
    return {
      name: month,
      PLN: UTILITIES_DATA.filter(d => d.type === 'PLN').reduce((acc, curr) => acc + (curr.history[month as keyof typeof curr.history] || 0), 0),
      PDAM: UTILITIES_DATA.filter(d => d.type === 'PDAM').reduce((acc, curr) => acc + (curr.history[month as keyof typeof curr.history] || 0), 0),
    };
  });
};
