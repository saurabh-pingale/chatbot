import type { ActionFunctionArgs } from "@remix-run/node";
import { forwardRequestToBackend } from "./api.server";

export async function action({ request }: ActionFunctionArgs) {
  return forwardRequestToBackend('/rag-pipeline/conversation', request);
}