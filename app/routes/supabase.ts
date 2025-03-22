import { createClient } from '@supabase/supabase-js';
import { json, LoaderFunction } from "@remix-run/node";
import { verifyAppProxySignature } from './utils/shopifyProxyUtils';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error("Supabase URL and Key must be provided in the environment variables.");
}

const supabase = createClient(supabaseUrl, supabaseKey);

export const loader: LoaderFunction = async ({ request }) => {
  const url = new URL(request.url);
  const shopId = url.searchParams.get("shopId");
  const query = url.searchParams;
  const API_SECRET = process.env.SHOPIFY_API_SECRET || '';

  if (query.has('signature')) {
    if (!verifyAppProxySignature(query, API_SECRET)) {
      console.error("Invalid signature for App Proxy request");
      return json({ error: "Invalid signature" }, { status: 401 });
    }
  }

  if(!shopId) {
    return json({ error: "shopId is required." }, { status: 400 });
  }

  try {
    const color = await getColorPreference(shopId);
    console.log("Color:", color);
    return json({ color });
  } catch (error) {
    console.error("Error in loader:", error);
    return json({ error: "Failed to fetch color preference" }, { status: 500 });
  }
}

export const testSupabaseConnection = async () => {
  try {
    const { data, error } = await supabase.from('data').select('*').limit(1);
    
    return { success: !error, data, error };
  } catch (e) {
    console.error("Supabase connection test failed:", e);
    return { success: false, error: e };
  }
};

export const saveColorPreference = async (shopId: string, color: string) => {
  console.log("Saving color preference for shop:", shopId, "Color:", color);
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

export const getColorPreference = async (shopId: string) => {
  try {
    console.log(`Fetching color preference for shop: ${shopId}`);

    const { data, error } = await supabase
      .from('data')
      .select('color')
      .eq('shop_id', shopId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        console.log(`No color preference found for shop: ${shopId}, returning default`);
        return null;
      }

      console.error("Supabase error:", error); 
      throw error;
    }

    return data?.color;
  } catch (error) {
    console.error("Error in getColorPreference:", error); 
    throw error;
  }
};