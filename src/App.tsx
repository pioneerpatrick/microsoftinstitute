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
import CourseView from "./pages/lms/CourseView";
import Certificates from "./pages/lms/Certificates";
import LiveSessions from "./pages/lms/LiveSessions";
import Forums from "./pages/lms/Forums";
import ForumTopic from "./pages/lms/ForumTopic";

// Instructor Pages
import InstructorDashboard from "./pages/lms/instructor/InstructorDashboard";
import ManageCourses from "./pages/lms/instructor/ManageCourses";
import CourseEditor from "./pages/lms/instructor/CourseEditor";
import ManageStudents from "./pages/lms/instructor/ManageStudents";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/admin" element={<Admin />} />
            
            {/* LMS Routes */}
            <Route path="/lms/login" element={<LMSLogin />} />
            <Route path="/lms/dashboard" element={<LMSDashboard />} />
            <Route path="/lms/courses" element={<MyCourses />} />
            <Route path="/lms/courses/:courseId" element={<CourseView />} />
            <Route path="/lms/certificates" element={<Certificates />} />
            <Route path="/lms/live-sessions" element={<LiveSessions />} />
            <Route path="/lms/forums" element={<Forums />} />
            <Route path="/lms/forums/:topicId" element={<ForumTopic />} />
            
            {/* Instructor Routes */}
            <Route path="/lms/instructor" element={<InstructorDashboard />} />
            <Route path="/lms/instructor/courses" element={<ManageCourses />} />
            <Route path="/lms/instructor/courses/:courseId" element={<CourseEditor />} />
            <Route path="/lms/instructor/students" element={<ManageStudents />} />
            
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
