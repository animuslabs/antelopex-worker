// import { Action } from "@proton/hyperion"
// import db from "lib/db"
// import { parseISOString } from "./utils"
// import { configs } from "lib/env"
// import { getActions,  } from "lib/hyp"
// import ms from "ms"
// import Logger from "lib/logger"
// const log = Logger.getLogger("injest")
// const sysContract = config.contracts.system.toString()

// type DBKeys = keyof Partial<typeof db>
// export type ActionMapType = Partial<Record<DBKeys, string>>

// export function getTableFromAction(actionName:string):string {
//   const val = Object.entries(actionMap).find(([key, value]) => value == actionName)
//   if (!val) throw (new Error("invalid action name"))
//   else return val[0]
// }

// export const actionMap:ActionMapType = {
//   logAddPoints: "logaddpoints",
//   initUnstake: "initunstake",
//   claimUnstake: "claimunstake",
//   claim: "claim"
// }

// const sys = {
//   async logAddPoints(action:Action<any>) {
//     try {
//       const data = action.act.data.data || action.act.data
//       const params = {
//         account: data.account,
//         added_fah_points: data.added_fah_points,
//         base_payout: parseFloat(data.base_payout),
//         stake_bonus: parseFloat(data.stake_bonus)
//       }
//       await addRow("logAddPoints", action, params)
//     } catch (error) {
//       log.error(error)
//     }
//   },
//   async initUnstake(action:Action<any>) {
//     try {
//       const data = action.act.data.data || action.act.data
//       const params = {
//         account: data.account,
//         quantity: parseFloat(data.quantity)
//       }
//       await addRow("initUnstake", action, params)
//     } catch (error) {
//       log.error(error)
//     }
//   },
//   async claimUnstake(action:Action<any>) {
//     return basicInjest("claimUnstake", action)
//   },
//   async claim(action:Action<any>) {
//     return basicInjest("claim", action)
//   }
// }

// async function basicInjest(name:keyof ActionMapType, action:Action<any>) {
//   try {
//     const data = action.act.data.data || action.act.data
//     // log.info(data)
//     const params = data
//     await addRow(name, action, params)
//   } catch (error) {
//     log.error(error)
//   }
// }

// function upsertData(action:Action<any>) {
//   return {
//     sequence: action.global_sequence,
//     timeStamp: parseISOString(action["@timestamp"]),
//     trxId: action.trx_id
//   }
// }

// export async function addRow(table:keyof ActionMapType, action:Action<any>, params:any) {
//   const create = Object.assign(upsertData(action), params)
//   const result = await db[table as any].upsert(
//     {
//       where: { sequence: action.global_sequence },
//       create,
//       update: create
//     })
//   // log.info(result)
// }


// let skip:any = {

// }
// export async function getRecentActions(action:string, table:string) {
//   const existing = await db[table as any].findFirst({ orderBy: { timeStamp: "desc" } })
//     .catch(async err => {
//       log.error(err)
//       log.error("critical Error, stopping")
//       await db.$disconnect()
//       process.kill(process.pid, "SIGHUP")
//     })
//   // const existing = await db.logPwrAdd.findFirst({ orderBy: { timeStamp: "desc" } })
//   let after = new Date(Date.now() - ms("24h")).toISOString()
//   if (existing) {
//     after = existing.timeStamp.toISOString()
//     if (after == skip[table]) {
//       const milli = existing.timeStamp.getUTCMilliseconds()
//       existing.timeStamp.setUTCMilliseconds(milli + 1)
//       after = existing.timeStamp.toISOString()
//     }
//   }
//   // const afterSeq = existing?.timeStamp.toISOString()
//   const params:any = {
//     "act.name": action,
//     "act.account": sysContract,
//     limit: config.history?.injestChunkSize || 500,
//     sort: "asc"
//   }
//   if (after) params.after = after
//   // if (afterSeq) params.filter = "global_sequence=" + existing.sequence
//   // log.info(params)
//   const result = await getActions(params)
//   if (!result) return
//   log.info("results", result.actions.length)
//   log.info("query results total:", result.total.value)
//   log.info("actions returned:", result.actions.length)
//   if (result.actions.length > 0) {
//     log.info("first seq", result.actions[0]?.global_sequence)
//     log.info("last seq", result.actions[result.actions.length - 1]?.global_sequence, result.actions[result.actions.length - 1])
//   }

//   for (const act of result.actions) {
//     await sys[table](act)
//   }
//   if (result.actions.length > 0 && result.actions.length < (config.history?.injestChunkSize || 500)) skip[table] = after
// }

// export default { sys }
