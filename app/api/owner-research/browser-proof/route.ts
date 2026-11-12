import { browserProofHeaders, consumeBrowserProof, readBrowserProofRequest } from "@/lib/browser-ownership-proof";
import { ownerAccessResponse } from "@/lib/owner-access";
import { RequestInputError } from "@/lib/request-json";

export async function POST(request: Request) {
  const denied = await ownerAccessResponse(request);
  if (denied) return denied;
  try {
    const { browserId, code } = await readBrowserProofRequest(request);
    return Response.json(await consumeBrowserProof(browserId, code), { headers: browserProofHeaders });
  } catch (error) {
    const known = error instanceof RequestInputError;
    return Response.json({ error: known ? error.message : "The verification code could not be checked." }, {
      status: known ? error.status : 503, headers: browserProofHeaders,
    });
  }
}
