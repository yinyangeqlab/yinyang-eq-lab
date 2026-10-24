import { env } from "cloudflare:workers";
import { dataIdentity } from "@/lib/submission-ownership";
import { requireParticipantSubject } from "@/lib/admin-contributions";
import { requireProfileAccount,saveProfileSnapshot,profileOrigin } from "@/lib/yinyangeq-account";
import { profileInventory,ownedProfilePreview,profileKind,setProfileEntry,savePersonalProfileEvent,profileCategoryCounts,previewProfileCategories,setProfileSelection } from "@/lib/yinyangeq-records";
import { readJsonObject,RequestInputError } from "@/lib/request-json";
import { profileHeaders,profileFailure,profilePageNumber } from "@/lib/profile-api";
async function identity(){const identity=await dataIdentity();requireParticipantSubject(identity.subjectId);const profile=await requireProfileAccount(env.DB!);if(identity.subjectId!==profile.subject_id)throw new RequestInputError("This page belongs to the separate YinYangEQ account.",403);return identity;}
export async function GET(request:Request){try{const user=await identity();return Response.json(await (new URL(request.url).searchParams.has("categories")?profileCategoryCounts(env.DB!,user.subjectId):profileInventory(env.DB!,user.subjectId,profilePageNumber(request))),{headers:profileHeaders});}catch(error){return profileFailure(error);}}
export async function POST(request:Request){try{
 profileOrigin(request);const user=await identity();const body=await readJsonObject(request,530000);
 if(body.action==="preview-categories")return Response.json(await previewProfileCategories(env.DB!,user.subjectId,body.categories,body.cursor,body.includeFiles===true),{headers:profileHeaders});
 if(body.action==="share-selection")return Response.json(await setProfileSelection(env.DB!,user.subjectId,body.entries,body.state,body.includeFiles===true),{headers:profileHeaders});
 if(body.action==="snapshot")return Response.json(await saveProfileSnapshot(env.DB!,user.subjectId,body.label,body.payload),{headers:profileHeaders});
 if(body.action==="journal")return Response.json(await savePersonalProfileEvent(env.DB!,user.subjectId,body),{headers:profileHeaders});
 const kind=profileKind(body.kind),id=String(body.sourceId||"");if(!id||id.length>1200)throw new RequestInputError("Select a contribution.",400);
 if(body.action==="preview"){const result=await ownedProfilePreview(env.DB!,user.subjectId,kind,id,body.includeFiles===true);return Response.json({payload:result.payload,hash:result.hash},{headers:profileHeaders});}
 if(!["published","hidden","draft"].includes(String(body.state)))throw new RequestInputError("Choose a publication state.",400);
 return Response.json(await setProfileEntry(env.DB!,user.subjectId,kind,id,body.state as "published"|"hidden"|"draft",body.includeFiles===true,String(body.previewHash||"")),{headers:profileHeaders});
}catch(error){return profileFailure(error);}}
export async function DELETE(request:Request){try{
 profileOrigin(request);await identity();const body=await readJsonObject(request,2048);if(body.confirmation!=="DELETE PRIVATE JOURNAL ENTRY")throw new RequestInputError("Confirm permanent journal deletion.",400);
 const profile=await requireProfileAccount(env.DB!);const id=String(body.sourceId||"");const event=await env.DB!.prepare("SELECT record_kind FROM owner_profile_events WHERE profile_slug=? AND id=? AND record_kind IN ('browser-result','music')").bind(profile.slug,id).first();if(!event)throw new RequestInputError("Journal entry not found.",404);
 await env.DB!.batch([
  env.DB!.prepare("DELETE FROM owner_profile_snapshots WHERE profile_slug=?").bind(profile.slug),
  env.DB!.prepare("DELETE FROM owner_history_claims WHERE profile_slug=?").bind(profile.slug),
  env.DB!.prepare("DELETE FROM owner_profile_events WHERE profile_slug=? AND id=?").bind(profile.slug,id),
 ]);return Response.json({ok:true},{headers:profileHeaders});
}catch(error){return profileFailure(error);}}
