import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error("Supabase URL and Key must be provided in the environment variables.");
}

const supabase = createClient(supabaseUrl, supabaseKey);

export const saveColorPreference = async (shopId: string, color: string) => {
  try {
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('shop_id')
      .eq('shop_id', shopId)
      .single();

    if (userError && userError.code !== 'PGRST116') { 
      console.error("Error checking users table:", userError);
      throw new Error(`Error checking users table: ${JSON.stringify(userError)}`);
    }

    if (!userData) {
      const { error: insertError } = await supabase
        .from('users')
        .insert([{ shop_id: shopId, shop_name: shopId }]); 

      if (insertError) {
        console.error("Error inserting into users table:", insertError);
        throw new Error(`Error inserting into users table: ${JSON.stringify(insertError)}`);
      }
    }

    const { data, error } = await supabase
      .from('data')
      .upsert([{ shop_id: shopId, color }], { onConflict: "shop_id" });

      if (error) {
        console.error("Supabase error:", error);
        throw new Error(`Supabase error: ${JSON.stringify(error)}`);
      }

    return data;
  } catch (error: any) {
    console.error("Error in saveColorPreference:", error);
    throw new Error(`Failed to save color preference: ${error.message || "Unknown error"}`);
  }
};

