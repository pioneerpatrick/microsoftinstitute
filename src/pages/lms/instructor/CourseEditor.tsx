import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { ChevronLeft, Plus, Save, Trash2, GripVertical } from 'lucide-react';
import { toast } from 'sonner';
import LMSLayout from '@/components/lms/LMSLayout';

interface Course {
  id: string;
  title: string;
  description: string | null;
  thumbnail_url: string | null;
  category: string | null;
  difficulty_level: string | null;
  duration_hours: number | null;
  is_published: boolean;
}

interface Module {
  id: string;
  title: string;
  description: string | null;
  order_index: number;
  lessons: Lesson[];
}

interface Lesson {
  id: string;
  title: string;
  content: string | null;
  video_url: string | null;
  duration_minutes: number | null;
  order_index: number;
  is_preview: boolean;
}

const CourseEditor = () => {
  const { courseId } = useParams();
  const isNew = courseId === 'new';
  const { user, loading, isStaff } = useAuth();
  const navigate = useNavigate();
  
  const [course, setCourse] = useState<Course>({
    id: '',
    title: '',
    description: '',
    thumbnail_url: '',
    category: '',
    difficulty_level: 'beginner',
    duration_hours: null,
    is_published: false,
  });
  const [modules, setModules] = useState<Module[]>([]);
  const [isLoading, setIsLoading] = useState(!isNew);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      navigate('/lms/login');
    } else if (!loading && user && !isStaff) {
      navigate('/lms/dashboard');
    }
  }, [user, loading, isStaff, navigate]);

  useEffect(() => {
    if (user && isStaff && !isNew && courseId) {
      fetchCourse();
    }
  }, [user, isStaff, courseId, isNew]);

  const fetchCourse = async () => {
    if (!courseId) return;

    const { data: courseData, error: courseError } = await supabase
      .from('courses')
      .select('*')
      .eq('id', courseId)
      .single();

    if (courseError) {
      toast.error('Course not found');
      navigate('/lms/instructor/courses');
      return;
    }

    setCourse(courseData);

    // Fetch modules with lessons
    const { data: modulesData } = await supabase
      .from('course_modules')
      .select(`
        id,
        title,
        description,
        order_index,
        lessons (
          id,
          title,
          content,
          video_url,
          duration_minutes,
          order_index,
          is_preview
        )
      `)
      .eq('course_id', courseId)
      .order('order_index');

    if (modulesData) {
      const sortedModules = modulesData.map(m => ({
        ...m,
        lessons: (m.lessons || []).sort((a, b) => a.order_index - b.order_index)
      }));
      setModules(sortedModules);
    }

    setIsLoading(false);
  };

  const saveCourse = async () => {
    if (!course.title) {
      toast.error('Course title is required');
      return;
    }

    setIsSaving(true);

    try {
      if (isNew) {
        const { data, error } = await supabase
          .from('courses')
          .insert({
            title: course.title,
            description: course.description,
            thumbnail_url: course.thumbnail_url,
            category: course.category,
            difficulty_level: course.difficulty_level,
            duration_hours: course.duration_hours,
            is_published: course.is_published,
            instructor_id: user?.id,
          })
          .select()
          .single();

        if (error) throw error;
        toast.success('Course created');
        navigate(`/lms/instructor/courses/${data.id}`);
      } else {
        const { error } = await supabase
          .from('courses')
          .update({
            title: course.title,
            description: course.description,
            thumbnail_url: course.thumbnail_url,
            category: course.category,
            difficulty_level: course.difficulty_level,
            duration_hours: course.duration_hours,
            is_published: course.is_published,
          })
          .eq('id', courseId);

        if (error) throw error;
        toast.success('Course saved');
      }
    } catch (error) {
      toast.error('Failed to save course');
    }

    setIsSaving(false);
  };

  const addModule = async () => {
    if (!courseId || isNew) {
      toast.error('Save the course first');
      return;
    }

    const { data, error } = await supabase
      .from('course_modules')
      .insert({
        course_id: courseId,
        title: 'New Module',
        order_index: modules.length,
      })
      .select()
      .single();

    if (!error && data) {
      setModules([...modules, { ...data, lessons: [] }]);
      toast.success('Module added');
    }
  };

  const updateModule = async (moduleId: string, updates: Partial<Module>) => {
    const { error } = await supabase
      .from('course_modules')
      .update(updates)
      .eq('id', moduleId);

    if (!error) {
      setModules(modules.map(m => m.id === moduleId ? { ...m, ...updates } : m));
    }
  };

  const deleteModule = async (moduleId: string) => {
    if (!confirm('Delete this module and all its lessons?')) return;

    const { error } = await supabase
      .from('course_modules')
      .delete()
      .eq('id', moduleId);

    if (!error) {
      setModules(modules.filter(m => m.id !== moduleId));
      toast.success('Module deleted');
    }
  };

  const addLesson = async (moduleId: string) => {
    const module = modules.find(m => m.id === moduleId);
    if (!module) return;

    const { data, error } = await supabase
      .from('lessons')
      .insert({
        module_id: moduleId,
        title: 'New Lesson',
        order_index: module.lessons.length,
      })
      .select()
      .single();

    if (!error && data) {
      setModules(modules.map(m => 
        m.id === moduleId 
          ? { ...m, lessons: [...m.lessons, data] }
          : m
      ));
      toast.success('Lesson added');
    }
  };

  const updateLesson = async (lessonId: string, moduleId: string, updates: Partial<Lesson>) => {
    const { error } = await supabase
      .from('lessons')
      .update(updates)
      .eq('id', lessonId);

    if (!error) {
      setModules(modules.map(m => 
        m.id === moduleId 
          ? { ...m, lessons: m.lessons.map(l => l.id === lessonId ? { ...l, ...updates } : l) }
          : m
      ));
    }
  };

  const deleteLesson = async (lessonId: string, moduleId: string) => {
    if (!confirm('Delete this lesson?')) return;

    const { error } = await supabase
      .from('lessons')
      .delete()
      .eq('id', lessonId);

    if (!error) {
      setModules(modules.map(m => 
        m.id === moduleId 
          ? { ...m, lessons: m.lessons.filter(l => l.id !== lessonId) }
          : m
      ));
      toast.success('Lesson deleted');
    }
  };

  if (loading || isLoading) {
    return (
      <LMSLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      </LMSLayout>
    );
  }

  return (
    <LMSLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate('/lms/instructor/courses')}>
              <ChevronLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold">
                {isNew ? 'Create Course' : 'Edit Course'}
              </h1>
              <p className="text-muted-foreground">{course.title || 'Untitled course'}</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Switch
                checked={course.is_published}
                onCheckedChange={(checked) => setCourse({ ...course, is_published: checked })}
              />
              <Label>{course.is_published ? 'Published' : 'Draft'}</Label>
            </div>
            <Button onClick={saveCourse} disabled={isSaving}>
              <Save className="h-4 w-4 mr-2" />
              {isSaving ? 'Saving...' : 'Save'}
            </Button>
          </div>
        </div>

        <Tabs defaultValue="details" className="space-y-6">
          <TabsList>
            <TabsTrigger value="details">Course Details</TabsTrigger>
            <TabsTrigger value="content" disabled={isNew}>Content</TabsTrigger>
          </TabsList>

          <TabsContent value="details">
            <Card>
              <CardHeader>
                <CardTitle>Course Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Title *</Label>
                    <Input
                      value={course.title}
                      onChange={(e) => setCourse({ ...course, title: e.target.value })}
                      placeholder="Enter course title"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Category</Label>
                    <Input
                      value={course.category || ''}
                      onChange={(e) => setCourse({ ...course, category: e.target.value })}
                      placeholder="e.g., Web Development"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Difficulty Level</Label>
                    <Select
                      value={course.difficulty_level || ''}
                      onValueChange={(value) => setCourse({ ...course, difficulty_level: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select level" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="beginner">Beginner</SelectItem>
                        <SelectItem value="intermediate">Intermediate</SelectItem>
                        <SelectItem value="advanced">Advanced</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Duration (hours)</Label>
                    <Input
                      type="number"
                      value={course.duration_hours || ''}
                      onChange={(e) => setCourse({ ...course, duration_hours: parseInt(e.target.value) || null })}
                      placeholder="e.g., 10"
                    />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <Label>Thumbnail URL</Label>
                    <Input
                      value={course.thumbnail_url || ''}
                      onChange={(e) => setCourse({ ...course, thumbnail_url: e.target.value })}
                      placeholder="https://example.com/image.jpg"
                    />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <Label>Description</Label>
                    <Textarea
                      value={course.description || ''}
                      onChange={(e) => setCourse({ ...course, description: e.target.value })}
                      placeholder="Describe your course..."
                      rows={5}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="content">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Course Content</CardTitle>
                <Button onClick={addModule}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Module
                </Button>
              </CardHeader>
              <CardContent>
                {modules.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-muted-foreground mb-4">No modules yet. Add your first module to get started.</p>
                    <Button onClick={addModule}>
                      <Plus className="h-4 w-4 mr-2" />
                      Add Module
                    </Button>
                  </div>
                ) : (
                  <Accordion type="multiple" className="space-y-4">
                    {modules.map((module, moduleIndex) => (
                      <AccordionItem key={module.id} value={module.id} className="border rounded-lg">
                        <AccordionTrigger className="px-4 hover:no-underline">
                          <div className="flex items-center gap-3 flex-1">
                            <GripVertical className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm text-muted-foreground">Module {moduleIndex + 1}</span>
                            <Input
                              value={module.title}
                              onChange={(e) => updateModule(module.id, { title: e.target.value })}
                              onClick={(e) => e.stopPropagation()}
                              className="max-w-xs"
                            />
                          </div>
                        </AccordionTrigger>
                        <AccordionContent className="px-4 pb-4">
                          <div className="space-y-4">
                            <Textarea
                              value={module.description || ''}
                              onChange={(e) => updateModule(module.id, { description: e.target.value })}
                              placeholder="Module description..."
                              rows={2}
                            />
                            
                            <div className="space-y-2">
                              <div className="flex items-center justify-between">
                                <Label className="text-sm font-medium">Lessons</Label>
                                <Button size="sm" variant="outline" onClick={() => addLesson(module.id)}>
                                  <Plus className="h-3 w-3 mr-1" />
                                  Add Lesson
                                </Button>
                              </div>
                              
                              {module.lessons.map((lesson, lessonIndex) => (
                                <Card key={lesson.id} className="p-4">
                                  <div className="space-y-3">
                                    <div className="flex items-center gap-2">
                                      <span className="text-xs text-muted-foreground">{lessonIndex + 1}.</span>
                                      <Input
                                        value={lesson.title}
                                        onChange={(e) => updateLesson(lesson.id, module.id, { title: e.target.value })}
                                        placeholder="Lesson title"
                                        className="flex-1"
                                      />
                                      <Button
                                        size="icon"
                                        variant="ghost"
                                        className="text-destructive"
                                        onClick={() => deleteLesson(lesson.id, module.id)}
                                      >
                                        <Trash2 className="h-4 w-4" />
                                      </Button>
                                    </div>
                                    <div className="grid grid-cols-2 gap-2">
                                      <Input
                                        value={lesson.video_url || ''}
                                        onChange={(e) => updateLesson(lesson.id, module.id, { video_url: e.target.value })}
                                        placeholder="Video URL"
                                      />
                                      <Input
                                        type="number"
                                        value={lesson.duration_minutes || ''}
                                        onChange={(e) => updateLesson(lesson.id, module.id, { duration_minutes: parseInt(e.target.value) || null })}
                                        placeholder="Duration (min)"
                                      />
                                    </div>
                                    <Textarea
                                      value={lesson.content || ''}
                                      onChange={(e) => updateLesson(lesson.id, module.id, { content: e.target.value })}
                                      placeholder="Lesson content..."
                                      rows={3}
                                    />
                                    <div className="flex items-center gap-2">
                                      <Switch
                                        checked={lesson.is_preview}
                                        onCheckedChange={(checked) => updateLesson(lesson.id, module.id, { is_preview: checked })}
                                      />
                                      <Label className="text-sm">Free preview</Label>
                                    </div>
                                  </div>
                                </Card>
                              ))}
                            </div>

                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => deleteModule(module.id)}
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete Module
                            </Button>
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                    ))}
                  </Accordion>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </LMSLayout>
  );
};

export default CourseEditor;
