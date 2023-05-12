// NOTE/TODO: there is a grpc client that is faster, but it is "work in progress",
// so we're waiting and will switch later.
// See https://github.com/qdrant/qdrant-js/blob/master/packages/js-client-rest/src/qdrant-client.ts
import { QdrantClient } from "@qdrant/js-client-rest";
import { getServerSettings } from "@cocalc/server/settings/server-settings";

const COLLECTION_NAME = "cocalc";
const SIZE = 1536; // that's for the openai embeddings api

let _client: null | QdrantClient = null;
export async function getClient(): Promise<QdrantClient> {
  if (_client != null) {
    return _client;
  }
  const { qdrant_cluster_url: url, qdrant_api_key: apiKey } =
    await getServerSettings();
  if (!url) {
    throw Error("Qdrant Cluster URL not configured");
  }
  // don't necessarily require apiKey to be nontrivial, e.g., not needed locally for dev purposes.
  // We polyfill fetch so cocalc still works with node 16.  With node 18 this isn't needed.
  // Node 16 is end-of-life soon and we will stop supporting it.
  if (global.Headers == null) {
    const { default: fetch, Headers } = await import("node-fetch");
    global.Headers = Headers;
    global.fetch = fetch;
  }
  const client = new QdrantClient({
    url,
    ...(apiKey ? { apiKey } : undefined),
  });
  await init(client);
  _client = client;
  return client;
}

async function createIndexes(client) {
  // It seems fine to just call this frequently.
  // There also might not be any way currently to know whether this index exists.
  // Note that it was only a few months ago when indexes got added to qdrant!
  await client.createPayloadIndex(COLLECTION_NAME, {
    field_name: "url",
    field_schema: {
      type: "text",
      tokenizer: "prefix",
      min_token_len: 2,
      //  should be more than enough, since the maximum length of a filename is 255 characters; the url field is
      // of the form "\projects/project_id/files/[filename]#fragmentid", so should easily fit in 1000 characters.
      max_token_len: 1000,
      lowercase: false,
    },
  });
}

async function createCollection(client) {
  // define our schema.
  await client.createCollection(COLLECTION_NAME, {
    vectors: {
      size: SIZE,
      distance: "Cosine", // pretty standard to use cosine
    },
    // Use quantization to massively reduce memory and space requirements, as explained here:
    // see https://qdrant.tech/documentation/quantization/#setting-up-scalar-quantization
    quantization_config: {
      scalar: {
        type: "int8",
        quantile: 0.99,
        always_ram: true,
      },
    },
  });
}

async function init(client) {
  const { collections } = await client.getCollections();
  const collectionNames = collections.map((collection) => collection.name);
  if (!collectionNames.includes(COLLECTION_NAME)) {
    await createCollection(client);
  }
  await createIndexes(client);
}

export type Payload =
  | { [key: string]: unknown }
  | Record<string, unknown>
  | null
  | undefined;

export interface Point {
  id: string | number;
  vector: number[];
  payload?: Payload;
}

export async function upsert(data: Point[]) {
  const client = await getClient();
  await client.upsert(COLLECTION_NAME, {
    wait: true,
    points: data,
  });
}

export async function search({
  id,
  vector,
  limit,
  filter,
  selector,
  offset,
}: {
  vector?: number[];
  id?: string | number;
  limit: number;
  filter?: object;
  selector?;
  offset?: number;
}) {
  const client = await getClient();
  if (id) {
    return await client.recommend(COLLECTION_NAME, {
      positive: [id],
      limit,
      filter,
      with_payload: selector == null ? true : selector,
      offset,
    });
  } else if (vector) {
    return await client.search(COLLECTION_NAME, {
      vector,
      limit,
      filter,
      with_payload: selector == null ? true : selector,
      offset,
    });
  } else {
    throw Error("id or vector must be specified");
  }
}

export async function scroll({
  limit,
  filter,
  selector,
  offset,
}: {
  limit: number;
  filter: object;
  selector?;
  offset?: number | string;
}) {
  const client = await getClient();
  return await client.scroll(COLLECTION_NAME, {
    limit,
    filter,
    with_payload: selector == null ? true : selector,
    offset,
  });
}

// See https://github.com/qdrant/qdrant-js/tree/master/packages/js-client-rest/src/api for how all this works.

export async function getPoints(opts): Promise<any> {
  const client = await getClient();
  const result = await client
    .api("points")
    .getPoints({ collection_name: COLLECTION_NAME, ...opts });
  return result.data.result;
}

export async function deletePoints(opts): Promise<any> {
  const client = await getClient();
  const result = await client
    .api("points")
    .deletePoints({ collection_name: COLLECTION_NAME, ...opts });
  return result.data.result;
}
