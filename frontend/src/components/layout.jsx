import { Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Sidebar from './Sidebar';
import Navbar from './Navbar';

export default function Layout() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';

  return (
    <div className={`app-container${isAdmin ? '' : ' operational-layout'}`}>
      {isAdmin && <Sidebar />}
      <div className={`main-content${isAdmin ? '' : ' main-content--operational'}`}>
        <Navbar />
        <main className={`content${isAdmin ? '' : ' content--operational'}`}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}