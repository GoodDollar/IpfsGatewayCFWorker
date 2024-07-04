import { CID } from "multiformats/cid";
import { NFTStorage } from "nft.storage";
import upng from "upng-js";
import { URL } from "whatwg-url";
import { getClient } from "./w3up";
import { Buffer } from "buffer";

globalThis.URL = URL; //fix url parsing dids for w3up
let env;

const optimizeImage = async (file) => {
  try {
    const decoded = upng.decode(await file.arrayBuffer());
    const frames = upng.toRGBA8(decoded);
    const optimized = Buffer.from(
      upng.encode(frames, decoded.width, decoded.height, 256)
    );
    console.log(
      `image optimized: ${file.size} to ${optimized.length} %:${(
        optimized.length / file.size
      ).toFixed(2)}`
    );
    return new Blob([optimized]);
  } catch (e) {
    console.error("not png?", e.message);
    return file;
  }
};




//   // Parse the request to FormData
//   const formData = await request.formData();
//   // Get the File from the form. Key for the file is 'image' for me
//   const file = formData.get("file");
//   const optimized = await optimizeImage(file);
//   const cid = await storage
//     .put([optimized], { wrapWithDirectory: false, maxRetries: 3 })
//     .catch((e) => console.log(e));

//   return new Response(JSON.stringify({ cid }), {
//     headers: { ...corsHeaders, "Content-Type": "application/json" },
//   });
// }

async function handleRequestW3up(request, env) {
  const client = await getClient({
    pk: env.WEB3STORAGE_PK,
    proof: env.WEB3STORAGE_PROOF,
  });

  const { corsHeaders } = getCorsHeaders(request);

  // Parse the request to FormData
  const formData = await request.formData();
  // Get the File from the form. Key for the file is 'image' for me
  const file = formData.get("file");
  const optimized = await optimizeImage(file);

q  const cid = await client
    .uploadFile(optimized, { retries: 0 })
    .catch((e) => console.log(e));

  return new Response(JSON.stringify({ cid: cid.toString() }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function handleRequestNft(request) {
  const nftstorage = new NFTStorage({
    token: env.NFTSTORAGE_TOKEN,
  });
  const { corsHeaders } = getCorsHeaders(request);

  // Parse the request to FormData
  const formData = await request.formData();
  // Get the File from the form. Key for the file is 'image' for me
  const file = formData.get("file");
  const optimized = await optimizeImage(file);
  const cid = await nftstorage
    .storeBlob(optimized, { wrapWithDirectory: false, maxRetries: 3 })
    .catch((e) => console.log(e));
  return new Response(JSON.stringify({ cid }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

const getCorsHeaders = (request) => {
  const origin = request.headers.get("Origin") || "";
  const isAllowed = origin.match(
    /gooddollar\.org$|good.*\.netlify\.app$|goodceramic\-.*\.herokuapp\.com$|\/\/localhost/
  );

  const corsHeaders = {
    "Access-Control-Allow-Origin": isAllowed ? origin : "",
    "Access-Control-Allow-Methods": "GET, HEAD, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Allow-Credentials": "true",
  };

  return { isAllowed, corsHeaders };
};

async function handleOptions(request) {
  const { corsHeaders } = getCorsHeaders(request);

  return new Response(null, {
    headers: corsHeaders,
  });
}

export default {
  async fetch(request, myenv, context) {
    env = myenv; //store env in globals so its available in methods

    switch (request.method) {
      case "OPTIONS":
        return handleOptions(request);
      case "POST": {
        const { isAllowed, corsHeaders } = getCorsHeaders(request);
        if (!isAllowed) {
          return new Response(JSON.stringify({ error: "origin not allowed" }), {
            status: 400,
          });
        }
        let response;
        try {
          if (env.USE_WEB3STORAGE) {
            response = await handleRequestW3up(request, env);
          } else response = await handleRequestNft(request);
          return response;
        } catch (e) {
          console.error("ipfsgateway request failed", e.message, e);
          return new Response(JSON.stringify({ error: e.message }), {
            status: 400,
          });
        }
      }
      default:
        return new Response(JSON.stringify({ error: "method not allowed" }), {
          status: 400,
        });
    }
  },
};
