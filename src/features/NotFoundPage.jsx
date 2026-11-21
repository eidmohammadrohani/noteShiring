import { Link } from 'react-router-dom';
import { Compass } from 'lucide-react';
import EmptyState from '../components/common/EmptyState.jsx';

export default function NotFoundPage() {
  return (
    <div className="not-found">
      <EmptyState
        icon={Compass}
        title="Page not found"
        action={
          <Link className="btn btn-primary" to="/">
            Go to home
          </Link>
        }
      >
        The page you are looking for does not exist or has moved.
      </EmptyState>
    </div>
  );
}
