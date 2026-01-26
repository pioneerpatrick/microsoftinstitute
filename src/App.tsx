import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Admin from "./pages/Admin";
import NotFound from "./pages/NotFound";

// LMS Pages
import LMSLogin from "./pages/lms/Login";
import LMSDashboard from "./pages/lms/Dashboard";
import MyCourses from "./pages/lms/MyCourses";
import CourseCatalog from "./pages/lms/CourseCatalog";
import CourseView from "./pages/lms/CourseView";
import Certificates from "./pages/lms/Certificates";
import LiveSessions from "./pages/lms/LiveSessions";
import Forums from "./pages/lms/Forums";
import ForumTopic from "./pages/lms/ForumTopic";
import Assignments from "./pages/lms/Assignments";
import Messages from "./pages/lms/Messages";
import GoogleMeetRedirect from "./pages/lms/GoogleMeetRedirect";
import ProfilePage from "./pages/lms/Profile";

// Instructor Pages
import InstructorDashboard from "./pages/lms/instructor/InstructorDashboard";
import ManageCourses from "./pages/lms/instructor/ManageCourses";
import CourseEditor from "./pages/lms/instructor/CourseEditor";
import ManageStudents from "./pages/lms/instructor/ManageStudents";
import ManageAssignments from "./pages/lms/instructor/ManageAssignments";
import ManageLiveSessions from "./pages/lms/instructor/ManageLiveSessions";
import ManageExams from "./pages/lms/instructor/ManageExams";
import Reports from "./pages/lms/instructor/Reports";
import AttendanceReports from "./pages/lms/instructor/AttendanceReports";
import Grades from "./pages/lms/Grades";

// Admin Pages
import FeeStructures from "./pages/lms/admin/FeeStructures";
import Accounting from "./pages/lms/admin/Accounting";
import ManageAllStudents from "./pages/lms/admin/ManageAllStudents";
import StaffManagement from "./pages/lms/admin/StaffManagement";
import AdminSettings from "./pages/lms/admin/Settings";
import MasterStudents from "./pages/lms/admin/MasterStudents";
import MasterStaff from "./pages/lms/admin/MasterStaff";
import AdminReports from "./pages/lms/admin/AdminReports";

// Instructor Pages (continued)
import Attendance from "./pages/lms/instructor/Attendance";
import SubmitReport from "./pages/lms/instructor/SubmitReport";

// Student Pages
import StudentFees from "./pages/lms/StudentFees";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/admin" element={<Admin />} />
            
            {/* LMS Routes */}
            <Route path="/lms/login" element={<LMSLogin />} />
            <Route path="/lms/dashboard" element={<LMSDashboard />} />
            <Route path="/lms/courses" element={<MyCourses />} />
            <Route path="/lms/catalog" element={<CourseCatalog />} />
            <Route path="/lms/courses/:courseId" element={<CourseView />} />
            <Route path="/lms/certificates" element={<Certificates />} />
            <Route path="/lms/live-sessions" element={<LiveSessions />} />
            <Route path="/lms/forums" element={<Forums />} />
            <Route path="/lms/forums/:topicId" element={<ForumTopic />} />
            <Route path="/lms/assignments" element={<Assignments />} />
            <Route path="/lms/messages" element={<Messages />} />
            <Route path="/lms/meet/:sessionId" element={<GoogleMeetRedirect />} />
            <Route path="/lms/profile" element={<ProfilePage />} />
            
            {/* Student Grades & Fees */}
            <Route path="/lms/grades" element={<Grades />} />
            <Route path="/lms/fees" element={<StudentFees />} />
            
            {/* Instructor Routes */}
            <Route path="/lms/instructor" element={<InstructorDashboard />} />
            <Route path="/lms/instructor/courses" element={<ManageCourses />} />
            <Route path="/lms/instructor/courses/:courseId" element={<CourseEditor />} />
            <Route path="/lms/instructor/students" element={<ManageStudents />} />
            <Route path="/lms/instructor/assignments" element={<ManageAssignments />} />
            <Route path="/lms/instructor/live-sessions" element={<ManageLiveSessions />} />
            <Route path="/lms/instructor/exams" element={<ManageExams />} />
            <Route path="/lms/instructor/reports" element={<Reports />} />
            <Route path="/lms/instructor/attendance" element={<Attendance />} />
            <Route path="/lms/instructor/attendance-reports" element={<AttendanceReports />} />
            <Route path="/lms/instructor/submit-report" element={<SubmitReport />} />
            
            {/* Admin Routes */}
            <Route path="/lms/admin/fees" element={<FeeStructures />} />
            <Route path="/lms/admin/accounting" element={<Accounting />} />
            <Route path="/lms/admin/students" element={<ManageAllStudents />} />
            <Route path="/lms/admin/staff" element={<StaffManagement />} />
            <Route path="/lms/admin/settings" element={<AdminSettings />} />
            <Route path="/lms/admin/master-students" element={<MasterStudents />} />
            <Route path="/lms/admin/all-staff" element={<MasterStaff />} />
            <Route path="/lms/admin/reports" element={<AdminReports />} />
            
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
