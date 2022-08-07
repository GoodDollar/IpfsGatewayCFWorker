import { Web3Storage } from 'web3.storage'
import { CID } from 'multiformats/cid'

async function handleRequest(request, storage) {
  const corsHeaders = getCorsHeaders(request)
  const isAllowed = corsHeaders['Access-Control-Allow-Origin'] !== ''
  if (!isAllowed) {
    return new Response(JSON.stringify({ error: 'origin not allowed' }), { status: 400 })
  }
  // Parse the request to FormData
  const formData = await request.formData()
  // Get the File from the form. Key for the file is 'image' for me
  const file = formData.get('file')
  const cid = await storage.put([file], { wrapWithDirectory: false, maxRetries: 3 }).catch(e => console.log(e))
  return new Response(JSON.stringify({ cid }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
}

const getCorsHeaders = request => {
  const origin = request.headers.get('Origin') || ''
  const isAllowed = origin.match(/gooddollar\.org$|good.*\.netlify\.app$|goodceramic\-*\.herokuapp\.com$|\/\/localhost/)
  const corsHeaders = {
    'Access-Control-Allow-Origin': isAllowed ? origin : '',
    'Access-Control-Allow-Methods': 'GET, HEAD, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Credentials': 'true'
  }
  return corsHeaders
}

async function handleOptions(request) {
  const corsHeaders = getCorsHeaders(request)
  return new Response(null, {
    headers: corsHeaders
  })
}

export default {
  async fetch(request, env, context) {
    switch (request.method) {
      case 'OPTIONS':
        return handleOptions(request)
      case 'POST': {
        const storage = new Web3Storage({
          token: env.WEB3STORAGE_TOKEN
        })

        return handleRequest(request, storage)
      }
      default:
        return new Response(JSON.stringify({ error: 'method not allowed' }), { status: 400 })
    }
  }
}
