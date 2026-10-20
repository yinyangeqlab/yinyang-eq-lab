"use client";
import SharingPermissionStatus from '@/components/sharing-permission-status';
import type {PersonalSharingState} from '@/lib/personal-contribution-status';
export type PersonalSharing=PersonalSharingState;
export default function PersonalResearchSharing({onChange}:{onChange:(choice:PersonalSharing)=>void}){return <SharingPermissionStatus endpoint="/api/personal-research" title="Private Personal research contribution" onChange={onChange}/>;}
