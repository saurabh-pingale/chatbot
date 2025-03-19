import { json, LoaderFunction, ActionFunction } from "@remix-run/node";
import { useFetcher, useLoaderData } from "@remix-run/react";
import { authenticate } from "../shopify.server";
import { saveColorPreference, testSupabaseConnection } from "./supabase";
import { useEffect, useState } from "react";

const colors = ["#FF5733", "#33FF57", "#3357FF", "#FF33A1", "#33FFF5"];

interface ActionResponse {
  success?: boolean;
  error?: string;
};

export const loader: LoaderFunction = async ({ request }) => {
  const { session } = await authenticate.admin(request);
  return json({ session });
};

export const action: ActionFunction = async ({ request }) => {
  const { session } = await authenticate.admin(request);
  const formData = await request.formData();
  const color = formData.get("color") as string;

  if (!session.shop || !color) {
    return json({ error: "Missing required fields" }, { status: 400 });
  }

  try {
    const connTest = await testSupabaseConnection();
    if (!connTest.success) {
      return json({ error: "Database connection failed" }, { status: 500 });
    }

    await saveColorPreference(session.shop, color);
    return json({ success: true });
  } catch (error) {
    console.error("Error in action function:", error); 
    return json({ error: "Failed to save color preference" }, { status: 500 });
  }
};

export default function Settings() {
  const fetcher = useFetcher<ActionResponse>();
  const [selectedColor, setSelectedColor] = useState<string | null>(null);
  const { session } = useLoaderData<{ session: { shop: string } }>();

  useEffect(() => {
    if(session?.shop) {
      localStorage.setItem("shopId", session.shop);
    }
  }, [session]);

  const handleColorSelect = (color: string) => {
    setSelectedColor(color);
  };

  const handleSave = () => {
    if (selectedColor) {
      fetcher.submit({ color: selectedColor }, { method: "post" });
    }
  };

  const handleCancel = () => {
    setSelectedColor(null);
  };

  return (
    <div> 
      <div>
      <h1>Settings</h1>
      </div>
      <div>
        <p>Select a color:</p>
        <div style={{ display: "flex", gap: "10px" }}>
          {colors.map((color) => (
            <button
              key={color}
              style={{
                width: "40px",
                height: "40px",
                borderRadius: "50%",
                backgroundColor: color,
                border: selectedColor === color ? "2px solid black" : "none",
                cursor: "pointer",
              }}
              onClick={() => handleColorSelect(color)}
            ></button>
          ))}
        </div>
      </div>
      <div style={{ marginTop: "20px" }}>
        <button
          onClick={handleSave}
          disabled={!selectedColor}
          style={{ marginRight: "10px" }}
        >
          Save
        </button>
        <button onClick={handleCancel}>Cancel</button>
      </div>
      </div>
  );
}