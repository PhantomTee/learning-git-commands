import { createClient, createAccount } from "genlayer-js";
import { studionet } from "genlayer-js/chains";

const account = createAccount("0x9eb8793aee507bf451beda472799b54b70de8812b9cffb43a33b8ecf9123c93a");
const client = createClient({ chain: studionet, account });

// Fund
await client.request({ method: "sim_fundAccount", params: [account.address, "0x3635c9adc5dea00000"] }).catch(() => {});

const minimalCode = `
from genlayer import *

class Simple(gl.Contract):
    _state: TreeMap[str, u256]

    def __init__(self) -> None:
        self._state["count"] = u256(0)

    @gl.public.view
    def get_count(self) -> u256:
        return self._state["count"]
`;

console.log("Deploying minimal test contract…");
const hash = await client.deployContract({ code: minimalCode, args: [], account });
console.log("tx hash:", hash);

const receipt = await client.waitForTransactionReceipt({ hash, status: "ACCEPTED", retries: 60, interval: 3000 });
console.log("status_name:", receipt.status_name ?? receipt.statusName);
console.log("to_address:", receipt.to_address);
console.log("contract_address:", receipt.data?.contract_address ?? receipt.contractAddress);

if (receipt.to_address || receipt.data?.contract_address) {
  const addr = receipt.data?.contract_address ?? receipt.to_address;
  const result = await client.readContract({ address: addr, functionName: "get_count", args: [] }).catch(e => "Error: " + e.message);
  console.log("get_count result:", result);
}
