import { getChainClient } from "lib/eosio"
import { getEmitXferMeta, getProof, makeXferProveAction } from "lib/ibcUtil"
import logger from "lib/logger"
import { ProofRequestType } from "lib/types/ibc.types"
import { throwErr } from "lib/utils"
const log = logger.getLogger("test")

const txid = "afa5f09585eb4da54cc64c08f3f21a80c621e643e198cabd31ed78ea838170c3"
const blockNum = 314265804
const proofType:ProofRequestType = "lightProof"
const chains = {
  from: getChainClient("tlos"),
  to: getChainClient("eos")
}
let lastProvenBlock:number | undefined
let block_merkle_root:string |undefined
if (proofType === "lightProof") {
  const lastProvenBlockRows = await chains.to.getTableRowsJson({ reverse: true, json: true, code: "ibc.prove", scope: chains.from.name, table: "lastproofs", limit: 1 })
  // let light = lastBlockProvedRes && lastBlockProvedRes.block_height > block_to_prove;
  console.log("lastProvenBlockRow", lastProvenBlockRows)
  lastProvenBlock = lastProvenBlockRows[0].block_height
  block_merkle_root = lastProvenBlockRows[0].block_merkle_root
  if (!lastProvenBlock) throwErr("can't find lastProvenBlock for light proof")
}

try {
  const data = await getEmitXferMeta(chains.from, txid, blockNum)
  console.log(lastProvenBlock)
  const proof = await getProof(chains.from, data, lastProvenBlock)
  const action = await makeXferProveAction(chains.from, chains.to, data, proof, proofType, block_merkle_root)
  console.log(JSON.stringify(action, null, 2))

  const result = await chains.to.sendAction(action)
  console.log(result)
} catch (error) {
  log.error(error)
}


// console.log(JSON.stringify(actionData, null, 2))


