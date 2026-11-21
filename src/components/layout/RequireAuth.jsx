import { Navigate, useLocation } from 'react-router-dom';
import { useCurrentUser } from '../../hooks/useData.js';
import { basePathFor } from '../../utils/paths.js';

// Route guard. Without a valid session the visitor is sent to the login page
// (replacing history, so Back cannot reopen a private page after logout). A
// student can never open /admin and vice versa.
export default function RequireAuth({ role, children }) {
  const user = useCurrentUser();
  const location = useLocation();
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  if (user.role !== role) return <Navigate to={basePathFor(user)} replace />;
  return children;
}
