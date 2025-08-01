import { API } from "../constants/api.constants";

export const textTrain = async ({
  input,
  shop,
  onSuccess,
  onError,
}: {
  input: string;
  shop: string;
  onSuccess: (
    data: { setupCompleted: boolean } // TODO: Remove it when pricing flow is automated completely
  ) => void;
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
    onSuccess(data);
    return data;
  } catch (err) {
    onError();
  }
};