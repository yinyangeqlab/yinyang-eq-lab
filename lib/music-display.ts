export function musicDisplayTitle(title: string): string { return title.replace(/\.(mp3|flac|wav|m4a|aac|ogg|opus|aiff?)$/i, ""); }
export function isAnalysisNote(focus: string): boolean { return /borderline|conflicting measures|review required/i.test(focus); }
