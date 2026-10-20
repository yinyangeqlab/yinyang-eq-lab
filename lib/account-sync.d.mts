export const ACCOUNT_SYNC_KEYS:string[];
export function validateAccountValues(values:unknown):Record<string,string>;
export function captureAccountValues(storage:Pick<Storage,'getItem'>):Record<string,string>;
export function mergeAccountValues(base:Record<string,string>,local:Record<string,string>,remote:Record<string,string>):{values:Record<string,string>;conflicts:string[]};
export function applyAccountValues(storage:Pick<Storage,'getItem'|'setItem'|'removeItem'>,values:unknown):void;
