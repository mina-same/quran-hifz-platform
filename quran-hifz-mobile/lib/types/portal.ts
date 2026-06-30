export type PortalType = 'student' | 'teacher' | 'admin' | 'parent';

export interface NavItem {
  id: string;
  icon: string;
  label: string;
  dot?: boolean;
}

export interface NavGroup {
  group: string;
  items: NavItem[];
}

export interface PortalUser {
  name: string;
  role: string;
  initials: string;
}

export interface PortalConfig {
  badge: string;
  user: PortalUser;
  nav: NavGroup[];
}
