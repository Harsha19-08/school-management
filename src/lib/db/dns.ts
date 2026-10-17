import dns from "node:dns";

export function configureMongoDns(uri: string): void {
  if (!uri.startsWith("mongodb+srv://")) return;
  const servers = (process.env.MONGODB_DNS_SERVERS ?? "8.8.8.8,1.1.1.1")
    .split(",")
    .map((server) => server.trim())
    .filter(Boolean);
  if (servers.length > 0) dns.setServers(servers);
}
