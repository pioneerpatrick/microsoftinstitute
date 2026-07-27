import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useEffect } from 'react';
import LMSLayout from '@/components/lms/LMSLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Play, RotateCcw, Copy, Download, Lightbulb, Code2, Terminal, Sparkles } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

const TEMPLATES: Record<string, { label: string; code: string }> = {
  python: {
    label: 'Python',
    code: `# Python - Hello World\nprint("Hello, Techno Panaly Institute of Technology!")\n\n# Variables\nname = "Student"\nage = 20\nprint(f"Name: {name}, Age: {age}")\n\n# Loop\nfor i in range(5):\n    print(f"Count: {i}")`,
  },
  javascript: {
    label: 'JavaScript',
    code: `// JavaScript - Hello World\nconsole.log("Hello, Techno Panaly Institute of Technology!");\n\n// Variables\nconst name = "Student";\nconst age = 20;\nconsole.log(\`Name: \${name}, Age: \${age}\`);\n\n// Loop\nfor (let i = 0; i < 5; i++) {\n  console.log(\`Count: \${i}\`);\n}`,
  },
  html: {
    label: 'HTML/CSS',
    code: `<!DOCTYPE html>\n<html>\n<head>\n  <style>\n    body { font-family: Arial; background: #1a1a2e; color: #eee; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; }\n    .card { background: #16213e; padding: 2rem; border-radius: 12px; text-align: center; box-shadow: 0 8px 32px rgba(0,0,0,0.3); }\n    h1 { color: #e94560; }\n    p { color: #a7a7c5; }\n  </style>\n</head>\n<body>\n  <div class="card">\n    <h1>Techno Panaly Institute of Technology</h1>\n    <p>Welcome to the Coding Lab!</p>\n  </div>\n</body>\n</html>`,
  },
  sql: {
    label: 'SQL',
    code: `-- SQL Practice\n-- Create a students table\nCREATE TABLE students (\n  id INT PRIMARY KEY,\n  name VARCHAR(100),\n  course VARCHAR(100),\n  grade DECIMAL(3,1)\n);\n\n-- Insert sample data\nINSERT INTO students VALUES\n  (1, 'John Kamau', 'Python Programming', 85.5),\n  (2, 'Grace Wanjiku', 'Web Development', 92.0),\n  (3, 'David Ochieng', 'Cybersecurity', 88.3);\n\n-- Query\nSELECT name, course, grade\nFROM students\nWHERE grade > 85\nORDER BY grade DESC;`,
  },
};

const CodingLab = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [language, setLanguage] = useState('python');
  const [code, setCode] = useState(TEMPLATES.python.code);
  const [output, setOutput] = useState('');
  const [isRunning, setIsRunning] = useState(false);
  const [aiResponse, setAiResponse] = useState('');
  const [isAiLoading, setIsAiLoading] = useState(false);

  useEffect(() => {
    if (!loading && !user) navigate('/lms/login');
  }, [user, loading, navigate]);

  const handleLanguageChange = (lang: string) => {
    setLanguage(lang);
    setCode(TEMPLATES[lang].code);
    setOutput('');
    setAiResponse('');
  };

  const runCode = async () => {
    setIsRunning(true);
    setOutput('');

    try {
      if (language === 'javascript') {
        // Execute JS in a sandboxed way
        const logs: string[] = [];
        const fakeConsole = {
          log: (...args: any[]) => logs.push(args.map(a => typeof a === 'object' ? JSON.stringify(a, null, 2) : String(a)).join(' ')),
          error: (...args: any[]) => logs.push('Error: ' + args.join(' ')),
          warn: (...args: any[]) => logs.push('Warning: ' + args.join(' ')),
        };
        try {
          const fn = new Function('console', code);
          fn(fakeConsole);
          setOutput(logs.join('\n') || 'Code executed successfully (no output).');
        } catch (err: any) {
          setOutput(`Error: ${err.message}`);
        }
      } else if (language === 'html') {
        // For HTML, we show a preview message
        setOutput('HTML preview rendered below. Open browser console for any errors.');
      } else if (language === 'python' || language === 'sql') {
        // Use AI to simulate execution
        setOutput('⏳ Simulating execution via AI...');
        const { data, error } = await supabase.functions.invoke('ai-code-runner', {
          body: { code, language },
        });
        if (error) throw error;
        setOutput(data?.output || 'Code executed successfully.');
      }
    } catch (err: any) {
      setOutput(`Error: ${err.message}`);
    } finally {
      setIsRunning(false);
    }
  };

  const askAI = async () => {
    if (!code.trim()) return;
    setIsAiLoading(true);
    setAiResponse('');
    try {
      const { data, error } = await supabase.functions.invoke('ai-code-runner', {
        body: { code, language, mode: 'debug' },
      });
      if (error) throw error;
      setAiResponse(data?.output || 'No issues found. Your code looks good!');
    } catch (err: any) {
      setAiResponse(`Could not connect to AI assistant: ${err.message}`);
    } finally {
      setIsAiLoading(false);
    }
  };

  const copyCode = () => {
    navigator.clipboard.writeText(code);
    toast({ title: 'Copied!', description: 'Code copied to clipboard.' });
  };

  const resetCode = () => {
    setCode(TEMPLATES[language].code);
    setOutput('');
    setAiResponse('');
  };

  return (
    <LMSLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Code2 className="h-7 w-7 text-primary" />
              AI Coding Lab
            </h1>
            <p className="text-muted-foreground">Practice Python, JavaScript, SQL & Web Development</p>
          </div>
          <div className="flex items-center gap-2">
            <Select value={language} onValueChange={handleLanguageChange}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(TEMPLATES).map(([key, { label }]) => (
                  <SelectItem key={key} value={key}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Badge variant="secondary" className="hidden sm:flex">
              <Sparkles className="h-3 w-3 mr-1" /> AI Powered
            </Badge>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Code Editor */}
          <Card className="flex flex-col">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium">Editor</CardTitle>
                <div className="flex gap-1">
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={copyCode}>
                    <Copy className="h-3.5 w-3.5" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={resetCode}>
                    <RotateCcw className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="flex-1 p-0">
              <textarea
                value={code}
                onChange={(e) => setCode(e.target.value)}
                className="w-full h-80 lg:h-96 p-4 font-mono text-sm bg-[#1e1e2e] text-[#cdd6f4] resize-none focus:outline-none rounded-b-lg"
                spellCheck={false}
                placeholder="Write your code here..."
              />
            </CardContent>
          </Card>

          {/* Output / Preview */}
          <Card className="flex flex-col">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Terminal className="h-4 w-4" />
                  Output
                </CardTitle>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={askAI}
                    disabled={isAiLoading || !code.trim()}
                    className="h-7 text-xs"
                  >
                    <Lightbulb className="h-3 w-3 mr-1" />
                    {isAiLoading ? 'Thinking...' : 'AI Debug'}
                  </Button>
                  <Button
                    size="sm"
                    onClick={runCode}
                    disabled={isRunning || !code.trim()}
                    className="h-7 text-xs"
                  >
                    <Play className="h-3 w-3 mr-1" />
                    {isRunning ? 'Running...' : 'Run Code'}
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="flex-1 p-0">
              <Tabs defaultValue="output" className="h-full">
                <TabsList className="mx-4 mb-0">
                  <TabsTrigger value="output" className="text-xs">Console</TabsTrigger>
                  {language === 'html' && <TabsTrigger value="preview" className="text-xs">Preview</TabsTrigger>}
                  <TabsTrigger value="ai" className="text-xs">AI Assistant</TabsTrigger>
                </TabsList>
                <TabsContent value="output" className="mt-0 h-full">
                  <pre className="w-full h-72 lg:h-[340px] p-4 font-mono text-sm bg-[#1e1e2e] text-[#a6e3a1] overflow-auto rounded-b-lg whitespace-pre-wrap">
                    {output || '// Click "Run Code" to see output here'}
                  </pre>
                </TabsContent>
                {language === 'html' && (
                  <TabsContent value="preview" className="mt-0 h-full">
                    <iframe
                      srcDoc={code}
                      className="w-full h-72 lg:h-[340px] rounded-b-lg border-0 bg-white"
                      sandbox="allow-scripts"
                      title="HTML Preview"
                    />
                  </TabsContent>
                )}
                <TabsContent value="ai" className="mt-0 h-full">
                  <div className="w-full h-72 lg:h-[340px] p-4 font-mono text-sm bg-[#1e1e2e] text-[#89b4fa] overflow-auto rounded-b-lg whitespace-pre-wrap">
                    {aiResponse || '// Click "AI Debug" to get feedback on your code'}
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>

        {/* Quick Reference */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { lang: 'Python', desc: 'AI, Data Science, Automation', color: 'bg-blue-500/10 text-blue-600' },
            { lang: 'JavaScript', desc: 'Web Apps, Frontend, Backend', color: 'bg-yellow-500/10 text-yellow-600' },
            { lang: 'HTML/CSS', desc: 'Web Design, Layouts, Styling', color: 'bg-orange-500/10 text-orange-600' },
            { lang: 'SQL', desc: 'Databases, Queries, Analytics', color: 'bg-green-500/10 text-green-600' },
          ].map(item => (
            <Card key={item.lang} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => handleLanguageChange(item.lang === 'HTML/CSS' ? 'html' : item.lang.toLowerCase())}>
              <CardContent className="p-4">
                <div className={`inline-flex items-center gap-2 px-2 py-1 rounded-md text-sm font-medium ${item.color}`}>
                  <Code2 className="h-4 w-4" />
                  {item.lang}
                </div>
                <p className="text-xs text-muted-foreground mt-2">{item.desc}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </LMSLayout>
  );
};

export default CodingLab;
