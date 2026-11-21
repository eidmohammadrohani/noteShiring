import {
  Archive,
  Bell,
  Bookmark,
  Compass,
  Download,
  FolderOpen,
  LayoutDashboard,
  MessageSquare,
  Settings,
  Upload,
  User,
  Users,
} from 'lucide-react';

// Sidebar entries per role. `end` makes the link active only on an exact match.
export const USER_NAV = [
  { to: '/app', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/app/explore', label: 'Explore Notes', icon: Compass },
  { to: '/app/notes/new', label: 'Upload Note', icon: Upload },
  { to: '/app/my-notes', label: 'My Notes', icon: FolderOpen },
  { to: '/app/favorites', label: 'Favorites', icon: Bookmark },
  { to: '/app/archive', label: 'Archive', icon: Archive },
  { to: '/app/downloads', label: 'Downloads', icon: Download },
  { to: '/app/comments', label: 'Comments', icon: MessageSquare },
  { to: '/app/notifications', label: 'Notifications', icon: Bell, badge: 'unread' },
  { divider: true },
  { to: '/app/profile', label: 'My Profile', icon: User },
  { to: '/app/settings', label: 'Settings', icon: Settings },
];

export const ADMIN_NAV = [
  { to: '/admin', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { label: 'Content', section: true },
  { to: '/admin/notes', label: 'Notes', icon: FolderOpen },
  { to: '/admin/comments', label: 'Comments', icon: MessageSquare },
  { to: '/admin/downloads', label: 'Downloads', icon: Download },
  { label: 'People', section: true },
  { to: '/admin/users', label: 'Users', icon: Users },
  { label: 'System', section: true },
  { to: '/admin/settings', label: 'Settings', icon: Settings },
];
