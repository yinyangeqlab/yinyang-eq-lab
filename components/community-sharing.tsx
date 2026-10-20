"use client";
import PersonalSharingStatus from '@/components/personal-sharing-status';
import type {PersonalSharingState} from '@/lib/personal-contribution-status';
export type PersonalSharing=PersonalSharingState;
export default function CommunitySharing({onChange}:{onChange?:(choice:PersonalSharing)=>void}){return <PersonalSharingStatus onCommunityChange={onChange}/>;}
