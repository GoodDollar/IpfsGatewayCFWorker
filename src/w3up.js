import * as Client from "@web3-storage/w3up-client";
import { StoreMemory } from "@web3-storage/w3up-client/stores/memory";
import * as Signer from "@ucanto/principal/ed25519";
import * as Delegation from "@ucanto/core/delegation";
import { Buffer } from "buffer";

export const getClient = async (
  settings = { pk: undefined, proof: undefined }
) => {
  // Load client with specific private key
  const principal = Signer.parse(settings.pk);
  const store = new StoreMemory();
  const client = await Client.create({ principal, store });

  const delegation = await Delegation.extract(
    new Uint8Array(Buffer.from(settings.proof, "base64"))
  );

  // Add proof that this agent has been delegated capabilities on the space
  const space = await client.addSpace(delegation.ok);
  await client.setCurrentSpace(space.did());
  return client;
};
