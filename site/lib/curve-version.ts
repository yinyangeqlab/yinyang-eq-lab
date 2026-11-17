export async function curveVersion(points:string|unknown) {
 const canonical=JSON.stringify(typeof points==="string"?JSON.parse(points):points);
 const bytes=await crypto.subtle.digest("SHA-256",new TextEncoder().encode(canonical));
 return Array.from(new Uint8Array(bytes),x=>x.toString(16).padStart(2,"0")).join("");
}
