"use client";
import { useCallback, useEffect, useRef, useState } from "react";
const SKIP="target-lab-sound-check-skip", ACK="target-lab-personal-sound-check-acknowledged";
export function useListeningReminder(){
  const [open,setOpen]=useState(false),[skip,setSkip]=useState(false);
  const acknowledged=useRef(false),never=useRef(false);
  useEffect(()=>{try{never.current=localStorage.getItem(SKIP)==="true";acknowledged.current=never.current||sessionStorage.getItem(ACK)==="true";}catch{}},[]);
  const request=useCallback(()=>{if(acknowledged.current)return true;setSkip(false);setOpen(true);return false;},[]);
  function show(){setSkip(false);setOpen(true);}
  function ready(){acknowledged.current=true;never.current=skip;try{sessionStorage.setItem(ACK,"true");if(skip)localStorage.setItem(SKIP,"true");else localStorage.removeItem(SKIP);}catch{}setOpen(false);}
  function newTest(){if(!never.current){acknowledged.current=false;try{sessionStorage.removeItem(ACK);}catch{}}request();}
  return {open,skip,setSkip,request,show,ready,newTest,dismiss:()=>setOpen(false)};
}
