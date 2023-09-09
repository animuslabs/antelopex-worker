import { Action, PermissionLevel } from "@greymass/eosio"
import fs from "fs-extra"
import { getChainClient } from "lib/eosio"
import { getEmitXferMeta, getProof, makeXferProveAction } from "lib/ibcUtil"
import logger from "lib/logger"
import { Withdrawa } from "lib/types/wraplock.types"
import { Issuea, Issueb } from "lib/types/wraptoken.types"
import { toObject } from "lib/utils"
const log = logger.getLogger("test")

const txid = "334781dc576d91ffc7a282376e3c3722f6a9ec02adeb1f51ee7af5ca081df819"
const blockNum = 329948896
const chains = {
  from: getChainClient("eos"),
  to: getChainClient("telos")
}

try {
  const data = await getEmitXferMeta(chains.from, txid, blockNum)
  const proof = await getProof(chains.from, data)
  const { destinationChain, action } = await makeXferProveAction(chains.from, data, proof)
  const result = await destinationChain.sendAction(action)
  console.log(result)
} catch (error) {
  log.error(error)
}


// console.log(JSON.stringify(actionData, null, 2))


