import { ApolloServer } from "apollo-server-express";
import cors from "cors";
import express from "express";
import { config } from "./config.js";
import { resolvers } from "./graphql/resolvers.js";
import { typeDefs } from "./graphql/schema.js";

const app = express();
app.use(cors());

const server = new ApolloServer({ typeDefs, resolvers });

async function start() {
  await server.start();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  server.applyMiddleware({ app: app as any, path: "/graphql" });

  // Kubernetes readiness/liveness: plain HTTP health
  app.get("/health", (_req, res) => {
    res.status(200).json({ status: "ok" });
  });

  app.listen(config.port, () => {
    console.log(
      `Server ready at http://localhost:${config.port}${server.graphqlPath}`
    );
  });
}

start().catch((err) => {
  console.error(err);
  process.exit(1);
});
