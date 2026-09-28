// Regenerates content/pack.js from content/what_now_v1_vertical_slice.json.
//
// Why: browsers block fetch() of local files when index.html is opened via
// file://. The app therefore loads the pack from a <script> tag. The JSON stays
// the authoritative source; run this after editing it:
//
//   node tools/embed-content.mjs
//
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const src = join(root, "content", "what_now_v1_vertical_slice.json");
const out = join(root, "content", "pack.js");

const pack = JSON.parse(readFileSync(src, "utf8"));
const body =
  "// GENERATED from what_now_v1_vertical_slice.json by tools/embed-content.mjs.\n" +
  "// Do not edit by hand — edit the JSON and re-run the script.\n" +
  "window.WN_PACK = " + JSON.stringify(pack, null, 2) + ";\n";
writeFileSync(out, body);
console.log(`Wrote ${out} (${pack.objects.length} objects, ${pack.bossCases.length} boss cases)`);
