
import { Package, Search, Filter, AlertTriangle, Monitor } from 'lucide-react';

const mockAssets = [
  { code: 'AST-IT-001', name: 'Server Database Utama', category: 'IT', location: 'Ruang Server C2', age: '3 Tahun', condition: 'Baik', lastMaintenance: '14 Feb 2026' },
  { code: 'AST-LAB-102', name: 'Oscilloscope Digital', category: 'Lab', location: 'Lab T. Elektro 1', age: '4 Tahun', condition: 'Perlu Kalibrasi', lastMaintenance: '01 Des 2025' },
  { code: 'AST-SAR-088', name: 'Genset 50KVA Mitsubishi', category: 'Sarpras', location: 'Gedung Genset', age: '6 Tahun', condition: 'Baik', lastMaintenance: '01 Mar 2026' },
  { code: 'AST-IT-204', name: 'Switch Cisco Catalyst', category: 'IT', location: 'Rak 2 Lantai 3', age: '5 Tahun', condition: 'Perlu Penggantian', lastMaintenance: '10 Jan 2026' },
];

const Assets = () => {
  return (
    <div className="animate-fade-in">
      <div className="flex-row-responsive" style={{ marginBottom: '2rem' }}>
        <div>
          <h1 className="page-title gradient-text">Manajemen Aset & Inventaris</h1>
          <p className="page-subtitle" style={{ margin: 0 }}>Portal pencatatan, depresiasi, dan status kelayakan perangkat.</p>
        </div>
        <button className="btn btn-primary" style={{ alignSelf: 'flex-start', background: 'linear-gradient(135deg, var(--accent-emerald), var(--accent-cyan))' }}>
          <Package size={18} /> <span className="mobile-hide">Tambah Register Aset</span><span style={{ display: 'none' }} className="mobile-show">Tambah</span>
        </button>
      </div>

      <div className="stats-grid">
        <div className="glass-panel stat-card delay-100">
          <div className="stat-header">
            <span className="stat-title">Total Aset (IT & Lab)</span>
            <div className="stat-icon-wrapper" style={{ background: 'var(--accent-blue-ghost)', color: 'var(--accent-blue)' }}>
              <Monitor size={20} />
            </div>
          </div>
          <div>
            <div className="stat-value">1,402</div>
            <div className="stat-trend trend-up">Unit Terdaftar di Database</div>
          </div>
        </div>

        <div className="glass-panel stat-card delay-200">
          <div className="stat-header">
            <span className="stat-title">Aset Rusak/Usang</span>
            <div className="stat-icon-wrapper" style={{ background: 'var(--accent-rose-ghost)', color: 'var(--accent-rose)' }}>
              <AlertTriangle size={20} />
            </div>
          </div>
          <div>
            <div className="stat-value" style={{ color: 'var(--accent-rose)' }}>24</div>
            <div className="stat-trend trend-down" style={{ color: 'var(--accent-rose)' }}>Melebihi Batas Umur Teknis (5 Thn)</div>
          </div>
        </div>

        <div className="glass-panel stat-card delay-300">
          <div className="stat-header">
            <span className="stat-title">Nilai Depresiasi Aset</span>
            <div className="stat-icon-wrapper" style={{ background: 'var(--accent-emerald-ghost)', color: 'var(--accent-emerald)' }}>
              <Package size={20} />
            </div>
          </div>
          <div>
            <div className="stat-value" style={{ fontSize: '1.8rem' }}>Rp 2.4<span style={{ fontSize: '1rem', color: 'var(--text-secondary)' }}>M+</span></div>
            <div className="stat-trend trend-up">Valuasi inventaris terkini</div>
          </div>
        </div>
      </div>

      <div className="glass-panel delay-300 table-container">
        <div className="flex-row-responsive" style={{ padding: '1rem 1.5rem', borderBottom: '1px solid var(--border-subtle)' }}>
          <h3 style={{ fontSize: '1rem', margin: 0 }}>Register Aset Utama</h3>
          <div style={{ display: 'flex', gap: '0.5rem', width: '100%', maxWidth: '300px', justifyContent: 'flex-end' }}>
            <button className="btn btn-outline" style={{ flex: 1, padding: '0.3rem 0.6rem', fontSize: '0.8rem', justifyContent: 'center' }}><Filter size={14} /> <span className="mobile-hide">Filter</span></button>
            <button className="btn btn-outline" style={{ flex: 1, padding: '0.3rem 0.6rem', fontSize: '0.8rem', justifyContent: 'center' }}><Search size={14} /> <span className="mobile-hide">Cari</span></button>
          </div>
        </div>
        <table>
          <thead>
            <tr>
              <th>Kode Aset</th>
              <th>Nama Perangkat</th>
              <th>Kategori</th>
              <th>Lokasi</th>
              <th>Umur</th>
              <th>Kondisi Fisik</th>
              <th>Maintenance Terakhir</th>
            </tr>
          </thead>
          <tbody>
            {mockAssets.map((asset, index) => (
              <tr className="ticket-row" key={index}>
                <td style={{ fontWeight: 600, color: 'var(--accent-cyan)' }}>{asset.code}</td>
                <td>{asset.name}</td>
                <td><span className="badge badge-info">{asset.category}</span></td>
                <td>{asset.location}</td>
                <td style={{ color: 'var(--text-secondary)' }}>{asset.age}</td>
                <td>
                  <span className={`badge ${asset.condition === 'Baik' ? 'badge-success' : asset.condition.includes('Kalibrasi') ? 'badge-warning' : 'badge-danger'}`}>
                    {asset.condition}
                  </span>
                </td>
                <td style={{ color: 'var(--text-muted)' }}>{asset.lastMaintenance}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Assets;
