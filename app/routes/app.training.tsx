import React, { useEffect, useRef, useState } from "react";
import { useFetcher, useLoaderData, useNavigate } from "@remix-run/react";
import { json, type LoaderFunctionArgs } from "@remix-run/node";
import { Page } from "@shopify/polaris";
import SetupStepper from "../components/SetupStepper";
import ProgressLoader from "../components/ProgressLoader";
import { authenticate } from "../shopify.server";
import { fetchProducts } from "./products"
import { textTrain } from "./text_train";
import { getShopStatus } from "./get_shop_status";
import { API } from "../constants/api.constants";
import type { FetcherResponse, LoaderData } from "../common/types/index";
import styles from '../styles/training.module.css';

interface TrainingLoaderData extends LoaderData {
  setupCompleted: boolean;
}

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  if (!session?.shop || !session?.accessToken) {
    return json({ shop: null, accessToken: null, setupCompleted: false });
  }

  const { setup_completed } = await getShopStatus(session.shop);

  return json({ 
    shop: session.shop,
    accessToken: session.accessToken,
    setupCompleted: setup_completed,
  });
};

export default function TrainingPage() {
  const navigate = useNavigate();
  const fetcher = useFetcher<FetcherResponse>();
  const { shop, accessToken, setupCompleted } = useLoaderData<TrainingLoaderData>();
  const processingRef = useRef(false);
  const chatWindowRef = useRef<HTMLDivElement>(null);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const [messages, setMessages] = useState<Array<{ sender: string; text: string }>>([]);
  const [input, setInput] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState<number | null>(null);
  const [progressMessage, setProgressMessage] = useState('');

  const MAX_CHAR_LIMIT = 1000;

  useEffect(() => {
    setMessages([
      { 
      sender: "bot", 
      text: "Fetch the products by clicking on the 'Fetch Products' button or provide text input to train the LLM with your own data." 
      },
      {
        sender: "bot",
        text: `Here are some examples of text data you can provide (up to ${MAX_CHAR_LIMIT} characters):`,
      },
      {
        sender: "bot",
        text: "Example 1 (About Us): 'Our company was founded in 2024 with the goal of providing high-quality, sustainable products. We believe in ethical sourcing and giving back to the community.'",
      },
      {
        sender: "bot",
        text: "Example 2 (Shipping Information): 'We ship worldwide! Standard shipping takes 5-7 business days, and express shipping takes 2-3 business days. All orders are processed within 24 hours.'",
      },
      {
        sender: "bot",
        text: "Example 3 (Return Policy): 'We have a 30-day return policy. If you're not satisfied with your purchase, you can return it for a full refund. Please contact our support team to initiate a return.'",
      },
    ]);
  }, []);

  useEffect(() => {
    if (chatWindowRef.current) {
      chatWindowRef.current.scrollTop = chatWindowRef.current.scrollHeight;
    }
  }, [messages]);

  useEffect(() => {
    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
    };
  }, []);

  const handleSend = async () => {
    if (!input.trim() || processingRef.current) return;

    if (input.length > MAX_CHAR_LIMIT) {
      setMessages((prev) => [
        ...prev,
        { sender: "bot", text: `Your message is too long. Please shorten it to under ${MAX_CHAR_LIMIT} characters.` },
      ]);
      return;
    }

    processingRef.current = true;
    setIsProcessing(true);
    setMessages((prev) => [
      ...prev,
      { sender: "user", text: input },
      { sender: "bot", text: "Chatbot is triggered with your data..." },
    ]);

    setInput("");

    await textTrain({
      input,
      shop,
      onSuccess: (data) => {
        setMessages((prev) => [
          ...prev,
          { sender: "bot", text: "Chatbot trained successfully with the above data." },
        ]);

        processingRef.current = false;
        setIsProcessing(false);
      },
      onError: () => {
        setMessages((prev) => [
          ...prev,
          { sender: "bot", text: "Failed to train with text. Please try again." },
        ]);
        setInput(input);
        processingRef.current = false;
        setIsProcessing(false);
      },
    });
  };

  const pollTaskStatus = (taskId: string) => {
    pollingIntervalRef.current = setInterval(async () => {
      try {
        const response = await fetch(`${API.GET_PRODUCTS_STATUS}/${taskId}`);
        if (!response.ok) throw new Error('Polling request failed');
        const data = await response.json();

        setProgress(data.percentage);
        setProgressMessage(data.message);

        if (data.status === 'completed' || data.status === 'failed') {
          if (pollingIntervalRef.current) {
            clearInterval(pollingIntervalRef.current);
          }

          if (data.status === 'completed') {
            const successMessage = setupCompleted ? 'Products synced successfully!' : 'Setup complete! Redirecting you...';
            setMessages((prev) => [...prev, { sender: 'bot', text: successMessage }]);
            
            if (!setupCompleted) {
                setTimeout(() => navigate('/app'), 2000);
            } else {
                setTimeout(() => {
                  processingRef.current = false;
                  setIsProcessing(false);
                  setProgress(null);
                }, 2000);
            }
          } else {
            setMessages((prev) => [...prev, { sender: 'bot', text: `Failed to sync products: ${data.message || 'Please try again.'}` }]);
            processingRef.current = false;
            setIsProcessing(false);
            setProgress(null);
          }
        }
      } catch (error) {
        console.error("Polling failed:", error);
        if (pollingIntervalRef.current) clearInterval(pollingIntervalRef.current);
        setMessages((prev) => [...prev, { sender: 'bot', text: 'An error occurred while checking sync status. Please try again.' }]);
        processingRef.current = false;
        setIsProcessing(false);
        setProgress(null);
      }
    }, 3000);
  };

  const handleFetchProducts = async () => {
    if (processingRef.current) return;
    processingRef.current = true;
    setIsProcessing(true);
    setProgress(0);
    setProgressMessage("Initiating product sync...");
    setMessages((prev) => [...prev, { sender: "bot", text: "Fetching products..." }]);
    
    try {
      const { task_id } = await fetchProducts(shop, accessToken)
      if (task_id) {
        pollTaskStatus(task_id);
      } else {
        throw new Error("Failed to get a task ID for product sync.");
      }
    } catch (error) {
      setMessages((prev) => [...prev, { 
        sender: "bot", 
        text: "Failed to fetch products. Please try again." 
      }]);
      processingRef.current = false;
      setIsProcessing(false);
      setProgress(null); 
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
    <Page>
      {progress !== null && (
        <ProgressLoader progress={progress} message={progressMessage} />
      )}
      <SetupStepper currentStep={1} setupCompleted={setupCompleted} />
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
            <div className={styles.chatWindow} ref={chatWindowRef}>
              {messages.map((msg, index) => (
                <div key={index} className={msg.sender === "user" ? styles.userMessage : styles.botMessage}>
                  {msg.text}
                </div>
              ))}
            </div>
            <div className={styles.inputArea}>
              <textarea
                className={styles.textarea}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Type your training data..."
                rows={1}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
              />
              <button 
                onClick={handleSend} 
                className={styles.sendButton}
                disabled={!input.trim() || processingRef.current || isProcessing}
              >
                {isProcessing ? "Sending..." : "Send"}
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
                disabled={processingRef.current || isProcessing}
              >
                {isProcessing ? "Fetching..." : "Fetch Products"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </Page>
  );
}