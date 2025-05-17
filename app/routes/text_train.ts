import { API } from "app/constants/api.constants";

export const textTrain = async ({
  input,
  shop,
  onSuccess,
  onError,
}: {
  input: string;
  shop: string;
  onSuccess: () => void;
  onError: () => void;
}) => {
  try {
    const response = await fetch(API.TEXT_TRAIN, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Shopify-Store": shop,
      },
      body: JSON.stringify({
        text: input
      }),
    });

    if (!response.ok) {
      throw new Error("Failed to train");
    }

    const data = await response.json();
    onSuccess();
    return data;
  } catch (err) {
    onError();
  }
};