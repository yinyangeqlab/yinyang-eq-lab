// Read directly so an admin change takes effect on the next request at every edge.
export async function invitesEnabled(db) {
  const row = await db.prepare('SELECT invites_enabled FROM site_access_settings WHERE id=1').first();
  return row?.invites_enabled === 1;
}
export const testerSubject = id => id.startsWith('open-') ? `browser:${id.slice(5)}` : `invite:${id}`;
