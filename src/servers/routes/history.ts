// import db, { Prisma } from "lib/db"
// import * as z from "zod"
// import { route } from "../trpc"
// import Logger from "lib/logger"
// import { getTableFromAction } from "lib/injest"
// import ms from "ms"
// import { parseISOString, removeDuplicates, toObject } from "lib/utils"

// const log = Logger.getLogger("history-api")

// export const actions = route
//   .input(z.object({
//     actions: z.array(z.string()).nonempty(),
//     start: z.string().optional(),
//     end: z.string().optional(),
//     sort: z.string().optional(),
//     limit: z.number().lte(100).gt(0).optional(),
//     filter: z.object({
//       antelopex_id: z.string()
//     }).optional(),
//     skip: z.number().optional()
//   }))
//   .query(async({ ctx, input }) => {
//     try {
//       const inputStr = JSON.stringify(input, null, 2)
//       log.info(inputStr)
//       let rows:Record<string, any> = {}
//       let where:any = {
//         timeStamp: {
//           gte: input.start ? parseISOString(input.start) : new Date(Date.now() - ms("180d"))
//         },
//         AND: {
//           timeStamp: { lte: input.end ? parseISOString(input.end) : new Date() }
//         }
//       }
//       if (input.filter) where = Object.assign(where, input.filter)
//       let sort:Prisma.SortOrder = "desc"
//       if (input.sort == "desc" || input.sort == "asc") sort = input.sort
//       for (const action of removeDuplicates(input.actions)) {
//         const table = getTableFromAction(action)
//         let results:any[] = []
//         const params = {
//           where, skip: input.skip, take: input.limit ? input.limit : 10, orderBy: { sequence: sort }
//         }
//         console.log(JSON.stringify(params, null, 2))
//         results = await db[table as any].findMany(params)
//         results.forEach(el => {
//           el.actName = action
//           rows[el.sequence.toString()] = el
//         })
//       }
//       let results = Object.values(rows).map(el => toObject(el))
//       if (!input.sort || input.sort == "asc") results.sort((a, b) => a.sequence - b.sequence)
//       else if (input.sort == "desc") results.sort((a, b) => b.sequence - a.sequence)
//       else throw (new Error("invalid sort param, must be 'asc', 'desc' or not included"))
//       return results
//     } catch (error:any) {
//       log.error(error)
//       log.error("INPUT ERROR:", input)
//       return error.toString()
//     }
//   })
