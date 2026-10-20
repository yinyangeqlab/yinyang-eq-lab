"use client";
import PersonalSharingStatus from '@/components/personal-sharing-status';
import type {PersonalSharingState} from '@/lib/personal-contribution-status';
export type PersonalSharing=PersonalSharingState;
export default function PersonalResearchSharing({onChange,onCommunityChange}:{onChange:(choice:PersonalSharing)=>void;onCommunityChange?:(choice:PersonalSharing)=>void}){return <PersonalSharingStatus onResearchChange={onChange} onCommunityChange={onCommunityChange}/>;}
