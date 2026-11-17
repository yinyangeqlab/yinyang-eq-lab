import { getChatGPTUser } from "@/app/chatgpt-auth";

export async function GET(request: Request) {
  const user = await getChatGPTUser();
  return Response.redirect(new URL(user ? "/shootout" : "/", request.url));
}
