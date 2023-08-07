import { Action, Asset, NameType, UInt32 } from "@greymass/eosio"
import { getConfig } from "lib/env"
import { Actionproof, Heavyproof, Lightproof } from "lib/types/ibc.prove.types"
import { ChainKey } from "lib/types/ibc.types"
import { Withdrawa, Withdrawb } from "lib/types/wraplock.types"
import { Issuea, Issueb, Retire } from "lib/types/wraptoken.types"


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
      createAct("issueb", Issueb.from({ ...data, prover: getConfig(chain).worker.account }), contract, chain)
  },
  lockToken: {
    withdrawA: (
      data:{ blockproof:Heavyproof, actionproof:Actionproof }, contract:NameType, chain:ChainKey) =>
      createAct("withdrawa", Withdrawa.from({ ...data, prover: getConfig(chain).worker.account }), contract, chain),
    withdrawB: (
      data:{ blockproof:Lightproof, actionproof:Actionproof }, contract:NameType, chain:ChainKey) =>
      createAct("withdrawb", Withdrawb.from({ ...data, prover: getConfig(chain).worker.account }), contract, chain)
  }



}

// export const actions = {
//   sys: sysActions
// }
