import { useState, useEffect } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Activity, Clock10, CheckSquare, TriangleAlert, ArrowUpRight, ArrowDownRight, UserCircle2, TrendingUp, Wallet, Loader2 } from 'lucide-react';
import { getCurrentUser, ROLES } from '../data/organization';

const FINANCE_API_URL = "https://script.google.com/macros/s/AKfycbzjzoObkhyXuVA3czMoMutwqW3MjuD4oJ9xYsMotlOC30z0c2dPaE525DhxKM2J9vsCIw/exec";

const areaData = [
  { name: 'Jan', IT: 400, Lab: 240, Sarpras: 240 },
  { name: 'Feb', IT: 300, Lab: 139, Sarpras: 221 },
  { name: 'Mar', IT: 200, Lab: 400, Sarpras: 229 },
  { name: 'Apr', IT: 278, Lab: 390, Sarpras: 200 },
  { name: 'Mei', IT: 189, Lab: 480, Sarpras: 218 },
  { name: 'Jun', IT: 239, Lab: 380, Sarpras: 250 },
  { name: 'Jul', IT: 349, Lab: 430, Sarpras: 210 },
];

const pieData = [
  { name: 'IT Helpdesk', value: 400, color: '#3b82f6' },
  { name: 'Lab Practical', value: 300, color: '#8b5cf6' },
  { name: 'Building Mgmt', value: 300, color: '#10b981' },
];

const kaurStats = [
  { name: 'Whyna Agustin', unit: 'IT', created: 45, completion: 92, avatar: 'W', color: 'var(--accent-blue)' },
  { name: 'Chusni Agus', unit: 'Lab', created: 38, completion: 89, avatar: 'C', color: 'var(--accent-violet)' },
  { name: 'Ekon Anjar', unit: 'Sarpras', created: 52, completion: 95, avatar: 'E', color: 'var(--accent-emerald)' },
];

interface DashboardProps {
  isLoggedIn?: boolean;
  userPicture?: string;
}

const Dashboard = ({ isLoggedIn = false, userPicture = '' }: DashboardProps) => {
  const currentUser = getCurrentUser();
  const isPimpinan = currentUser.roleAplikasi === ROLES.PIMPINAN;
  const isAuthorizedFinance = isPimpinan || currentUser.roleAplikasi === ROLES.PIC_ADMIN;
  
  const [financeLoading, setFinanceLoading] = useState(true);
  const [financeData, setFinanceData] = useState({ totalIncome: 0, totalExpense: 0, balance: 0 });

  useEffect(() => {
    const fetchFinance = async () => {
      try {
        const resp = await fetch(FINANCE_API_URL);
        const data = await resp.json();
        if (data && Array.isArray(data)) {
          const mapped = data.map((item: any) => ({
            id: item.id || item.ID || '',
            date: item.date || item.Tanggal || '',
            amount: item.amount || item.Amount || 0,
            type: item.type || item.Tipe || ''
          }));
          const income = mapped.filter((item: any) => item.type === 'income').reduce((acc, curr) => acc + Number(curr.amount), 0);
          const expense = mapped.filter((item: any) => item.type === 'expense').reduce((acc, curr) => acc + Number(curr.amount), 0);
          setFinanceData({ totalIncome: income, totalExpense: expense, balance: income - expense });
        }
      } catch (error) {
        console.error("Dashboard finance fetch error:", error);
      } finally {
        setFinanceLoading(false);
      }
    };
    fetchFinance();
  }, [isPimpinan]);

  const formatIDR = (val: number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(val);
  };

  const recentIssues = [
    { id: 'TKT-1049', title: 'Server Database Down', unit: 'IT', time: '1 jam lalu', priority: 'High', status: 'Dikerjakan' },
    { id: 'TKT-1048', title: 'AC Ruang Guru Bocor', unit: 'Sarpras', time: '3 jam lalu', priority: 'Medium', status: 'Direncanakan' },
    { id: 'TKT-1047', title: 'Komputer Lab IoT Mati', unit: 'Lab', time: 'Kemarin', priority: 'High', status: 'Diverifikasi' },
    { id: 'TKT-1046', title: 'Request Kabel LAN Tambahan', unit: 'IT', time: 'Kemarin', priority: 'Low', status: 'Selesai' },
  ];

  return (
    <div className="animate-fade-in">
      {isLoggedIn && (
        <div className="glass-panel" style={{ padding: '1rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '1rem', borderLeft: '4px solid var(--accent-blue)', background: 'linear-gradient(90deg, var(--accent-blue-ghost), transparent)' }}>
          <div style={{ padding: userPicture ? '0' : '8px', background: 'var(--bg-card)', borderRadius: '12px', color: 'var(--accent-blue)', border: '1px solid var(--border-subtle)', width: '40px', height: '40px', flexShrink: 0, overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {userPicture ? (
              <img src={userPicture} alt="Profile" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              <UserCircle2 size={20} />
            )}
          </div>
          <div>
            <h2 style={{ fontSize: '1rem', margin: 0, fontWeight: 700 }}>Hai, {getCurrentUser().nama.split(' ')[0]}!</h2>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', margin: 0 }} className="mobile-hide">Jabatan: <strong>{getCurrentUser().jabatan}</strong></p>
          </div>
        </div>
      )}

      <div className="flex-row-responsive" style={{ marginBottom: '2rem' }}>
        <div>
          <h1 className="page-title gradient-text">Pusat Kendali Layanan</h1>
          <p className="page-subtitle" style={{ margin: 0, maxWidth: '800px' }}>
            Monitor penugasan, progres rutin, dan proyek tim IT, Lab & Sarana Prasarana.
          </p>
        </div>
        <button className="btn btn-primary" style={{ alignSelf: 'flex-start' }}>
          <Activity size={18} /> <span className="mobile-hide">Unduh Laporan PDF</span><span style={{ display: 'none' }} className="mobile-show">Laporan</span>
        </button>
      </div>


      <div className="stats-grid">
        <div className="glass-panel stat-card delay-100">
          <div className="stat-header">
            <span className="stat-title">Pekerjaan Aktif</span>
            <div className="stat-icon-wrapper" style={{ background: 'var(--accent-blue-ghost)', color: 'var(--accent-blue)' }}>
              <Activity size={20} />
            </div>
          </div>
          <div>
            <div className="stat-value">142</div>
            <div className="stat-trend trend-up">
              <ArrowUpRight size={16} /> <span>12% dibanding bulan lalu</span>
            </div>
          </div>
        </div>

        <div className="glass-panel stat-card delay-200">
          <div className="stat-header">
            <span className="stat-title">Rata-rata Penanganan</span>
            <div className="stat-icon-wrapper" style={{ background: 'var(--accent-emerald-ghost)', color: 'var(--accent-emerald)' }}>
              <Clock10 size={20} />
            </div>
          </div>
          <div>
            <div className="stat-value">2.4 <span style={{ fontSize: '1.25rem', color: 'var(--text-secondary)' }}>jam</span></div>
            <div className="stat-trend trend-down">
              <ArrowDownRight size={16} /> <span style={{ color: 'var(--accent-emerald)' }}>Menurun 15% (Lebih Cepat)</span>
            </div>
          </div>
        </div>

        <div className="glass-panel stat-card delay-300">
          <div className="stat-header">
            <span className="stat-title">Pekerjaan Selesai</span>
            <div className="stat-icon-wrapper" style={{ background: 'var(--accent-violet-ghost)', color: 'var(--accent-violet)' }}>
              <CheckSquare size={20} />
            </div>
          </div>
          <div>
            <div className="stat-value">489</div>
            <div className="stat-trend trend-up">
              <ArrowUpRight size={16} /> <span>Tingkat Ketercapaian: 94%</span>
            </div>
          </div>
        </div>

        <div className="glass-panel stat-card" style={{ animationDelay: '0.4s' }}>
          <div className="stat-header">
            <span className="stat-title">Tiket Overdue</span>
            <div className="stat-icon-wrapper" style={{ background: 'var(--accent-rose-ghost)', color: 'var(--accent-rose)' }}>
              <TriangleAlert size={20} />
            </div>
          </div>
          <div>
            <div className="stat-value" style={{ color: 'var(--accent-rose)' }}>14</div>
            <div className="stat-trend trend-up" style={{ color: 'var(--accent-rose)' }}>
              <ArrowUpRight size={16} /> <span>Perlu Perhatian Pimpinan</span>
            </div>
          </div>
        </div>
      </div>

      <div className="dashboard-grid delay-300">
        <div className="glass-panel chart-container" style={{ minHeight: '300px' }}>
          <div className="chart-header">
            <h3 style={{ fontSize: '0.9rem', color: 'var(--text-primary)' }}>Tren Permintaan Layanan</h3>
            <div className="badge badge-info" style={{ fontSize: '0.65rem' }}>TAHUN INI</div>
          </div>
          <div style={{ flex: 1, minHeight: 0 }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={areaData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                <XAxis dataKey="name" stroke="var(--text-muted)" fontSize={10} tickLine={false} axisLine={false} />
                <YAxis stroke="var(--text-muted)" fontSize={10} tickLine={false} axisLine={false} />
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" vertical={false} />
                <RechartsTooltip 
                  contentStyle={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-focus)', borderRadius: '8px', fontSize: '10px' }}
                />
                <Area type="monotone" dataKey="IT" stroke="#3b82f6" strokeWidth={2} fillOpacity={0.2} fill="#3b82f6" />
                <Area type="monotone" dataKey="Lab" stroke="#8b5cf6" strokeWidth={2} fillOpacity={0.2} fill="#8b5cf6" />
                <Area type="monotone" dataKey="Sarpras" stroke="#10b981" strokeWidth={2} fillOpacity={0.2} fill="#10b981" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <h3 style={{ fontSize: '0.9rem', color: 'var(--text-primary)', margin: 0 }}>Distribusi Pekerjaan SLA</h3>
          <div style={{ height: '180px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={pieData} innerRadius={50} outerRadius={70} paddingAngle={5} dataKey="value">
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <RechartsTooltip 
                  contentStyle={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-focus)', borderRadius: '8px' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', justifyContent: 'center' }}>
            {pieData.map(item => (
              <div key={item.name} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: item.color }}></div>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{item.name.split(' ')[0]}</span>
                <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>{item.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {isAuthorizedFinance && (
        <div className="glass-panel delay-300" style={{ marginBottom: '1.5rem', padding: '1.25rem', background: 'linear-gradient(135deg, var(--accent-violet-ghost), transparent)' }}>
           <div className="flex-row-responsive" style={{ gap: '1.25rem' }}>
             <div style={{ flex: 1 }}>
               <h3 style={{ fontSize: '1rem', color: 'var(--text-primary)', margin: '0 0 0.25rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                 <Wallet size={18} color="var(--accent-violet)" /> Kas Operasional {financeLoading && <Loader2 size={14} className="animate-spin" />}
               </h3>
               <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Status saldo dikelola Tata Kelola</p>
             </div>
             <div style={{ display: 'flex', gap: '1.5rem', justifyContent: 'space-between' }}>
                <div style={{ textAlign: 'right' }}>
                   <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                     {financeLoading ? '---' : formatIDR(financeData.balance)}
                   </div>
                   <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Saldo</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                   <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--accent-rose)' }}>
                     {financeLoading ? '---' : formatIDR(financeData.totalExpense)}
                   </div>
                   <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Pengeluaran</div>
                </div>
             </div>
           </div>
        </div>
      )}


      {isPimpinan && (
        <div className="glass-panel delay-300" style={{ marginBottom: '1.5rem' }}>
          <div style={{ padding: '1.25rem', borderBottom: '1px solid var(--border-subtle)', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <h3 style={{ fontSize: '1rem', color: 'var(--text-primary)', margin: 0, display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <TrendingUp size={18} color="var(--accent-blue)" /> Kinerja Koordinator
            </h3>
            <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Status progres pekerjaan per unit</p>
          </div>
          <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', padding: '1.25rem', gap: '1rem' }}>
            {kaurStats.map((kaur) => (
              <div key={kaur.name} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-subtle)', borderRadius: '12px', padding: '1rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: kaur.color, color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '0.8rem' }}>
                      {kaur.avatar}
                    </div>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>{kaur.name.split(' ')[0]}</div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>Kaur {kaur.unit}</div>
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '1rem', fontWeight: 700 }}>{kaur.created}</div>
                    <div style={{ fontSize: '0.6rem', color: 'var(--text-muted)' }}>JOBS</div>
                  </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem' }}>
                    <span>Completion</span>
                    <span style={{ fontWeight: 600 }}>{kaur.completion}%</span>
                  </div>
                  <div className="progress-bar-bg" style={{ height: '4px' }}>
                    <div className="progress-bar-fill" style={{ width: `${kaur.completion}%`, background: kaur.color }}></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="glass-panel delay-300">
        <div style={{ padding: '1.25rem', borderBottom: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ fontSize: '0.9rem', color: 'var(--text-primary)', margin: 0 }}>Top Isu & Eskalasi</h3>
          <button className="btn btn-outline" style={{ padding: '0.3rem 0.6rem', fontSize: '0.75rem' }}>Semua</button>
        </div>
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Isu / Deskripsi</th>
                <th className="mobile-hide">Unit</th>
                <th className="mobile-hide">Prioritas</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {recentIssues.map((issue) => (
                <tr className="ticket-row" key={issue.id}>
                  <td>
                    <div style={{ fontWeight: 600, color: 'var(--accent-blue)', fontSize: '0.75rem' }}>{issue.id}</div>
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-primary)', fontWeight: 500 }}>{issue.title}</div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }} className="mobile-show">
                      {issue.unit} • {issue.priority} • {issue.time}
                    </div>
                  </td>
                  <td className="mobile-hide">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <span style={{ fontSize: '0.8rem' }}>{issue.unit}</span>
                    </div>
                  </td>
                  <td className="mobile-hide">
                    <span className={`badge ${issue.priority === 'High' ? 'badge-danger' : 'badge-warning'}`} style={{ fontSize: '0.65rem' }}>
                      {issue.priority}
                    </span>
                  </td>
                  <td>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{issue.status}</div>
                    <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }} className="mobile-hide">{issue.time}</div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
};

export default Dashboard;
