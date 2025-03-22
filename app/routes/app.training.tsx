import { useEffect, useState } from "react";
import { useLoaderData } from "@remix-run/react";
import { json, LoaderFunction } from "@remix-run/node";
import { authenticate } from "app/shopify.server";
import styles from '../components/styles/training.module.css';

export const loader: LoaderFunction = async ({ request }) => {
  const { session } = await authenticate.admin(request);
  return json({ session });
};

export default function TrainingPage() {
  const [messages, setMessages] = useState<Array<{ sender: string; text: string }>>([]);
  const [input, setInput] = useState("");
  const { session } = useLoaderData<{ session: { shop: string, accessToken: string } }>();

  useEffect(() => {
    setMessages([{ sender: "bot", text: "Fetch the products by clicking on the 'Fetch Products' button or provide a JSON input to train the LLM with the products." }]);
  }, []);

  const handleSend = async () => {
    if (!input.trim()) return;

    setMessages((prev) => [...prev, { sender: "user", text: input }]);

    try {
      try {
        JSON.parse(input);
      } catch (jsonError) {
        setMessages((prev) => [...prev, { sender: "bot", text: "Please provide a valid JSON input to train the LLM." }]);
        setInput("");
        return;
      }
      
      const response = await fetch("/deepseek", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messages: [{ role: "user", content: input }],
          isTrainingPage: true,
          shopifyStore: session.shop,
          shopifyAccessToken: session.accessToken,
        }),
      });

      const data = await response.json();
      setMessages((prev) => [...prev, { sender: "bot", text: data.answer }]);
    } catch (error) {
      console.error("Error sending message:", error);
      setMessages((prev) => [...prev, { sender: "bot", text: "An error occurred. Please try again." }]);
    }

    setInput("");
  };

  const handleFetchProducts = async () => {
    setMessages((prev) => [...prev, { sender: "bot", text: "Fetching products..." }]);
    try {
      const response = await fetch("/deepseek", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          isTrainingPage: true,
          shopifyStore: session.shop,
          shopifyAccessToken: session.accessToken,
        }),
      });

      const data = await response.json();
      if (data.error) {
        throw new Error(data.error);
      }
      setMessages((prev) => [...prev, { sender: "bot", text: "Products fetched and embeddings stored successfully!" }]);
    } catch (error) {
      console.error("Error fetching products:", error);
      setMessages((prev) => [...prev, { sender: "bot", text: "Failed to fetch products. Please try again." }]);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h2>SmartBot Training</h2>
        <p>Train your SmartBot with your shop's products</p>
      </div>

      <div className={styles.content}>
        <div className={styles.chatbotSection}>
          <div className={styles.chatHeader}>
            <h3>Training Chat</h3>
          </div>
        <div className={styles.chatWindow}>
          {messages.map((msg, index) => (
            <div key={index} className={msg.sender === "user" ? styles.userMessage : styles.botMessage}>
              {msg.text}
            </div>
          ))}
        </div>
        <div className={styles.inputArea}>
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type your query..."
          />
        <button onClick={handleSend} className={styles.sendButton}>Send</button>
        </div>
        </div>

      <div className={styles.trainingSection}>
        <div className={styles.trainingHeader}>
            <h3>Training Options</h3>
        </div>
        <div className={styles.trainingContent}>
          <p>Fetch your store's products to train the SmartBot</p>
          <button onClick={handleFetchProducts} className={styles.fetchButton}>Fetch Products</button>
        </div>
      </div>
    </div>
    </div>
  );
}