This is a **Shopify Remix Chatbot App** that enables customers to interact with a customizable and trainable chatbot directly on your Shopify storefront. It integrates with **Shopify's Admin API**, **Supabase** for database management, **Qdrant** for vector storage, and **Hugging Face** for natural language processing.

-----

## Features

  * **Chatbot Interface:** Customers will find the chatbot conveniently located in the bottom-right corner of your storefront for easy interaction.
  * **Customization:** Easily tailor the chatbot's appearance, including its default color, to seamlessly match your store's branding.
  * **Training:** Train the chatbot by either importing products directly from your Shopify store or by manually entering product data in JSON format.
  * **Vector Database:** Product data is converted into embeddings and stored in a **Qdrant** vector database, ensuring efficient and relevant information retrieval.
  * **Response Generation:** The chatbot leverages a powerful language model (**DeepSeek-R1-Distill-Qwen-32B**) to generate intelligent responses based on user queries and the stored product embeddings.

-----

## Prerequisites

Before you begin, ensure you have the following installed and configured:

1.  **Shopify Partners Account:**
      * If you don't have one, **create a Shopify Partners account** to manage and develop Shopify apps.
      * Once you have an account, create a **Development Store** from your Shopify Partners dashboard for testing your app during development.
2.  **Node.js:** Install **Node.js** (v18.20 or higher).
3.  **Shopify CLI:** Install the **Shopify CLI** to simplify your Shopify app setup and management.
4.  **Supabase Account:** Set up a **Supabase account** for your database needs.
5.  **Qdrant Account:** Create a **Qdrant account** for efficient vector storage.
6.  **Hugging Face Account:** You'll need a **Hugging Face account** to access the language models.

-----

## Setup

Follow these steps to get your Shopify Remix Chatbot App up and running:

### 1\. Clone the Repository

```bash
git clone https://github.com/saurabh-pingale/chatbot.git
cd chatbot
```

### 2\. Install Dependencies

```bash
npm install
```

### 3\. Set Up Environment Variables

Create a `.env` file in your project's root directory and add these environment variables. Remember to replace the placeholder values with your actual credentials.

```typescript
SHOPIFY_API_KEY='your-shopify-api-key'
SHOPIFY_API_SECRET='your-shopify-api-secret'
SHOPIFY_APP_URL='your-shopify-app-url'

QDRANT_API_KEY='your-qdrant-api-key'
```

### 4\. Run the Application

To start the development server:

```bash
npm run dev
```

The Shopify CLI will provide a URL to access your app in development mode.

### 5\. Configure App Proxy

To make the chatbot accessible on your storefront, you'll need to set up an app proxy:

1.  **Create a Proxy Route:** In your Shopify Admin, go to **Apps** \> **App and Sales Channel Settings**. Find your app, click **Configure**, and then create a new proxy route under **App Proxy**.
2.  **Set the Proxy URL:** This URL should point to your app's backend. For instance, if your app is hosted at `https://your-app-url.com`, your proxy URL might be `https://your-app-url.com/`.
3.  **Verify the Signature:** It's essential to verify the signature of incoming requests using your `SHOPIFY_API_SECRET`. This confirms that requests are genuinely coming from Shopify.

Here's an example function to verify the signature within your app:

```typescript
function verifyAppProxySignature(query: URLSearchParams, apiSecret: string): boolean {
  const { signature, ...params } = Object.fromEntries(query.entries());

  if (!signature) return false;

  // Sort parameters alphabetically
  const sortedParams = Object.keys(params)
    .sort()
    .reduce((acc, key) => {
      acc[key] = params[key];
      return acc;
    }, {} as Record<string, string>);

  // Create the signature message
  const signatureMessage = Object.keys(sortedParams)
    .map(key => `${key}=${sortedParams[key]}`)
    .join('');

  // Calculate the HMAC
  const hmac = crypto
    .createHmac('sha256', apiSecret)
    .update(signatureMessage)
    .digest('hex');

  return hmac === signature;
}
```

-----

## Usage

### Chatbot Interface

Once configured, your customers will see the chatbot in the bottom-right corner of your Shopify store. They can click on it to open the chat interface and begin asking questions.

### Customization

To customize the chatbot's appearance:

1.  Log in to the app using your Shopify shop domain.
2.  Navigate to the **Settings** page.
3.  Here, you can easily change the chatbot's default color. Your changes will be applied automatically after you save them.

### Training the Chatbot

To train the chatbot with your product data:

1.  Go to the **Training** page within the app.
2.  You have two options:
      * Click the **Fetch Products** button to automatically import products from your Shopify store.
      * Manually enter product data in **JSON format**.
3.  The product data will then be converted into embeddings and stored in the **Qdrant** vector database, making them searchable by the chatbot.

### Querying the Chatbot

When a user sends a message to the chatbot:

  * The app queries the **Qdrant** vector database for matching product embeddings.
  * If a match is found, these relevant embeddings, along with the user's message, are passed to the language model (**DeepSeek-R1-Distill-Qwen-32B**). This model then generates a detailed and helpful response.
  * If no relevant product information is found, the chatbot will respond with a default message like: "I don't have much information on this."

-----

## Technologies Used

  * **Shopify CLI:** For setting up, developing, and managing the Shopify app.
  * **Shopify Polaris:** For building a consistent and user-friendly interface.
  * **PostgreSQL:** For robust database management (often used with Supabase).
  * **Qdrant:** For storing and efficiently querying vector embeddings.
  * **Xenova/Transformers:** For generating embeddings using the `all-MiniLM-L6-v2` model.
  * **Hugging Face:** For generating responses using the **DeepSeek-R1-Distill-Qwen-32B** model.