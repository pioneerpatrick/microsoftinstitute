 import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
 import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
 import { Resend } from "https://esm.sh/resend@2.0.0";
 
 const resend = new Resend(Deno.env.get("RESEND_API_KEY"));
 
 const corsHeaders = {
   "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
 };
 
 const handler = async (req: Request): Promise<Response> => {
   if (req.method === "OPTIONS") {
     return new Response(null, { headers: corsHeaders });
   }
 
   try {
     const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
     const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
     const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");
 
     const supabase = createClient(supabaseUrl, supabaseServiceKey);
 
     // Get all active newsletter subscribers
     const { data: subscribers, error: subscribersError } = await supabase
       .from("newsletter_subscribers")
       .select("email")
       .eq("is_active", true);
 
     if (subscribersError) {
       console.error("Error fetching subscribers:", subscribersError);
       throw subscribersError;
     }
 
     if (!subscribers || subscribers.length === 0) {
       console.log("No active subscribers found");
       return new Response(
         JSON.stringify({ success: true, message: "No active subscribers" }),
         { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
       );
     }
 
     // Get featured courses for content inspiration
     const { data: courses } = await supabase
       .from("courses")
       .select("title, description, category")
       .eq("is_published", true)
       .limit(5);
 
     const coursesList = courses?.map(c => `- ${c.title}: ${c.description || 'Professional course'}`).join('\n') || '';
 
     // Generate AI content for the newsletter
     let newsletterContent = {
       subject: "📚 Weekly Update from Microsoft Institute Africa",
       greeting: "Hello!",
       mainContent: "This week at Microsoft Institute Africa, we continue our mission to provide quality online education across Africa. Explore our courses in IT, Business, and more!",
       tip: "Pro Tip: Set aside dedicated study time each day for better learning outcomes.",
       closing: "Stay curious and keep learning!"
     };
 
     if (lovableApiKey) {
       try {
         const currentDate = new Date().toLocaleDateString('en-US', { 
           weekday: 'long', 
           year: 'numeric', 
           month: 'long', 
           day: 'numeric' 
         });
 
         const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
           method: "POST",
           headers: {
             Authorization: `Bearer ${lovableApiKey}`,
             "Content-Type": "application/json",
           },
           body: JSON.stringify({
             model: "google/gemini-2.5-flash",
             messages: [
               {
                 role: "system",
                 content: `You are the marketing content writer for Microsoft Institute Africa, an online educational institution offering professional courses in IT, Business, Digital Marketing, and more. Generate engaging weekly newsletter content.`
               },
               {
                 role: "user",
                 content: `Generate a weekly newsletter for ${currentDate}. 
 
 Our featured courses include:
 ${coursesList}
 
 Return a JSON object with these fields:
 - subject: A catchy email subject line (include an emoji)
 - greeting: A warm personalized greeting
 - mainContent: 2-3 paragraphs about our institution, courses, success tips, or industry insights (100-150 words)
 - tip: A practical learning or career tip
 - closing: An inspiring closing message
 
 Keep the tone professional but friendly. Focus on education, career growth, and empowerment.`
               }
             ],
             tools: [
               {
                 type: "function",
                 function: {
                   name: "generate_newsletter",
                   description: "Generate newsletter content",
                   parameters: {
                     type: "object",
                     properties: {
                       subject: { type: "string" },
                       greeting: { type: "string" },
                       mainContent: { type: "string" },
                       tip: { type: "string" },
                       closing: { type: "string" }
                     },
                     required: ["subject", "greeting", "mainContent", "tip", "closing"]
                   }
                 }
               }
             ],
             tool_choice: { type: "function", function: { name: "generate_newsletter" } }
           }),
         });
 
         if (aiResponse.ok) {
           const aiData = await aiResponse.json();
           const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
           if (toolCall?.function?.arguments) {
             newsletterContent = JSON.parse(toolCall.function.arguments);
           }
         }
       } catch (aiError) {
         console.error("AI generation failed, using default content:", aiError);
       }
     }
 
     // Send emails to all subscribers
     let successCount = 0;
     let failCount = 0;
 
     for (const subscriber of subscribers) {
       try {
         await resend.emails.send({
           from: "Microsoft Institute Africa <onboarding@resend.dev>",
           to: [subscriber.email],
           subject: newsletterContent.subject,
           html: `
             <!DOCTYPE html>
             <html>
             <head>
               <style>
                 body { font-family: Arial, sans-serif; line-height: 1.7; color: #333; margin: 0; padding: 0; }
                 .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                 .header { background: linear-gradient(135deg, #1e3a5f, #2d5a87); color: white; padding: 40px; text-align: center; border-radius: 10px 10px 0 0; }
                 .content { background: #f9f9f9; padding: 30px; }
                 .tip-box { background: #fff3cd; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #f59e0b; }
                 .courses-section { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; }
                 .footer { background: #1e3a5f; color: white; padding: 20px; text-align: center; border-radius: 0 0 10px 10px; font-size: 12px; }
                 h1 { margin: 0; font-size: 24px; }
                 .btn { background: #f59e0b; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold; }
               </style>
             </head>
             <body>
               <div class="container">
                 <div class="header">
                   <h1>📚 Weekly Newsletter</h1>
                   <p style="margin: 10px 0 0;">Microsoft Institute Africa</p>
                 </div>
                 <div class="content">
                   <p>${newsletterContent.greeting}</p>
                   
                   <div style="white-space: pre-line;">${newsletterContent.mainContent}</div>
                   
                   <div class="tip-box">
                     <h3 style="margin-top: 0;">💡 Weekly Tip</h3>
                     <p style="margin-bottom: 0;">${newsletterContent.tip}</p>
                   </div>
                   
                   <div class="courses-section">
                     <h3>🎓 Explore Our Courses</h3>
                     <p>From IT and Cybersecurity to Business Administration and Digital Marketing - we have programs designed for your success.</p>
                     <p style="text-align: center;">
                       <a href="https://microsoftinstitute.lovable.app/#courses" class="btn">Browse All Courses</a>
                     </p>
                   </div>
                   
                   <p><em>${newsletterContent.closing}</em></p>
                   
                   <p>Best regards,<br><strong>Microsoft Institute Africa Team</strong></p>
                 </div>
                 <div class="footer">
                   <p>© ${new Date().getFullYear()} Microsoft Institute Africa. All rights reserved.</p>
                   <p>You're receiving this because you subscribed to our newsletter.</p>
                   <p><a href="mailto:admissions@microsoftinstitute.africa" style="color: #f59e0b;">Unsubscribe</a></p>
                 </div>
               </div>
             </body>
             </html>
           `,
         });
         successCount++;
       } catch (emailError) {
         console.error(`Failed to send to ${subscriber.email}:`, emailError);
         failCount++;
       }
     }
 
     console.log(`Weekly newsletter sent: ${successCount} success, ${failCount} failed`);
 
     return new Response(
       JSON.stringify({ 
         success: true, 
         sent: successCount, 
         failed: failCount,
         totalSubscribers: subscribers.length 
       }),
       { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
     );
   } catch (error: any) {
     console.error("Error in send-weekly-newsletter:", error);
     return new Response(
       JSON.stringify({ error: error.message }),
       { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
     );
   }
 };
 
 serve(handler);