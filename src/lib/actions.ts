import { Action, Asset, NameType, UInt32 } from "@greymass/eosio"
import { getConfig } from "lib/env"
import { Actionproof, Checkproofd, Heavyproof, Lightproof } from "lib/types/ibc.prove.types"
import { ChainKey } from "lib/types/ibc.types"
import { Withdrawa, Withdrawb } from "lib/types/wraplock.types"
import { Issuea, Issueb, Retire } from "lib/types/wraptoken.types"
import { Types as WrapToken } from "lib/types/wraptoken.nft.types"
import { Types as WrapLock } from "lib/types/wraplock.nft.types"


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

// export const actions = {
//   sys: sysActions
// }
