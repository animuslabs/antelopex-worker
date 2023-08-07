import { Action, PermissionLevel } from "@greymass/eosio"
import fs from "fs-extra"
import { getChainClient } from "lib/eosio"
import { getProof, getProofRequestData, getProveActionData } from "lib/ibcHelpers"
import logger from "lib/logger"
import { Withdrawa } from "lib/types/wraplock.types"
import { Issuea, Issueb } from "lib/types/wraptoken.types"
const log = logger.getLogger("test")

const txid = "a4bad16fed831d8d8c9b6b99da047a5bad83aecf159217bed116e1eeb71ce95c"
const chains = {
  from: getChainClient("telos"),
  to: getChainClient("eos")
}

try {
  const data = await getProofRequestData(chains.from, txid, "emitxfer", "wt.boid")
  log.info(data)

  const proof = await getProof(chains.from, data)
  // // // console.log(proof)
  // // log.info("get action data")
  const actionData = await getProveActionData(chains.to, data, proof)
  log.info(actionData.data)
  fs.writeJSONSync("../data.json", actionData.data, { spaces: 2 })
  const worker = chains.to.config.worker
  const act = Action.from({
    account: "wl.tlos.boid",
    name: "withdrawa",
    authorization: [PermissionLevel.from({ actor: worker.account, permission: worker.permission })],
    data: Withdrawa.from(actionData.data)
    // data: Issueb.from(actionData.data)
  })
  const result = await chains.to.sendAction(act)
  log.info(result)
} catch (error) {
  log.error(error)
}


// console.log(JSON.stringify(actionData, null, 2))


