import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { Eye, EyeOff, GraduationCap, ArrowLeft, BookOpen, Users, Award } from 'lucide-react';
import logo from '@/assets/logo.png';
import { z } from 'zod';

const loginSchema = z.object({
  email: z.string().trim().email({ message: 'Invalid email address' }),
  password: z.string().min(6, { message: 'Password must be at least 6 characters' }),
});

const signupSchema = z.object({
  fullName: z.string().min(2, { message: 'Name must be at least 2 characters' }),
  email: z.string().trim().email({ message: 'Invalid email address' }),
  password: z.string().min(6, { message: 'Password must be at least 6 characters' }),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

const Login = () => {
  const { user, signIn, signUp, loading } = useAuth();
  const navigate = useNavigate();
  
  // Login state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
  
  // Signup state
  const [signupData, setSignupData] = useState({
    fullName: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [signupErrors, setSignupErrors] = useState<{ fullName?: string; email?: string; password?: string; confirmPassword?: string }>({});
  const [showSignupPassword, setShowSignupPassword] = useState(false);
  const [isSigningUp, setIsSigningUp] = useState(false);
  const [activeTab, setActiveTab] = useState('login');

  useEffect(() => {
    if (!loading && user) {
      navigate('/lms/dashboard');
    }
  }, [user, loading, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    const validation = loginSchema.safeParse({ email, password });
    if (!validation.success) {
      const fieldErrors: { email?: string; password?: string } = {};
      validation.error.errors.forEach((err) => {
        if (err.path[0] === 'email') fieldErrors.email = err.message;
        if (err.path[0] === 'password') fieldErrors.password = err.message;
      });
      setErrors(fieldErrors);
      return;
    }

    setIsSubmitting(true);

    const { error } = await signIn(email, password);

    if (error) {
      toast.error(error.message || 'Failed to sign in');
      setIsSubmitting(false);
      return;
    }

    toast.success('Welcome back!');
    navigate('/lms/dashboard');
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setSignupErrors({});

    const validation = signupSchema.safeParse(signupData);
    if (!validation.success) {
      const fieldErrors: { fullName?: string; email?: string; password?: string; confirmPassword?: string } = {};
      validation.error.errors.forEach((err) => {
        const field = err.path[0] as keyof typeof fieldErrors;
        fieldErrors[field] = err.message;
      });
      setSignupErrors(fieldErrors);
      return;
    }

    setIsSigningUp(true);

    const { error } = await signUp(signupData.email, signupData.password, signupData.fullName);

    if (error) {
      toast.error(error.message || 'Failed to create account');
      setIsSigningUp(false);
      return;
    }

    toast.success('Account created! Please check your email to verify your account.');
    setSignupData({ fullName: '', email: '', password: '', confirmPassword: '' });
    setActiveTab('login');
    setIsSigningUp(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col lg:flex-row">
      {/* Left Side - Branding */}
      <div className="lg:flex-1 bg-gradient-to-br from-primary to-primary/80 text-primary-foreground p-6 lg:p-12 flex flex-col">
        <Link to="/" className="flex items-center gap-2 text-primary-foreground/80 hover:text-primary-foreground mb-6 lg:mb-8">
          <ArrowLeft className="h-4 w-4" />
          Back to website
        </Link>
        
        <div className="flex-1 flex flex-col justify-center max-w-md mx-auto lg:mx-0">
          <div className="flex items-center gap-3 mb-6 lg:mb-8">
            <img src={logo} alt="Logo" className="h-12 lg:h-16 w-auto" />
          </div>
          <h1 className="text-2xl lg:text-4xl font-bold mb-4">
            Learning Management System
          </h1>
          <p className="text-primary-foreground/80 text-base lg:text-lg">
            Access your courses, track your progress, and achieve your learning goals. 
            Sign in to continue your educational journey.
          </p>
          <div className="mt-6 lg:mt-8 grid grid-cols-3 gap-3 lg:gap-4">
            <div className="bg-primary-foreground/10 rounded-lg p-3 lg:p-4 text-center">
              <GraduationCap className="h-6 lg:h-8 w-6 lg:w-8 mx-auto mb-2" />
              <p className="font-semibold text-xs lg:text-sm">Expert Instructors</p>
            </div>
            <div className="bg-primary-foreground/10 rounded-lg p-3 lg:p-4 text-center">
              <BookOpen className="h-6 lg:h-8 w-6 lg:w-8 mx-auto mb-2" />
              <p className="font-semibold text-xs lg:text-sm">Quality Content</p>
            </div>
            <div className="bg-primary-foreground/10 rounded-lg p-3 lg:p-4 text-center">
              <Award className="h-6 lg:h-8 w-6 lg:w-8 mx-auto mb-2" />
              <p className="font-semibold text-xs lg:text-sm">Certificates</p>
            </div>
          </div>
        </div>
      </div>

      {/* Right Side - Login/Signup Form */}
      <div className="lg:flex-1 flex items-center justify-center p-6 lg:p-8 bg-background">
        <Card className="w-full max-w-md border-0 shadow-lg">
          <CardHeader className="text-center pb-4">
            <CardTitle className="text-xl lg:text-2xl">Welcome</CardTitle>
            <CardDescription className="text-sm">
              Access the Learning Management System
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-2 mb-4">
                <TabsTrigger value="login">Sign In</TabsTrigger>
                <TabsTrigger value="signup">Staff Sign Up</TabsTrigger>
              </TabsList>
              
              <TabsContent value="login">
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="Enter your email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      className={errors.email ? 'border-destructive' : ''}
                    />
                    {errors.email && (
                      <p className="text-sm text-destructive">{errors.email}</p>
                    )}
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="password">Password</Label>
                    <div className="relative">
                      <Input
                        id="password"
                        type={showPassword ? 'text' : 'password'}
                        placeholder="Enter your password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        className={errors.password ? 'border-destructive pr-10' : 'pr-10'}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="absolute right-0 top-0 h-full"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                    {errors.password && (
                      <p className="text-sm text-destructive">{errors.password}</p>
                    )}
                  </div>

                  <Button 
                    type="submit" 
                    className="w-full" 
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? 'Signing in...' : 'Sign In'}
                  </Button>
                </form>

                <div className="mt-4 p-3 bg-muted/50 rounded-lg">
                  <p className="text-xs text-muted-foreground text-center">
                    <strong>Students:</strong> Use the credentials sent to your email when you were enrolled.
                  </p>
                </div>
              </TabsContent>
              
              <TabsContent value="signup">
                <form onSubmit={handleSignup} className="space-y-4">
                  <div className="p-3 bg-blue-50 dark:bg-blue-950/30 rounded-lg mb-4">
                    <p className="text-xs text-blue-700 dark:text-blue-300 flex items-center gap-2">
                      <Users className="h-4 w-4 flex-shrink-0" />
                      <span><strong>For Instructors & Staff only.</strong> Students are enrolled by administrators.</span>
                    </p>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="fullName">Full Name</Label>
                    <Input
                      id="fullName"
                      type="text"
                      placeholder="Enter your full name"
                      value={signupData.fullName}
                      onChange={(e) => setSignupData({ ...signupData, fullName: e.target.value })}
                      required
                      className={signupErrors.fullName ? 'border-destructive' : ''}
                    />
                    {signupErrors.fullName && (
                      <p className="text-sm text-destructive">{signupErrors.fullName}</p>
                    )}
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="signupEmail">Email</Label>
                    <Input
                      id="signupEmail"
                      type="email"
                      placeholder="Enter your email"
                      value={signupData.email}
                      onChange={(e) => setSignupData({ ...signupData, email: e.target.value })}
                      required
                      className={signupErrors.email ? 'border-destructive' : ''}
                    />
                    {signupErrors.email && (
                      <p className="text-sm text-destructive">{signupErrors.email}</p>
                    )}
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="signupPassword">Password</Label>
                    <div className="relative">
                      <Input
                        id="signupPassword"
                        type={showSignupPassword ? 'text' : 'password'}
                        placeholder="Create a password"
                        value={signupData.password}
                        onChange={(e) => setSignupData({ ...signupData, password: e.target.value })}
                        required
                        className={signupErrors.password ? 'border-destructive pr-10' : 'pr-10'}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="absolute right-0 top-0 h-full"
                        onClick={() => setShowSignupPassword(!showSignupPassword)}
                      >
                        {showSignupPassword ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                    {signupErrors.password && (
                      <p className="text-sm text-destructive">{signupErrors.password}</p>
                    )}
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword">Confirm Password</Label>
                    <Input
                      id="confirmPassword"
                      type="password"
                      placeholder="Confirm your password"
                      value={signupData.confirmPassword}
                      onChange={(e) => setSignupData({ ...signupData, confirmPassword: e.target.value })}
                      required
                      className={signupErrors.confirmPassword ? 'border-destructive' : ''}
                    />
                    {signupErrors.confirmPassword && (
                      <p className="text-sm text-destructive">{signupErrors.confirmPassword}</p>
                    )}
                  </div>

                  <Button 
                    type="submit" 
                    className="w-full" 
                    disabled={isSigningUp}
                  >
                    {isSigningUp ? 'Creating account...' : 'Create Staff Account'}
                  </Button>
                </form>

                <p className="text-center text-xs text-muted-foreground mt-4">
                  Your account will need admin approval for role assignment.
                </p>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Login;
