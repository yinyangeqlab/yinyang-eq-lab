import {storedAccountValues} from '@/lib/account-sync-segments';
import {validateAccountValues} from '@/lib/account-sync.mjs';
export async function inspectAccountSync(db:D1Database,slug:string,request:Request){
 const row=await db.prepare('SELECT epoch,revision,initialized,payload,updated_at FROM owner_account_sync WHERE profile_slug=?').bind(slug).first<{epoch:string;revision:number;initialized:number;payload:string;updated_at:number}>();
 const profile=await db.prepare('SELECT subject_id FROM owner_public_profiles WHERE slug=?').bind(slug).first<{subject_id:string}>();
 const url=new URL(request.url),before=Number(url.searchParams.get('before')||Number.MAX_SAFE_INTEGER),beforeId=url.searchParams.get('beforeId')||'~';
 if(!Number.isSafeInteger(before)||before<0||beforeId.length>100)throw Error('Invalid history cursor.');
 const result=profile?await db.prepare('SELECT id,event_type,route,shootout_tab,test_mode,test_active,created_at FROM activity_events WHERE subject_id=? AND (created_at<? OR (created_at=? AND id<?)) ORDER BY created_at DESC,id DESC LIMIT 201').bind(profile.subject_id,before,before,beforeId).all<{id:string;created_at:number}>():{results:[]};
 const activity=result.results.slice(0,200),last=activity.at(-1);
 return {epoch:row?.epoch||'',revision:row?.revision||0,initialized:!!row?.initialized,values:row&&profile?await storedAccountValues(db,{subject_id:profile.subject_id,slug,protectedAccount:true},row):{},updatedAt:row?.updated_at||null,retention:'indefinite',activity,next:result.results.length>200&&last?{before:last.created_at,beforeId:last.id}:null};
}
