import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error("Supabase URL and Key must be provided in the environment variables.");
}

const supabase = createClient(supabaseUrl, supabaseKey);
//TODO - don't use supbase use some other ORM like typeorm etc
export const saveColorPreference = async (shopId: string, color: string) => {
  try {
    const { data: storeData, error: storeError } = await supabase
      .from('stores')
      .select('id')
      .eq('store_name', shopId)
      .single();

    if (storeError && storeError.code !== 'PGRST116') { 
      console.error("Error checking stores table:", storeError);
      throw new Error(`Error checking stores table: ${JSON.stringify(storeError)}`);
    }

    if (!storeData) {
      const { error: insertError } = await supabase
        .from('stores')
        .insert([{  
          store_name: shopId,
          preferred_color: color 
        }]);

      if (insertError) {
        console.error("Error inserting into stores table:", insertError);
        throw new Error(`Error inserting into stores table: ${JSON.stringify(insertError)}`);
      }
    } else {
      const { error: updateError } = await supabase
        .from('stores')
        .update({ preferred_color: color })
        .eq('store_name', shopId);

      if (updateError) {
        console.error("Error updating stores table:", updateError);
        throw new Error(`Error updating stores table: ${JSON.stringify(updateError)}`);
      }
    }

    return { success: true };
  } catch (error: any) {
    console.error("Error in saveColorPreference:", error);
    throw new Error(`Failed to save color preference: ${error.message || "Unknown error"}`);
  }
};