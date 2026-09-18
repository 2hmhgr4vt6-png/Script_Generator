import {
  FileText, FolderClock, LayoutDashboard, Lightbulb, MessageCircleQuestion, Search, Settings, type LucideIcon,
} from 'lucide-react'

export interface NavItem {
  href: string
  label: string
  icon: LucideIcon
  /** Also highlight the item for these path prefixes. */
  match?: string[]
}

export const NAV_ITEMS: NavItem[] = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/ideas', label: 'New Idea', icon: Lightbulb, match: ['/ideas'] },
  { href: '/problems', label: 'Problem Discovery', icon: MessageCircleQuestion, match: ['/problems'] },
  { href: '/research', label: 'Research', icon: Search, match: ['/research'] },
  { href: '/script/new', label: 'Script Studio', icon: FileText, match: ['/script'] },
  { href: '/scripts', label: 'Script History', icon: FolderClock, match: ['/scripts', '/history'] },
  { href: '/settings', label: 'Settings', icon: Settings, match: ['/settings'] },
]

export const PAGE_TITLES: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/ideas': 'New Idea',
  '/problems': 'Audience Problems',
  '/research': 'Research',
  '/script/new': 'Script Studio',
  '/scripts': 'Script History',
  '/history': 'History',
  '/settings': 'Settings',
  '/privacy': 'Privacy',
}

export function titleFor(pathname: string): string {
  if (PAGE_TITLES[pathname]) return PAGE_TITLES[pathname]
  if (pathname.startsWith('/scripts/')) return 'Script Studio'
  if (pathname.startsWith('/problems/')) return 'Problem Detail'
  if (pathname.startsWith('/research/')) return 'Research Session'
  return 'Bhasika AI Content Studio'
}
