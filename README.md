# Shopify Remix Chatbot App

This is a Shopify Remix Chatbot App that allows users to interact with a chatbot on their Shopify store. The chatbot can be customized and trained to provide responses based on the products available in the store. The app integrates with Shopify's Admin API, Supabase for database management, Pinecone for vector storage, and Hugging Face for natural language processing.

## Features

- **Chatbot Interface:** Users can interact with the chatbot directly from the storefront. The chatbot  
  appears in the bottom right corner of the page.

- **Customization:** Users can customize the chatbot's appearance, including the default color.

- **Training:** Users can train the chatbot by fetching products from their Shopify store or by manually 
  entering product data in JSON format.

- **Vector Database:** Product data is converted into embeddings and stored in a Pinecone vector 
  database for efficient querying.

- **Response Generation:** The chatbot uses a language model (DeepSeek-R1-Distill-Qwen-32B) to generate 
  responses based on the user's queries and the stored embeddings.


## Prerequisites

Before you begin, ensure you have the following installed:

1. **Shopify Partners Account:**

  - If you don’t already have one, create a [Shopify Partners account](https://www.shopify.com/in/partners). This account allows you to manage and develop Shopify apps.

  - After creating a Shopify Partners account, create a `Development Store` from the Shopify Partners   
    dashboard. This store will be used to test your app during development.

2. **Node.js:**

  - Install [Node.js](https://nodejs.org/en) (v18.20 or higher).
 
3. **Shopify CLI:**

  - Install the [Shopify CLI](https://shopify.dev/docs/api/shopify-cli) to set up and manage your 
    Shopify app.
 
4. **Supabase Account:**

  - Create a [Supabase](https://supabase.com/) account for database management.
 
5. **Pinecone Account:**

  - Create a [Pinecone](https://www.pinecone.io/) account for vector storage.

6. **Hugging Face Account:**

  - Create a [Hugging Face](https://huggingface.co/) account to access language models.


## Setup

1. **Clone the Repository**

```bash
git clone 
cd chatbot
```

2. **Install Dependencies**

```bash
npm install
```

3. **Set Up Environment Variables**

Create a `.env` file in the root directory and add the following environment variables:

```ts
SHOPIFY_API_KEY='your-shopify-api-key'
SHOPIFY_API_SECRET='your-shopify-api-secret'
SHOPIFY_APP_URL='your-shopify-app-url'

SUPABASE_URL='your-supabase-url'
SUPABASE_SERVICE_ROLE_KEY='your-supabase-service-role-key'

PINECONE_API_KEY='your-pinecone-api-key'

HUGGINGFACE_API_KEY='you-huggingface-api-key'
```

4. **Run the Application**

To start the development server, run:

```bash
npm run dev
```

This will start the Shopify app in development mode. You can access the app by navigating to the URL provided by the Shopify CLI.

5. **Configure App Proxy**

To set up the app proxy, follow these steps:

1. **Create a Proxy Route:** In your Shopify Admin, go to Apps > App and Sales Channel Settings. Find 
   your app and click Configure. Under App Proxy, create a new proxy route.

2. **Set the Proxy URL:** The proxy URL should point to your app's backend. For example, if your app is 
   hosted at `https://your-app-url.com`, the proxy URL might be `https://your-app-url.com/`.

3. **Verify the Signature:** Use the `SHOPIFY_API_SECRET` to verify the signature of incoming requests. 
   This ensures that the requests are coming from Shopify.

Here is an example of how to verify the signature in your app:

```ts
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

## Usage

**Chatbot Interface**
When a user visits your Shopify store, they will see the chatbot in the bottom right corner of the page. They can interact with the chatbot by sending messages and receiving responses.

**Customization**
To customize the chatbot, log in to the app using your Shopify shop domain. Once logged in, navigate to the Settings page. Here, you can change the default color of the chatbot. The changes will be applied automatically after saving.

**Training the Chatbot**
To train the chatbot, navigate to the Training page. You can either fetch products from your Shopify store using the Fetch Products button or manually enter product data in JSON format. The products will be converted into embeddings and stored in the Pinecone vector database.

**Querying the Chatbot**
When a user sends a message to the chatbot, the app queries the Pinecone vector database for matching embeddings. If a match is found, the embeddings and the user's message are passed to the language model, which generates a response. If no match is found, the chatbot responds with "I don't have much information on this."


## Technologies Used

- **Shopify CLI:** For setting up and managing the Shopify app.

- **Shopify Polaris:** For building the user interface.

- **Supabase:** For database management.

- **Pinecone:** For storing and querying vector embeddings.

- **Xenova/Transformers:** For generating embeddings using the all-MiniLM-L6-v2 model.

- **Hugging Face:** For generating responses using the DeepSeek-R1-Distill-Qwen-32B model.