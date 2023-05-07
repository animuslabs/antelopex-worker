// import { Action, NameType, UInt32 } from "@greymass/eosio"
// import env from "lib/env"
// import { Addfahpoints, Claimunstake } from "lib/types/antelopex.system.types"
// const authorization = [{ actor: env.worker.account, permission: env.worker.permission }]

// function createAct(name:string, data:Record<string, any> = {}, account = env.contracts.system) {
//   return Action.from({ account, name, authorization, data })
// }

// export const sysActions = {
//   addFahPoints: (data:{ account:NameType, add_fah_points:number | UInt32 }) => createAct("addfahpoints", Addfahpoints.from(data)),
//   claimUnstake: (data:{ account:NameType }) => createAct("claimunstake", Claimunstake.from(data))
// }

// export const actions = {
//   sys: sysActions
// }
