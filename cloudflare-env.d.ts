declare namespace Cloudflare {
  interface Env {
    DB?: D1Database;
    BUCKET?: R2Bucket;
    SHOOTOUT_FAILURES_QUERY_URL?: string;
  }
}
