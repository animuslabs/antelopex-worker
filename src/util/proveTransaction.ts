import { getChainClient } from "lib/eosio"
import { getEmitXferMeta, getProof, makeXferProveAction } from "lib/ibcUtil"
import logger from "lib/logger"
import { ProofRequestType } from "lib/types/ibc.types"
import { throwErr } from "lib/utils"
const log = logger.getLogger("test")

const txid = "1f2b66d66d10fe8353acfe3ab7967cf94db2450a431d5035ce5155f5720f3c66"
const blockNum = 314937923
let proofType:ProofRequestType = "heavyProof"
const chains = {
  from: getChainClient("tlos"),
  to: getChainClient("eos")
}
let lastProvenBlock:number | undefined
let block_merkle_root:string |undefined
if (proofType as ProofRequestType == "lightProof") {
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


