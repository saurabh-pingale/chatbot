import { useEffect, useRef, useState } from "react";
import { useFetcher, useLoaderData } from "@remix-run/react";
import styles from '../components/styles/training.module.css';
import { json, LoaderFunctionArgs } from "@remix-run/node";
import { authenticate } from "../shopify.server";
import { fetchProducts } from "./api/products";
import { FetcherResponse, LoaderData } from "app/common/types";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  if (!session?.shop || !session?.accessToken) {
    return json({ shop: null, accessToken: null });
  }

  return json({ 
    shop: session.shop,
    accessToken: session.accessToken 
  });
};

export default function TrainingPage() {
  const [messages, setMessages] = useState<Array<{ sender: string; text: string }>>([]);
  const [input, setInput] = useState("");
  const fetcher = useFetcher<FetcherResponse>();
  const processingRef = useRef(false);
  const { shop, accessToken } = useLoaderData<LoaderData>();

  useEffect(() => {
    setMessages([{ 
      sender: "bot", 
      text: "Fetch the products by clicking on the 'Fetch Products' button or provide a JSON input to train the LLM with the products." 
    }]);
  }, []);

  const handleSend = async () => {
    if (!input.trim() || processingRef.current) return;
    processingRef.current = true;

    setMessages((prev) => [...prev, { sender: "user", text: input }]);

    try {
      JSON.parse(input); 
      
      fetcher.submit({
        messages: JSON.stringify([{ role: "user", content: input }]),
        isTrainingPage: "true"
      }, {
        method: "POST",
        encType: "application/json"
      });
    } catch (jsonError) {
      setMessages((prev) => [...prev, { 
        sender: "bot", 
        text: "Please provide a valid JSON input to train the LLM." 
      }]);
      setInput("");
      processingRef.current = false;
    }
  };

  const handleFetchProducts = async () => {
    if (processingRef.current) return;
    processingRef.current = true;
    setMessages((prev) => [...prev, { sender: "bot", text: "Fetching products..." }]);
    
    try {
      const result = await fetchProducts(shop, accessToken)
      setMessages((prev) => [...prev, { 
        sender: "bot", 
        text: result.message || "Products fetched successfully!" 
      }]);
    } catch (error) {
      setMessages((prev) => [...prev, { 
        sender: "bot", 
        text: "Failed to fetch products. Please try again." 
      }]);
    } finally {
      processingRef.current = false;
    }
  };

  useEffect(() => {
    if (fetcher.state === "idle" && fetcher.data) {
      const data = fetcher.data as FetcherResponse;
      setMessages((prev) => [...prev, { sender: "bot", text: data.answer }]);
      processingRef.current = false;
    }
  }, [fetcher.data, fetcher.state]);

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
            <button 
              onClick={handleSend} 
              className={styles.sendButton}
              disabled={fetcher.state !== "idle"}
            >
              {fetcher.state !== "idle" ? "Sending..." : "Send"}
            </button>
          </div>
        </div>

        <div className={styles.trainingSection}>
          <div className={styles.trainingHeader}>
            <h3>Training Options</h3>
          </div>
          <div className={styles.trainingContent}>
            <p>Fetch your store's products to train the SmartBot</p>
            <button 
              onClick={handleFetchProducts} 
              className={styles.fetchButton}
              disabled={processingRef.current}
            >
              {processingRef.current ? "Fetching..." : "Fetch Products"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}