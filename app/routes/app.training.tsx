import React, { useEffect, useRef, useState } from "react";
import { useFetcher, useLoaderData, useNavigate } from "@remix-run/react";
import styles from '../styles/training.module.css';
import { json, LoaderFunctionArgs } from "@remix-run/node";
import { authenticate } from "../shopify.server";
import { fetchProducts } from "./products"
import { FetcherResponse, LoaderData } from "../common/types/index";
import { textTrain } from "./text_train";
import SetupStepper from "../components/SetupStepper";
import { Page, Spinner } from "@shopify/polaris";
import { getShopStatus } from "./get_shop_status";

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
  const [messages, setMessages] = useState<Array<{ sender: string; text: string }>>([]);
  const [input, setInput] = useState("");
  const fetcher = useFetcher<FetcherResponse>();
  const processingRef = useRef(false);
  const { shop, accessToken, setupCompleted } = useLoaderData<TrainingLoaderData>();
  const navigate = useNavigate();
  const MAX_CHAR_LIMIT = 1000;
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    setMessages([{ 
      sender: "bot", 
      text: "Fetch the products by clicking on the 'Fetch Products' button or provide text input to train the LLM with your own data." 
    }]);
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
      onSuccess: () => {
        setMessages((prev) => [
          ...prev,
          { sender: "bot", text: "Chatbot trained successfully with the above data." },
        ]);
        if (!setupCompleted) {
          navigate('/app/billings');
        } else {
          processingRef.current = false;
          setIsProcessing(false);
        }
      },
      onError: () => {
        setMessages((prev) => [
          ...prev,
          { sender: "bot", text: "Failed to train, Please try again." },
        ]);
        setInput("");
        processingRef.current = false;
        setIsProcessing(false);
      },
    });
  };

  const handleFetchProducts = async () => {
    if (processingRef.current) return;
    processingRef.current = true;
    setIsProcessing(true);
    setMessages((prev) => [...prev, { sender: "bot", text: "Fetching products..." }]);
    
    try {
      const result = await fetchProducts(shop, accessToken)
      setMessages((prev) => [...prev, { 
        sender: "bot", 
        text: result.message || "Products fetched successfully!" 
      }]);
      if (!setupCompleted) {
        navigate('/app/billings');
      } else {
        processingRef.current = false;
        setIsProcessing(false);
      }
    } catch (error) {
      setMessages((prev) => [...prev, { 
        sender: "bot", 
        text: "Failed to fetch products. Please try again." 
      }]);
      processingRef.current = false;
      setIsProcessing(false);
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
      {isProcessing && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            backgroundColor: "rgba(255, 255, 255, 0.8)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            zIndex: 9999,
          }}
        >
          <Spinner accessibilityLabel="Processing..." />
        </div>
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
            <div className={styles.chatWindow}>
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