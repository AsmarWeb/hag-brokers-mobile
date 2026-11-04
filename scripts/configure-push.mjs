import fs from "node:fs";
import path from "node:path";
const args = process.argv.slice(2);
const arg = (name) => {
  const i = args.indexOf(name);
  return i < 0 ? null : args[i + 1];
};
const project = arg("--project-id"),
  source = arg("--google-services");
if (
  !project ||
  !/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(
    project,
  ) ||
  !source
)
  throw new Error(
    "Provide --project-id UUID and --google-services path to the public Android Firebase configuration.",
  );
const app = JSON.parse(fs.readFileSync("app.json", "utf8"));
if (app.expo.extra?.eas?.projectId && app.expo.extra.eas.projectId !== project)
  throw new Error("STOP: Existing EAS project differs. No files changed.");
const bytes = fs.readFileSync(path.resolve(source));
const firebase = JSON.parse(bytes.toString("utf8"));
if (
  firebase.private_key ||
  firebase.type === "service_account" ||
  !Array.isArray(firebase.client) ||
  !firebase.client.some(
    (c) =>
      c.client_info?.android_client_info?.package_name ===
      app.expo.android.package,
  )
)
  throw new Error(
    "STOP: Use public google-services.json for the matching Android package, never a service-account private key.",
  );
const destination = "google-services.json";
if (fs.existsSync(destination) && !fs.readFileSync(destination).equals(bytes))
  throw new Error(
    "STOP: Local google-services.json differs. Review it before replacing it.",
  );
const backup = path.join(
  "backups",
  "push-config",
  new Date().toISOString().replaceAll(":", "-"),
);
fs.mkdirSync(backup, { recursive: true });
fs.copyFileSync("app.json", path.join(backup, "app.json"));
app.expo.extra = {
  ...app.expo.extra,
  eas: { ...app.expo.extra?.eas, projectId: project },
};
app.expo.android.googleServicesFile = "./google-services.json";
fs.writeFileSync(destination, bytes);
fs.writeFileSync("app.json", JSON.stringify(app, null, 2) + "\n");
console.log(
  "Public Android configuration linked. Private FCM credentials must be configured separately in EAS. No build started.",
);
