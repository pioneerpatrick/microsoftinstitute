import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    // Create admin client with service role key
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // Verify the requesting user is an admin
    const authHeader = req.headers.get('Authorization')!;
    const token = authHeader.replace('Bearer ', '');
    
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token);
    
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if user is admin
    const { data: roles, error: rolesError } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'admin');

    if (rolesError || !roles || roles.length === 0) {
      return new Response(
        JSON.stringify({ error: 'Forbidden: Admin access required' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { action, ...params } = await req.json();

    switch (action) {
      case 'create_user': {
        const { email, password, full_name, role } = params;
        
        // Create user
        const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
          email,
          password,
          email_confirm: true,
          user_metadata: { full_name },
        });

        if (createError) {
          return new Response(
            JSON.stringify({ error: createError.message }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Assign role if specified
        if (role && newUser.user) {
          await supabaseAdmin
            .from('user_roles')
            .insert({ user_id: newUser.user.id, role });
        }

        return new Response(
          JSON.stringify({ success: true, user: newUser.user }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'list_users': {
        // Get all users from auth
        const { data: authUsers, error: listError } = await supabaseAdmin.auth.admin.listUsers();

        if (listError) {
          return new Response(
            JSON.stringify({ error: listError.message }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Get all roles
        const { data: allRoles } = await supabaseAdmin
          .from('user_roles')
          .select('user_id, role');

        // Get all profiles
        const { data: profiles } = await supabaseAdmin
          .from('profiles')
          .select('id, full_name, email');

        // Combine data
        const users = authUsers.users.map(u => ({
          id: u.id,
          email: u.email,
          full_name: profiles?.find(p => p.id === u.id)?.full_name || u.user_metadata?.full_name || '',
          roles: allRoles?.filter(r => r.user_id === u.id).map(r => r.role) || [],
          created_at: u.created_at,
          last_sign_in_at: u.last_sign_in_at,
        }));

        return new Response(
          JSON.stringify({ users }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'assign_role': {
        const { user_id, role } = params;

        const { error } = await supabaseAdmin
          .from('user_roles')
          .upsert({ user_id, role }, { onConflict: 'user_id,role' });

        if (error) {
          return new Response(
            JSON.stringify({ error: error.message }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        return new Response(
          JSON.stringify({ success: true }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'remove_role': {
        const { user_id, role } = params;

        const { error } = await supabaseAdmin
          .from('user_roles')
          .delete()
          .eq('user_id', user_id)
          .eq('role', role);

        if (error) {
          return new Response(
            JSON.stringify({ error: error.message }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        return new Response(
          JSON.stringify({ success: true }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'delete_user': {
        const { user_id } = params;

        const { error } = await supabaseAdmin.auth.admin.deleteUser(user_id);

        // If user is already deleted or not found, treat as success
        if (error) {
          if (error.message.includes('not found') || error.message.includes('User not found')) {
            return new Response(
              JSON.stringify({ success: true, message: 'User already deleted or not found' }),
              { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
          }
          return new Response(
            JSON.stringify({ error: error.message }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        return new Response(
          JSON.stringify({ success: true }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'update_password': {
        const { email, password } = params;

        // Find user by email
        const { data: authUsers, error: listError } = await supabaseAdmin.auth.admin.listUsers();
        
        if (listError) {
          return new Response(
            JSON.stringify({ error: listError.message }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const targetUser = authUsers.users.find(u => u.email === email);
        
        if (!targetUser) {
          return new Response(
            JSON.stringify({ error: 'User not found' }),
            { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
          targetUser.id,
          { password }
        );

        if (updateError) {
          return new Response(
            JSON.stringify({ error: updateError.message }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        return new Response(
          JSON.stringify({ success: true }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      default:
        return new Response(
          JSON.stringify({ error: 'Invalid action' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});