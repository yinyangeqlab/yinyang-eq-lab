import { isTestSubject } from "@/lib/admin-contributions";
import { browserProofHeaders, issueBrowserProof, readBrowserProofRequest } from "@/lib/browser-ownership-proof";
import { RequestInputError } from "@/lib/request-json";
import { dataIdentity } from "@/lib/submission-ownership";

export async function POST(request: Request) {
  try {
    const { browserId } = await readBrowserProofRequest(request);
    const user = await dataIdentity();
    if (isTestSubject(user.subjectId)) throw new RequestInputError("Browser proof is only available for participant accounts.", 403);
    const proof = await issueBrowserProof(user.sessionHash, user.subjectId, browserId);
    return Response.json(proof, { headers: browserProofHeaders });
  } catch (error) {
    const known = error instanceof RequestInputError;
    return Response.json({ error: known ? error.message : "A verification code could not be created." }, {
      status: known ? error.status : 503, headers: browserProofHeaders,
    });
  }
}
