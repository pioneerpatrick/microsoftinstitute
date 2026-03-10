import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { lazy, Suspense } from "react";

// Eager load the landing page for fast initial render
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";

// Lazy load all other pages
const Auth = lazy(() => import("./pages/Auth"));
const Admin = lazy(() => import("./pages/Admin"));
const Scholarships = lazy(() => import("./pages/Scholarships"));
const Verify = lazy(() => import("./pages/Verify"));

// LMS Pages
const LMSLogin = lazy(() => import("./pages/lms/Login"));
const LMSDashboard = lazy(() => import("./pages/lms/Dashboard"));
const MyCourses = lazy(() => import("./pages/lms/MyCourses"));
const CourseCatalog = lazy(() => import("./pages/lms/CourseCatalog"));
const CourseView = lazy(() => import("./pages/lms/CourseView"));
const Certificates = lazy(() => import("./pages/lms/Certificates"));
const LiveSessions = lazy(() => import("./pages/lms/LiveSessions"));
const Forums = lazy(() => import("./pages/lms/Forums"));
const ForumTopic = lazy(() => import("./pages/lms/ForumTopic"));
const Assignments = lazy(() => import("./pages/lms/Assignments"));
const Messages = lazy(() => import("./pages/lms/Messages"));
const LiveSessionRoom = lazy(() => import("./pages/lms/LiveSessionRoom"));
const ProfilePage = lazy(() => import("./pages/lms/Profile"));
const CodingLab = lazy(() => import("./pages/lms/CodingLab"));
const Grades = lazy(() => import("./pages/lms/Grades"));
const StudentFees = lazy(() => import("./pages/lms/StudentFees"));

// Instructor Pages
const InstructorDashboard = lazy(() => import("./pages/lms/instructor/InstructorDashboard"));
const ManageCourses = lazy(() => import("./pages/lms/instructor/ManageCourses"));
const CourseEditor = lazy(() => import("./pages/lms/instructor/CourseEditor"));
const ManageStudents = lazy(() => import("./pages/lms/instructor/ManageStudents"));
const ManageAssignments = lazy(() => import("./pages/lms/instructor/ManageAssignments"));
const GradeSubmission = lazy(() => import("./pages/lms/instructor/GradeSubmission"));
const ManageLiveSessions = lazy(() => import("./pages/lms/instructor/ManageLiveSessions"));
const ManageExams = lazy(() => import("./pages/lms/instructor/ManageExams"));
const Reports = lazy(() => import("./pages/lms/instructor/Reports"));
const AttendanceReports = lazy(() => import("./pages/lms/instructor/AttendanceReports"));
const Attendance = lazy(() => import("./pages/lms/instructor/Attendance"));
const SubmitReport = lazy(() => import("./pages/lms/instructor/SubmitReport"));

// Admin Pages
const FeeStructures = lazy(() => import("./pages/lms/admin/FeeStructures"));
const Accounting = lazy(() => import("./pages/lms/admin/Accounting"));
const ManageAllStudents = lazy(() => import("./pages/lms/admin/ManageAllStudents"));
const StaffManagement = lazy(() => import("./pages/lms/admin/StaffManagement"));
const AdminSettings = lazy(() => import("./pages/lms/admin/Settings"));
const MasterStudents = lazy(() => import("./pages/lms/admin/MasterStudents"));
const MasterStaff = lazy(() => import("./pages/lms/admin/MasterStaff"));
const AdminReports = lazy(() => import("./pages/lms/admin/AdminReports"));
const CertificateManagement = lazy(() => import("./pages/lms/admin/CertificateManagement"));

const queryClient = new QueryClient();

const LoadingFallback = () => (
  <div className="min-h-screen flex items-center justify-center bg-background">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
  </div>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Suspense fallback={<LoadingFallback />}>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/auth" element={<Auth />} />
              <Route path="/admin" element={<Admin />} />
              <Route path="/scholarships" element={<Scholarships />} />
              <Route path="/verify" element={<Verify />} />
              
              {/* LMS Routes */}
              <Route path="/lms/login" element={<LMSLogin />} />
              <Route path="/lms/dashboard" element={<LMSDashboard />} />
              <Route path="/lms/courses" element={<MyCourses />} />
              <Route path="/lms/my-courses" element={<MyCourses />} />
              <Route path="/lms/catalog" element={<CourseCatalog />} />
              <Route path="/lms/courses/:courseId" element={<CourseView />} />
              <Route path="/lms/course/:courseId" element={<CourseView />} />
              <Route path="/lms/certificates" element={<Certificates />} />
              <Route path="/lms/live-sessions" element={<LiveSessions />} />
              <Route path="/lms/forums" element={<Forums />} />
              <Route path="/lms/forums/:topicId" element={<ForumTopic />} />
              <Route path="/lms/assignments" element={<Assignments />} />
              <Route path="/lms/messages" element={<Messages />} />
              <Route path="/lms/meet/:sessionId" element={<LiveSessionRoom />} />
              <Route path="/lms/profile" element={<ProfilePage />} />
              <Route path="/lms/coding-lab" element={<CodingLab />} />
              <Route path="/lms/grades" element={<Grades />} />
              <Route path="/lms/fees" element={<StudentFees />} />
              
              {/* Instructor Routes */}
              <Route path="/lms/instructor" element={<InstructorDashboard />} />
              <Route path="/lms/instructor/courses" element={<ManageCourses />} />
              <Route path="/lms/instructor/courses/:courseId" element={<CourseEditor />} />
              <Route path="/lms/instructor/students" element={<ManageStudents />} />
              <Route path="/lms/instructor/assignments" element={<ManageAssignments />} />
              <Route path="/lms/instructor/grade/:submissionId" element={<GradeSubmission />} />
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
              <Route path="/lms/admin/certificates" element={<CertificateManagement />} />
              
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
