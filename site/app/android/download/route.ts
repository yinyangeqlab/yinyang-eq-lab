const managerReleaseAsset = "https://github.com/yinyangeqlab/yinyang-android/releases/latest/download/YinYang-APK-Manager.apk";

export function GET() {
  return new Response(null, {
    status: 302,
    headers: {
      "Cache-Control": "no-store",
      Location: managerReleaseAsset,
    },
  });
}
