import { Route, Routes } from 'react-router-dom';
import AppShell from '../components/layout/AppShell.jsx';
import RequireAuth from '../components/layout/RequireAuth.jsx';
import { UnsavedProvider } from '../hooks/useUnsavedChanges.jsx';
import HomePage from '../features/home/HomePage.jsx';
import LoginPage from '../features/auth/LoginPage.jsx';
import RegisterPage from '../features/auth/RegisterPage.jsx';
import ForgotPasswordPage from '../features/auth/ForgotPasswordPage.jsx';
import StudentDashboard from '../features/dashboard/StudentDashboard.jsx';
import AdminDashboard from '../features/dashboard/AdminDashboard.jsx';
import NotesCollectionPage from '../features/notes/NotesCollectionPage.jsx';
import NoteEditorPage from '../features/notes/NoteEditorPage.jsx';
import NoteDetailPage from '../features/notes/NoteDetailPage.jsx';
import DownloadsPage from '../features/notes/DownloadsPage.jsx';
import MyCommentsPage from '../features/comments/MyCommentsPage.jsx';
import AdminCommentsPage from '../features/comments/AdminCommentsPage.jsx';
import NotificationsPage from '../features/notifications/NotificationsPage.jsx';
import ProfilePage from '../features/profile/ProfilePage.jsx';
import SettingsPage from '../features/settings/SettingsPage.jsx';
import AdminUsersPage from '../features/admin/AdminUsersPage.jsx';
import AdminDownloadsPage from '../features/admin/AdminDownloadsPage.jsx';
import NotFoundPage from '../features/NotFoundPage.jsx';

// All routes live here. Must be rendered inside a Router.
export default function AppRoutes() {
  return (
    <UnsavedProvider>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />

        <Route
          path="/app"
          element={
            <RequireAuth role="user">
              <AppShell role="user" />
            </RequireAuth>
          }
        >
          <Route index element={<StudentDashboard />} />
          <Route path="explore" element={<NotesCollectionPage source="explore" />} />
          <Route path="notes/new" element={<NoteEditorPage mode="create" />} />
          <Route path="notes/:id" element={<NoteDetailPage />} />
          <Route path="notes/:id/edit" element={<NoteEditorPage mode="edit" />} />
          <Route path="my-notes" element={<NotesCollectionPage source="mine" />} />
          <Route path="favorites" element={<NotesCollectionPage source="favorites" />} />
          <Route path="archive" element={<NotesCollectionPage source="archive" />} />
          <Route path="downloads" element={<DownloadsPage />} />
          <Route path="comments" element={<MyCommentsPage />} />
          <Route path="notifications" element={<NotificationsPage />} />
          <Route path="profile" element={<ProfilePage />} />
          <Route path="settings" element={<SettingsPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Route>

        <Route
          path="/admin"
          element={
            <RequireAuth role="admin">
              <AppShell role="admin" />
            </RequireAuth>
          }
        >
          <Route index element={<AdminDashboard />} />
          <Route path="notes" element={<NotesCollectionPage source="admin" />} />
          <Route path="notes/:id" element={<NoteDetailPage />} />
          <Route path="notes/:id/edit" element={<NoteEditorPage mode="edit" />} />
          <Route path="comments" element={<AdminCommentsPage />} />
          <Route path="downloads" element={<AdminDownloadsPage />} />
          <Route path="users" element={<AdminUsersPage />} />
          <Route path="settings" element={<SettingsPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Route>

        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </UnsavedProvider>
  );
}
