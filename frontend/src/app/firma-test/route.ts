/** POWIĄZANIA
 * Cel: testowy mockup strony firmy (serwuje public/mockup/firma.html) - publicznie dostępny.
 * Przy zmianie: usuwać razem z public/mockup (lista sprzątania C3).
 * AUTO wywoływany z: brak literałów URL w kodzie (cron/skrypt/zewnętrzne narzędzie albo URL sklejany dynamicznie - patrz Cel)
 * AUTO endpoint: GET /firma-test
 */
import { readFile } from "fs/promises";
import path from "path";

export const dynamic = "force-dynamic";

export async function GET() {
  const filePath = path.join(process.cwd(), "public", "mockup", "firma.html");
  const html = await readFile(filePath, "utf-8");
  return new Response(html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}
