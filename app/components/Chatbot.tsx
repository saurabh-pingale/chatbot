import { useEffect, useState } from "react";
import { useLoaderData } from "@remix-run/react";
import { ChatbotToggleButton } from "./ChatbotToggleButton";
import { ChatbotWindow } from "./ChatbotWindow";
import { getColorPreference } from "app/services/supabase";
import { constants } from "app/common/constants";
import { LoaderData } from "app/common/types";

export default function Chatbot() {
  const [isOpen, setIsOpen] = useState(false);
  const [color, setColor] = useState<string | null>(null);
  const data = useLoaderData<LoaderData>();
  
  const fetchColor = async () =>{
    let shopId: string | null = localStorage.getItem("shopId") || null ;
    
    if(!shopId) {
      shopId = data?.session?.shop || null;
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

 const handleColorUpdate = (event: CustomEvent) => {
   const newColor = event.detail?.color;
   if(newColor) {
     setColor(newColor);
   } 
};

  useEffect(() => {
    fetchColor();

    window.addEventListener(constants.COLOR_UPDATE_EVENT, handleColorUpdate as EventListener);

    return () => {
      window.removeEventListener(constants.COLOR_UPDATE_EVENT, handleColorUpdate as EventListener);
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