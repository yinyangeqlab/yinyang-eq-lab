"use client";
import "./service-warning.css";
import {MAINTENANCE_FEATURES,maintenanceLocks} from "@/lib/maintenance-options";

import { useEffect, useRef, useState } from "react";
import { SERVICE_WARNING_EVENT, warningFor, type ServiceWarning } from "@/lib/service-warning";

export function ServiceWarningCard({ warning, onDismiss }: { warning: ServiceWarning; onDismiss: () => void }) {
  return <div className="service-warning-popup" role="alert" aria-label={warning.title}>
    <span className="service-warning-icon" aria-hidden="true">♡</span>
    <div className="service-warning-content"><strong>{warning.title}</strong><div className="service-warning-message"><p>{warning.detail}</p>{warning.retry && <p className="service-warning-retry">{warning.retry}</p>}</div><details className="service-warning-details"><summary>Details</summary><p>{warning.detail}</p>{warning.retry && <p className="service-warning-retry">{warning.retry}</p>}</details></div>
    <button type="button" aria-label="Dismiss service warning" onClick={onDismiss}>×</button>
  </div>;
}

export default function ServiceWarningPopup() {
  const [warning, setWarning] = useState<ServiceWarning | null>(null);
  const [notice,setNotice]=useState<ServiceWarning|null>(null);
  const dismissed=useRef("");
  const currentNotice=useRef("");
  useEffect(()=>{
    let stopped=false,busy=false;
    const check=async()=>{
      if(busy||document.visibilityState==="hidden")return;
      busy=true;
      try{
        const r=await fetch("/api/maintenance",{cache:"no-store",signal:AbortSignal.timeout(8000)});
        if(!r.ok)return;
        const status=await r.json() as {id?:string;active?:boolean;message?:string;pauseSubmissions?:boolean;lockedFeatures?:unknown;ownerOnly?:boolean;viewerHasAccess?:boolean};
        if(stopped)return;
        if(status.ownerOnly){
          if(status.viewerHasAccess!==true){window.location.reload();return;}
          const id=status.id||"owner-only-maintenance";currentNotice.current=id;
          if(dismissed.current!==id)setNotice({kind:"maintenance",title:"Closed for private testing",detail:status.message||"The site remains closed to visitors while updates are checked.",retry:"Your current session has access. This does not reopen the site."});
          return;
        }
        if(!status.active||!status.id){setNotice(null);currentNotice.current="";dismissed.current="";return;}
        currentNotice.current=status.id;
        const locked=maintenanceLocks(!!status.pauseSubmissions,status.lockedFeatures);
        const unavailable=MAINTENANCE_FEATURES.filter(f=>locked.includes(f.id)).map(f=>f.label).join(", ");
        if(dismissed.current!==status.id)setNotice({kind:"maintenance",title:status.pauseSubmissions?"Maintenance in progress":"A note from YinYang EQ",detail:status.message||"We’re doing maintenance. Thanks for your patience!",retry:status.pauseSubmissions?`Unavailable: ${unavailable}. Other enabled tools remain available.`:null});
      }catch{}finally{busy=false;}
    };
    const wake=()=>void check();void check();
    const timer=window.setInterval(wake,60_000);
    window.addEventListener("focus",wake);document.addEventListener("visibilitychange",wake);
    return()=>{stopped=true;clearInterval(timer);window.removeEventListener("focus",wake);document.removeEventListener("visibilitychange",wake);};
  },[]);
  useEffect(() => {
    const show = (event: Event) => setWarning((event as CustomEvent<ServiceWarning>).detail);
    window.addEventListener(SERVICE_WARNING_EVENT, show);
    const original = window.fetch;
    const monitored: typeof fetch = async (input, init) => {
      const response = await original(input, init);
      const url = new URL(typeof input === "string" ? input : input instanceof URL ? input.href : input.url, window.location.href);
      if (url.origin === window.location.origin && (url.pathname !== "/api/maintenance" && (url.pathname.startsWith("/api/") || url.pathname.startsWith("/__private/") || ["/access","/admin-login","/owner-login"].includes(url.pathname)))) {
        const next = warningFor(response,url.pathname);
        if (next) setWarning(next);
      }
      return response;
    };
    window.fetch = monitored;
    return () => {
      window.removeEventListener(SERVICE_WARNING_EVENT, show);
      if (window.fetch === monitored) window.fetch = original;
    };
  }, []);
  const visible=warning??notice;
  return visible ? <ServiceWarningCard warning={visible} onDismiss={() => {if(warning)setWarning(null);else{dismissed.current=currentNotice.current;setNotice(null);}}} /> : null;
}
