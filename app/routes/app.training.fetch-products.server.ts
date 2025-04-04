import { LoaderFunction, json } from "@remix-run/node";
import { LoaderData } from "app/common/types";
import { authenticate } from "app/shopify.server";

export const loader: LoaderFunction = async ({ request }) => {
  const { session } = await authenticate.admin(request);
  return json<LoaderData>({ session });
};