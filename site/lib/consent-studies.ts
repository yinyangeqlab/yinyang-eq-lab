import {RETROSPECTIVE_NOTICE_VERSION} from '@/lib/legacy-notice';
import {RequestInputError} from '@/lib/request-json';
export type ConsentStudy={id:string;title:string;mode:string;headphone_type:string;seal_after:number;opted_in:number;sealed:number};
export async function consentStudies(db:D1Database,subject:string){return (await db.prepare("SELECT s.id,COALESCE(a.name,'Target A') || ' / ' || COALESCE(b.name,'Target B') AS title,s.mode,s.headphone_type,s.seal_after,COALESCE(p.enabled,0) opted_in,EXISTS(SELECT 1 FROM archive_releases r WHERE r.study_id=s.id) sealed FROM archive_studies s LEFT JOIN targets a ON a.id=s.target_a LEFT JOIN targets b ON b.id=s.target_b LEFT JOIN retrospective_permissions p ON p.study_id=s.id AND p.subject_id=? WHERE s.source_mode='retrospective' ORDER BY s.end_at,s.id").bind(subject).all<ConsentStudy>()).results;}
export async function consentStudyStatements(db:D1Database,subject:string,raw:unknown,acknowledged:unknown,notice:unknown,participating:boolean){
 if(raw===undefined)return [];
 if(!Array.isArray(raw)||raw.length>100||new Set(raw.map(x=>x?.studyId)).size!==raw.length||raw.some(x=>!x||typeof x.studyId!=='string'||!/^[a-f0-9-]{36}$/i.test(x.studyId)||typeof x.enabled!=='boolean'))throw new RequestInputError('Choose your listed historical-study permissions.',400);
 const studies=await consentStudies(db,subject),statements=[];
 for(const choice of raw){const study=studies.find(row=>row.id===choice.studyId);if(!study)throw new RequestInputError('A historical study changed. Reload data choices before saving.',409);const enabled=participating&&choice.enabled;
  if(enabled&&(acknowledged!==true||notice!==RETROSPECTIVE_NOTICE_VERSION||!subject.startsWith('invite:')&&!subject.startsWith('browser:')))throw new RequestInputError('Review each selected historical study and its permanent-result notice.',400);
  if(enabled&&study.sealed&&!study.opted_in)throw new RequestInputError('This historical result is already sealed. New permission cannot change it.',409);
  if(enabled&&!study.opted_in&&await db.prepare('SELECT 1 FROM owner_public_profiles WHERE subject_id=?').bind(subject).first())throw new RequestInputError('The protected YinYangEQ account is excluded from ordinary archives. It needs a separate account-specific inclusion review.',400);
  statements.push(db.prepare('INSERT INTO retrospective_permissions(study_id,subject_id,enabled,notice_version,agreed_at,withdrawn_at) VALUES(?,?,?,?,?,?) ON CONFLICT(study_id,subject_id) DO UPDATE SET enabled=excluded.enabled,notice_version=excluded.notice_version,agreed_at=CASE WHEN excluded.enabled=1 THEN excluded.agreed_at ELSE retrospective_permissions.agreed_at END,withdrawn_at=excluded.withdrawn_at').bind(choice.studyId,subject,enabled?1:0,RETROSPECTIVE_NOTICE_VERSION,Date.now(),enabled?null:Date.now()));
 }
 return statements;
}
