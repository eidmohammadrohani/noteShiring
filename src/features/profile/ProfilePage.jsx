import { useNavigate } from 'react-router-dom';
import { UserRound } from 'lucide-react';
import PageHeader from '../../components/common/PageHeader.jsx';
import { useConfirm } from '../../components/common/ConfirmDialog.jsx';
import { useToast } from '../../components/common/Toast.jsx';
import { useCurrentUser } from '../../hooks/useData.js';
import { deleteOwnAccount } from '../../services/adminService.js';
import { toUserMessage } from '../../services/errors.js';
import ProfileForm from './ProfileForm.jsx';
import PasswordForm from './PasswordForm.jsx';

export default function ProfilePage() {
  const user = useCurrentUser();
  const confirm = useConfirm();
  const navigate = useNavigate();
  const { notify } = useToast();

  async function deleteAccount() {
    const ok = await confirm({
      title: 'Delete your account?',
      message:
        'This permanently deletes your profile, your notes, your comments and your favorites. This cannot be undone.',
      confirmLabel: 'Delete my account',
      danger: true,
    });
    if (!ok) return;
    try {
      await deleteOwnAccount(user);
      navigate('/', { replace: true });
      notify('Your account has been deleted.', 'info');
    } catch (e) {
      notify(toUserMessage(e), 'error');
    }
  }

  return (
    <>
      <PageHeader
        icon={UserRound}
        title="My profile"
        subtitle="Manage your personal information and password."
      />
      <div className="profile-layout">
        <ProfileForm key={user.id + user.name} user={user} />
        <div>
          <PasswordForm user={user} />
          {user.role !== 'admin' && (
            <section className="card danger-zone" aria-labelledby="danger-h">
              <h2 id="danger-h" className="section-title">
                Delete account
              </h2>
              <p className="muted">Permanently remove your account and everything you uploaded.</p>
              <button type="button" className="btn btn-danger" onClick={deleteAccount}>
                Delete my account
              </button>
            </section>
          )}
        </div>
      </div>
    </>
  );
}
