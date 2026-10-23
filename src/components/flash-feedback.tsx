import { cookies } from "next/headers";
import { FLASH_COOKIE } from "@/lib/toast";
import { Toaster } from "./toaster";

// Cookie mutations rerender this boundary even when an action redirects to the
// same URL. Keep the runtime read inside Suspense so public pages can prerender.
export async function FlashFeedback() {
  const flash = (await cookies()).get(FLASH_COOKIE)?.value;
  return <Toaster flash={flash} />;
}
