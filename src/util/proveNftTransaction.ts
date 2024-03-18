import { Action } from "@greymass/eosio"
import { getChainClient } from "lib/eosio"
import { findAction, getProof, makeEmitSchemaProveAction, makeEmitTemplateProveAction, makeNftIdXferProveAction, makeNftXferProveAction, makeProofAction, makeXferProveAction } from "lib/ibcUtil"
import logger from "lib/logger"
import { ProofRequestType } from "lib/types/ibc.types"
import { throwErr } from "lib/utils"
const log = logger.getLogger("test")

const txid = "f5fff7e6072f403d789031fe76b1d0276e3261e93da14afcab504ee7a02bed89"
const blockNum = 362272326
let proofType:ProofRequestType = "heavyProof"
const chains = {
  from: getChainClient("eos"),
  to: getChainClient("tlos")
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
  const data = await findAction(chains.from, txid, blockNum)
  // console.log(lastProvenBlock)
  const proof = await getProof(chains.from, data, lastProvenBlock)
  const actionName = data.actionName
  let action = await makeProofAction(actionName, chains.from, chains.to, data, proof, proofType, block_merkle_root)
  // console.log(JSON.stringify(action, null, 2))
  const result = await chains.to.sendAction(action)
  console.log(result)
} catch (error) {
  log.error(error)
}


// console.log(JSON.stringify(actionData, null, 2))


