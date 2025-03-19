import { useEffect, useState } from "react";
import { ChatbotToggleButton } from "./ChatbotToggleButton";
import { ChatbotWindow } from "./ChatbotWindow";
import { getColorPreference } from "app/services/supabase";


export default function Chatbot() {
  const [isOpen, setIsOpen] = useState(false);
  const [color, setColor] = useState<string | null>(null);
  

  useEffect(() => {
    const fetchColor = async () =>{
      const shopId = localStorage.getItem("shopId");
      if(!shopId) return;

       try {
        const color = await getColorPreference(shopId);
        console.log("Color:", color);
        setColor(color);
       } catch (error) {
          console.error("Error fetching color preference:", error);
       }
    };

    fetchColor();
  }, []);

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