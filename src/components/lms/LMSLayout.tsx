import { ReactNode, useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from '@/components/ui/sheet';
import {
  LayoutDashboard,
  BookOpen,
  Award,
  MessageSquare,
  Calendar,
  Settings,
  LogOut,
  Menu,
  ChevronRight,
  Users,
  FileText,
  BarChart3,
  Home,
  GraduationCap,
  ClipboardList,
  TrendingUp,
  DollarSign,
  Calculator,
  Wallet,
  Code2,
} from 'lucide-react';
import logo from '@/assets/logo.png';
import { cn } from '@/lib/utils';
import NotificationBell from './NotificationBell';

interface LMSLayoutProps {
  children: ReactNode;
}

const LMSLayout = ({ children }: LMSLayoutProps) => {
  const { user, signOut, isStaff, isAdmin } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleSignOut = async () => {
    await signOut();
    navigate('/lms/login');
  };

  const studentNavItems = [
    { icon: LayoutDashboard, label: 'Dashboard', href: '/lms/dashboard' },
    { icon: GraduationCap, label: 'Course Catalog', href: '/lms/catalog' },
    { icon: BookOpen, label: 'My Courses', href: '/lms/courses' },
    { icon: FileText, label: 'Assignments', href: '/lms/assignments' },
    { icon: TrendingUp, label: 'My Grades', href: '/lms/grades' },
    { icon: Wallet, label: 'My Fees', href: '/lms/fees' },
    { icon: Award, label: 'Certificates', href: '/lms/certificates' },
    { icon: Calendar, label: 'Live Sessions', href: '/lms/live-sessions' },
    { icon: MessageSquare, label: 'Forums', href: '/lms/forums' },
    { icon: Code2, label: 'Coding Lab', href: '/lms/coding-lab' },
  ];

  const staffNavItems = [
    { icon: LayoutDashboard, label: 'Instructor Dashboard', href: '/lms/instructor' },
    { icon: BookOpen, label: 'Manage Courses', href: '/lms/instructor/courses' },
    { icon: Users, label: 'Students', href: '/lms/instructor/students' },
    { icon: FileText, label: 'Assignments', href: '/lms/instructor/assignments' },
    { icon: ClipboardList, label: 'Exams', href: '/lms/instructor/exams' },
    { icon: Calendar, label: 'Live Sessions', href: '/lms/instructor/live-sessions' },
    { icon: ClipboardList, label: 'Take Attendance', href: '/lms/instructor/attendance' },
    { icon: BarChart3, label: 'Attendance Reports', href: '/lms/instructor/attendance-reports' },
    { icon: BarChart3, label: 'Performance Reports', href: '/lms/instructor/reports' },
    { icon: FileText, label: 'Submit Reports', href: '/lms/instructor/submit-report' },
  ];

  const adminNavItems = [
    { icon: BarChart3, label: 'Admin Reports', href: '/lms/admin/reports' },
    { icon: GraduationCap, label: 'Master Students', href: '/lms/admin/master-students' },
    { icon: GraduationCap, label: 'Manage Students', href: '/lms/admin/students' },
    { icon: Users, label: 'Master Staff', href: '/lms/admin/all-staff' },
    { icon: Users, label: 'Staff Contracts', href: '/lms/admin/staff' },
    { icon: DollarSign, label: 'Fee Structures', href: '/lms/admin/fees' },
    { icon: Calculator, label: 'Accounting', href: '/lms/admin/accounting' },
    { icon: Award, label: 'Certificates', href: '/lms/admin/certificates' },
    { icon: Settings, label: 'Settings', href: '/lms/admin/settings' },
  ];

  const navItems = isStaff ? [...staffNavItems, ...studentNavItems] : studentNavItems;

  const NavContent = () => (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b">
        <Link to="/lms/dashboard" className="flex items-center gap-2">
          <img src={logo} alt="Logo" className="h-10 w-auto" />
          <div className="flex flex-col">
            <span className="font-bold text-sm leading-tight text-primary">TECHNO PANALY INSTITUTE OF TECHNOLOGY</span>
            <span className="text-xs text-muted-foreground">Learning Management System</span>
          </div>
        </Link>
      </div>

      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        {isAdmin && (
          <>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-3 py-2">
              Admin
            </p>
            {adminNavItems.map((item) => (
              <Link
                key={item.href}
                to={item.href}
                onClick={() => setSidebarOpen(false)}
                className={cn(
                  'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                  location.pathname === item.href
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                )}
              >
                <item.icon className="h-5 w-5" />
                {item.label}
              </Link>
            ))}
            <div className="my-4 border-t" />
          </>
        )}
        {isStaff && (
          <>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-3 py-2">
              Instructor
            </p>
            {staffNavItems.map((item) => (
              <Link
                key={item.href}
                to={item.href}
                onClick={() => setSidebarOpen(false)}
                className={cn(
                  'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                  location.pathname === item.href
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                )}
              >
                <item.icon className="h-5 w-5" />
                {item.label}
              </Link>
            ))}
            <div className="my-4 border-t" />
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-3 py-2">
              Student View
            </p>
          </>
        )}
        {studentNavItems.map((item) => (
          <Link
            key={item.href}
            to={item.href}
            onClick={() => setSidebarOpen(false)}
            className={cn(
              'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
              location.pathname === item.href
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted'
            )}
          >
            <item.icon className="h-5 w-5" />
            {item.label}
          </Link>
        ))}
      </nav>

      <div className="p-4 border-t">
        <Link
          to="/"
          className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
        >
          <Home className="h-5 w-5" />
          Back to Website
        </Link>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      {/* Mobile Header */}
      <header className="lg:hidden fixed top-0 left-0 right-0 z-50 bg-background border-b h-16 flex items-center px-4">
        <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon">
              <Menu className="h-6 w-6" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="p-0 w-72">
            <NavContent />
          </SheetContent>
        </Sheet>

        <div className="flex-1 flex justify-center">
          <img src={logo} alt="Logo" className="h-10 w-auto" />
        </div>

        <NotificationBell />
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="rounded-full">
              <Avatar className="h-8 w-8">
                <AvatarImage src={user?.user_metadata?.avatar_url} />
                <AvatarFallback>
                  {user?.user_metadata?.full_name?.charAt(0) || user?.email?.charAt(0) || 'U'}
                </AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>My Account</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => navigate('/lms/profile')}>
              <Settings className="h-4 w-4 mr-2" />
              Profile Settings
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleSignOut}>
              <LogOut className="h-4 w-4 mr-2" />
              Sign Out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </header>

      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex fixed left-0 top-0 bottom-0 w-64 border-r bg-background flex-col z-40">
        <NavContent />
      </aside>

      {/* Main Content */}
      <main className="lg:ml-64 pt-16 lg:pt-0 min-h-screen">
        {/* Desktop Header */}
        <header className="hidden lg:flex sticky top-0 z-30 bg-background border-b h-16 items-center justify-between px-8">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Link to="/lms/dashboard" className="hover:text-foreground">
              Dashboard
            </Link>
            {location.pathname !== '/lms/dashboard' && (
              <>
                <ChevronRight className="h-4 w-4" />
                <span className="text-foreground capitalize">
                  {location.pathname.split('/').pop()?.replace('-', ' ')}
                </span>
              </>
            )}
          </div>

          <div className="flex items-center gap-4">
            <NotificationBell />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="flex items-center gap-2">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={user?.user_metadata?.avatar_url} />
                    <AvatarFallback>
                      {user?.user_metadata?.full_name?.charAt(0) || user?.email?.charAt(0) || 'U'}
                    </AvatarFallback>
                  </Avatar>
                  <span className="hidden md:inline">
                    {user?.user_metadata?.full_name || user?.email}
                  </span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>My Account</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => navigate('/lms/profile')}>
                  <Settings className="h-4 w-4 mr-2" />
                  Profile Settings
                </DropdownMenuItem>
                {isAdmin && (
                  <DropdownMenuItem onClick={() => navigate('/admin')}>
                    <Users className="h-4 w-4 mr-2" />
                    Admin Panel
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem onClick={handleSignOut}>
                  <LogOut className="h-4 w-4 mr-2" />
                  Sign Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        <div className="p-4 lg:p-8 overflow-x-hidden">
          <div className="w-full min-w-0 overflow-hidden">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
};

export default LMSLayout;
