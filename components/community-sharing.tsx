"use client";
import SharingPermissionStatus from '@/components/sharing-permission-status';
import type {PersonalSharingState} from '@/lib/personal-contribution-status';
export type PersonalSharing=PersonalSharingState;
const ignoreChange=(_choice:PersonalSharing)=>{};
export default function CommunitySharing({onChange=ignoreChange}:{onChange?:(choice:PersonalSharing)=>void}){return <SharingPermissionStatus endpoint="/api/community-preferences/personal" title="Community Preferences contribution" onChange={onChange}/>;}
