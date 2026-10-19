import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Home, FileText, List, UserCheck, CheckSquare, Users, Settings, Database, MapPin, ShieldCheck, Globe } from 'lucide-react';

export default function Sidebar() {
  const { user } = useAuth();
  const role = user?.role;

  const menuItems = [
    { path: '/dashboard', label: 'Dashboard & Reports', icon: Home, roles: ['ADMIN'] },
    { path: '/applications', label: 'Applications (FDO)', icon: FileText, roles: ['FDO'] },
    { path: '/transactions', label: 'Transactions Queue', icon: List, roles: ['FDO','RO','SRO','GO','SGO'] },
    { path: '/recs', label: 'RECS GIS Cadastre', icon: MapPin, roles: ['GO'] },
    { path: '/do', label: 'DMS & Scanning Studio', icon: FileText, roles: ['DO'] },
    { path: '/ro', label: 'Registration Workbench', icon: UserCheck, roles: ['RO'] },
    { path: '/sro', label: 'SRO Approvals & Titles', icon: CheckSquare, roles: ['SRO'] },
    { path: '/admin/users', label: 'User Management', icon: Users, roles: ['ADMIN'] },
    { path: '/admin/lookups', label: 'Lookup Management', icon: Database, roles: ['ADMIN'] },
    { path: '/admin/required-documents', label: 'Required Documents', icon: Settings, roles: ['ADMIN'] },
    { path: '/admin/public-content', label: 'Public Content', icon: Globe, roles: ['ADMIN'] },
    { path: '/admin/audit-logs', label: 'Audit Trail & Monitoring', icon: ShieldCheck, roles: ['ADMIN'] },
  ];

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <h2>CRPRS</h2>
        <p>Cadastre & Real Property Registration System</p>
      </div>
      <ul className="sidebar-menu">
        {menuItems.filter(m => m.roles.includes(role)).map(m => (
          <li key={m.path}>
            <NavLink to={m.path} className={({isActive}) => isActive ? 'active' : ''}>
              <m.icon size={20} /> {m.label}
            </NavLink>
          </li>
        ))}
      </ul>
    </aside>
  );
}