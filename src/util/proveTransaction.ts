import { Action, PermissionLevel } from "@greymass/eosio"
import fs from "fs-extra"
import { getChainClient } from "lib/eosio"
import { getEmitXferMeta, getProof, makeXferProveAction } from "lib/ibcUtil"
import logger from "lib/logger"
import { Withdrawa } from "lib/types/wraplock.types"
import { Issuea, Issueb } from "lib/types/wraptoken.types"
import { toObject } from "lib/utils"
const log = logger.getLogger("test")

const txid = "2abc492417057e511fdedf0ada0852f956a562253a1e09186d7dd38818cb0d6e"
const blockNum = 323793294
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


