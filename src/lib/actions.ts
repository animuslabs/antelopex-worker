import { Action, Asset, NameType, UInt32 } from "@greymass/eosio"
import { getConfig } from "lib/env"
import { Actionproof, Checkproofd, Heavyproof, Lightproof } from "lib/types/ibc.prove.types"
import { ChainKey } from "lib/types/ibc.types"
import { Withdrawa, Withdrawb } from "lib/types/wraplock.types"
import { Issuea, Issueb, Retire } from "lib/types/wraptoken.types"
import { Types as WrapToken } from "lib/types/wraptoken.nft.types"
import { Types as WrapLock } from "lib/types/wraplock.nft.types"
import { ChainClient, DoActionResponse } from "lib/eosio"
import { IbcOrder, IbcSpecialOrder } from "lib/types/antelopex.system.types"
import { throwErr } from "lib/utils"
import logger from "lib/logger"
import { UpdateOrderError, UpdateSpecialOrderError, orderRelayed, specialOrderRelayed } from "lib/dbHelpers"
const log = logger.getLogger("actions")

function createAct(name:string, data:Record<string, any> = {}, account:NameType, chain:ChainKey) {
  const config = getConfig(chain)
  const authorization = [{ actor: config.worker.account, permission: config.worker.permission }]
  return Action.from({ account, name, authorization, data })
}

export const actions = {
  wrapToken: {
    issueA: (
      data:{ blockProof:Heavyproof, actionProof:Actionproof }, contract:NameType, chain:ChainKey) =>
      createAct("issuea", Issuea.from({ ...data, prover: getConfig(chain).worker.account }), contract, chain),
    issueB: (
      data:{ blockproof:Lightproof, actionProof:Actionproof }, contract:NameType, chain:ChainKey) =>
      createAct("issueb", Issueb.from({ ...data, prover: getConfig(chain).worker.account }), contract, chain),
    initschemaA: (
      data:{ blockProof:Heavyproof, actionProof:Actionproof }, contract:NameType, chain:ChainKey) =>
      createAct("initschemaa", WrapToken.initschemaa.from({ ...data, prover: getConfig(chain).worker.account }), contract, chain),
    initschemaB: (
      data:{ blockproof:Lightproof, actionProof:Actionproof }, contract:NameType, chain:ChainKey) =>
      createAct("initschemab", WrapToken.initschemab.from({ ...data, prover: getConfig(chain).worker.account }), contract, chain),
    initTemplateA: (
      data:{ blockProof:Heavyproof, actionProof:Actionproof }, contract:NameType, chain:ChainKey) =>
      createAct("initemplata", WrapToken.initemplata.from({ ...data, prover: getConfig(chain).worker.account }), contract, chain),
    initTemplateB: (
      data:{ blockproof:Lightproof, actionProof:Actionproof }, contract:NameType, chain:ChainKey) =>
      createAct("initemplatb", WrapToken.initemplatb.from({ ...data, prover: getConfig(chain).worker.account }), contract, chain)
  },
  lockToken: {
    withdrawA: (
      data:{ blockproof:Heavyproof, actionproof:Actionproof }, contract:NameType, chain:ChainKey) =>
      createAct("withdrawa", Withdrawa.from({ ...data, prover: getConfig(chain).worker.account }), contract, chain),
    withdrawB: (
      data:{ blockproof:Lightproof, actionproof:Actionproof }, contract:NameType, chain:ChainKey) =>
      createAct("withdrawb", Withdrawb.from({ ...data, prover: getConfig(chain).worker.account }), contract, chain)
  },
  bridge: {
    checkproofD: (blockproof:Heavyproof, chain:ChainKey, contract:NameType = "ibc.prove") => createAct("checkproofd", Checkproofd.from({ blockproof }), contract, chain)
  }



}

export async function handleTrxResult(result:DoActionResponse, specialOrder:boolean, order:IbcSpecialOrder|IbcOrder, toChain:ChainClient) {
  const receipt = result.receipts[0]
  if (!receipt) {
    const error = result.errors[0]?.error
    if (!error) throwErr("Receipt and error fields missing")
    log.error(`Error for order ${order.trxid.toString()}: ${error}`)
    specialOrder ? await UpdateSpecialOrderError(order as IbcSpecialOrder, new Error(error)) : await UpdateOrderError(order, new Error(error))
    return
  } else {
    const txid = receipt.receipt.id
    log.debug(`Order ${order.trxid.toString()} relayed with transaction ID: ${txid}`) // DEBUG log
    specialOrder ? await specialOrderRelayed(order as IbcSpecialOrder, txid, toChain.name) : await orderRelayed(order, txid, toChain.name)
  }
}
