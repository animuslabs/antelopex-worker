import { Action, PermissionLevel } from "@greymass/eosio"
import fs from "fs-extra"
import { getChainClient } from "lib/eosio"
import { getProof, getProofRequestData, getProveActionData } from "lib/ibcHelpers"
import logger from "lib/logger"
import { Issuea, Issueb } from "lib/types/wraptoken.types"
const log = logger.getLogger("test")

const txid = "b5ba6062e5a014a23708c344d4b1559542a3eb6b8899f8ee4bb838416f9058a0"
const chains = {
  from: getChainClient("eos"),
  to: getChainClient("telos")
}

try {
  const data = await getProofRequestData(chains, txid, "emitxfer", "wl.tlos.boid")
  log.info(data)

  const proof = await getProof(chains.from, data)
  // // // console.log(proof)
  // // log.info("get action data")
  const actionData = await getProveActionData(chains.to, data, proof)
  log.info(actionData.data)
  fs.writeJSONSync("../data.json", actionData.data, { spaces: 2 })
  const worker = chains.to.config.worker
  const act = Action.from({
    account: "wt.boid",
    name: "issuea",
    authorization: [PermissionLevel.from({ actor: worker.account, permission: worker.permission })],
    data: Issuea.from(actionData.data)
    // data: Issueb.from(actionData.data)
  })
  const result = await chains.to.sendAction(act)
  log.info(result)
} catch (error) {
  log.error(error)
}


// console.log(JSON.stringify(actionData, null, 2))


