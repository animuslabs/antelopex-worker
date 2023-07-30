import { Action, PermissionLevel } from "@greymass/eosio"
import { getChainClient } from "lib/eosio"
import { getProof, getProofRequestData, getProveActionData } from "lib/ibcHelpers"
import logger from "lib/logger"
import { Issuea } from "lib/types/wraptoken.types"
const log = logger.getLogger("test")

const txid = "1fe4be9b7190b64854257eb843d9b600062aca5245ba9211d8c1cfd56896cd59"
const chains = {
  from: getChainClient("telos"),
  to: getChainClient("eos")
}

try {
  const data = await getProofRequestData(chains, txid, "emitxfer", "ibc.wl.eos")
  // log.info(data)

  const proof = await getProof(chains.from, data)
  // // console.log(proof)
  // log.info("get action data")
  const actionData = await getProveActionData(chains.to, data, proof)
  // log.info(actionData.data.actionproof.action)
  const worker = chains.to.config.worker
  const act = Action.from({
    account: "ibc.wt.tlos",
    name: "issuea",
    authorization: [PermissionLevel.from({ actor: worker.account, permission: worker.permission })],
    data: Issuea.from(actionData.data)
  })
  const result = await chains.to.sendAction(act)
  log.info(result)
} catch (error) {
  log.error(error)
}


// console.log(JSON.stringify(actionData, null, 2))


