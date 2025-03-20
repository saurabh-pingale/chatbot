import { useEffect, useState } from "react";
import { ChatbotToggleButton } from "./ChatbotToggleButton";
import { ChatbotWindow } from "./ChatbotWindow";
import { getColorPreference } from "app/services/supabase";
import { useLoaderData } from "@remix-run/react";

const COLOR_UPDATE_EVENT = "color-preference-updated";

export default function Chatbot() {
  const [isOpen, setIsOpen] = useState(false);
  const [color, setColor] = useState<string | null>(null);
  const data = useLoaderData();
  
  const fetchColor = async () =>{
    let shopId = data?.session?.shop;

    if(!shopId) {
      shopId = localStorage.getItem("shopId");
    }

    if(!shopId) {
      console.error("No shopId available");
      return;
    }

    try {
     const color = await getColorPreference(shopId);
     setColor(color);
    } catch (error) {
       console.error("Error fetching color preference:", error);
    }
  };

  useEffect(() => {
    fetchColor();

     // Listen for color update events
    const handleColorUpdate = (event: CustomEvent) => {
      const newColor = event.detail?.color;
      if(newColor) {
        setColor(newColor);
      } else {
        // If no color is provided in the event, refetch from the database
        fetchColor();
      }
    };

    // Add event listener for color updates
    window.addEventListener(COLOR_UPDATE_EVENT, handleColorUpdate as EventListener);

    // Clean up event listener when component unmounts
    return () => {
      window.removeEventListener(COLOR_UPDATE_EVENT, handleColorUpdate as EventListener);
    };
  }, [data]);

  return (
    <>
      <ChatbotToggleButton 
        isOpen={isOpen} 
        onToggle={() => setIsOpen(prevState => !prevState)}
        color={color}
      />
      {isOpen && 
        <ChatbotWindow 
          onClose={() => setIsOpen(false)}
          color={color}
        />
      }
    </>
  );
}