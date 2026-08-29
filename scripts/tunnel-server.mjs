import { createServer } from "net";
import { request } from "undici";

const PROXY_HOST = "192.168.43.1";
const PROXY_PORT = 8080;
const LOCAL_PORT = 27018;

// Resolve MongoDB Atlas hostnames via DNS-over-HTTPS through proxy
async function resolveHost(hostname) {
  const dispatcher = new (await import("undici")).ProxyAgent(`http://${PROXY_HOST}:${PROXY_PORT}`);
  const url = `https://dns.google/resolve?name=${hostname}&type=A`;
  const { body } = await request(url, { dispatcher });
  const data = await body.json();
  const answers = data.Answer || [];
  const ips = answers.filter((r) => r.type === 1).map((r) => r.data);
  return ips[0];
}

// Get the resolved IPs for all 3 shards
async function getShardHosts() {
  const shards = [
    "ac-f2bljlv-shard-00-00.wuajow8.mongodb.net",
    "ac-f2bljlv-shard-00-01.wuajow8.mongodb.net",
    "ac-f2bljlv-shard-00-02.wuajow8.mongodb.net",
  ];
  const hosts = [];
  for (const shard of shards) {
    const ip = await resolveHost(shard);
    hosts.push({ hostname: shard, ip, port: 27017 });
    console.log(`Resolved ${shard} -> ${ip}`);
  }
  return hosts;
}

// Create local TCP tunnel server
function createTunnelServer(hosts) {
  const server = createServer((clientSocket) => {
    // When a local connection comes in, tunnel it through the proxy to MongoDB
    // We pick the first shard (the driver will handle replica set discovery)
    const target = hosts[0];
    
    const connectReq = require("http").request({
      host: PROXY_HOST,
      port: PROXY_PORT,
      method: "CONNECT",
      path: `${target.ip}:${target.port}`,
      headers: { Host: `${target.hostname}:${target.port}` },
      timeout: 10000,
    });

    connectReq.on("connect", (res, serverSocket) => {
      if (res.statusCode === 200) {
        // Bidirectional pipe
        clientSocket.pipe(serverSocket);
        serverSocket.pipe(clientSocket);
      } else {
        console.error(`CONNECT failed: ${res.statusCode}`);
        clientSocket.destroy();
      }
    });

    connectReq.on("error", (e) => {
      console.error("CONNECT error:", e.message);
      clientSocket.destroy();
    });

    connectReq.on("timeout", () => {
      console.error("CONNECT timeout");
      connectReq.destroy();
      clientSocket.destroy();
    });

    connectReq.end();

    clientSocket.on("error", () => {});
  });

  server.listen(LOCAL_PORT, "127.0.0.1", () => {
    console.log(`\nTunnel server listening on 127.0.0.1:${LOCAL_PORT}`);
    console.log(`Point MongoDB connection to: mongodb://user:pass@127.0.0.1:${LOCAL_PORT}/db`);
  });

  return server;
}

async function main() {
  console.log("Resolving MongoDB Atlas shard hosts via DNS-over-HTTPS through proxy...");
  const hosts = await getShardHosts();
  
  if (hosts.some((h) => !h.ip)) {
    console.error("Failed to resolve some hosts!");
    process.exit(1);
  }

  console.log("\nCreating local TCP tunnel...");
  createTunnelServer(hosts);
}

main();
