import { useAuth } from '../context/AuthContext';
import { NavLink } from 'react-router-dom';
import { LogOut, User, Shield } from 'lucide-react';

export default function Navbar() {
  const { user, logout } = useAuth();

  if (user?.role !== 'ADMIN') {
    const roleNavigation = {
      FDO: [
        { path: '/applications', label: 'Applications' },
        { path: '/transactions', label: 'Transactions' },
        { path: '/portal/application-status', label: 'Search' }
      ],
      DO: [
        { path: '/do', label: 'Document Queue' }
      ],
      RO: [
        { path: '/transactions', label: 'Transactions' },
        { path: '/ro', label: 'Registration Workbench' },
        { path: '/recs', label: 'RECS Cadastre' }
      ],
      SRO: [
        { path: '/transactions', label: 'Transactions' },
        { path: '/sro', label: 'Approvals & Titles' },
        { path: '/recs', label: 'RECS Cadastre' }
      ],
      GO: [
        { path: '/recs', label: 'RECS Cadastre' },
        { path: '/transactions', label: 'Transactions' }
      ],
      SGO: [
        { path: '/recs', label: 'RECS Cadastre' },
        { path: '/transactions', label: 'Transactions' }
      ]
    };
    const links = roleNavigation[user?.role] || [];

    return (
      <nav className="navbar navbar--operational" aria-label="Main navigation">
        <div className="operational-brand">
          <span className="operational-brand__mark" aria-hidden="true">CR</span>
          <span>
            <strong>CRPRS</strong>
            <small>REAL PROPERTY REGISTRATION SYSTEM</small>
          </span>
        </div>
        <div className="operational-navigation">
          {links.map(link => (
            <NavLink
              key={link.path}
              to={link.path}
              className={({ isActive }) => isActive ? 'operational-navigation__link active' : 'operational-navigation__link'}
            >
              {link.label}
            </NavLink>
          ))}
          {user?.role === 'FDO' && (
            <NavLink className="operational-navigation__create" to="/applications/new">
              + New Application
            </NavLink>
          )}
        </div>
        <div className="operational-user">
          <span className="operational-user__identity">
            <User aria-hidden="true" />
            <span>{user?.full_name || user?.username}</span>
            <span className="operational-user__role">{user?.role}</span>
          </span>
          <button className="operational-logout" onClick={logout}>
            <LogOut aria-hidden="true" /> <span>Logout</span>
          </button>
        </div>
      </nav>
    );
  }

  return (
    <nav className="navbar">
      <div className="flex items-center gap-3">
        <span className="font-semibold text-slate-800 text-sm">Welcome, {user?.full_name || user?.username}</span>
        <span className="user-role-badge flex items-center gap-1">
          <Shield className="w-3 h-3 text-blue-700" /> {user?.role}
        </span>
      </div>
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1.5 text-xs text-slate-600 font-medium bg-slate-100 px-2.5 py-1 rounded-full border border-slate-200">
          <User className="w-3.5 h-3.5 text-slate-500" />
          <span>{user?.email || 'user@crprs.gov.et'}</span>
        </div>
        <button className="btn btn-success btn-sm flex items-center gap-1" onClick={logout}>
          <LogOut className="w-3.5 h-3.5" /> Logout
        </button>
      </div>
    </nav>
  );
}