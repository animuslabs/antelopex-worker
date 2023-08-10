import { Asset } from "@greymass/eosio"
import { ChainClient, chainClients } from "lib/eosio"
import { IbcToken } from "lib/types/antelopex.system.types"
import { IbcSymbols } from "lib/types/ibc.types"
import { throwErr } from "lib/utils"

export const ibcSymbols = ["EOS", "TLOS", "WAX", "UX", "UTXRAM", "BOID"] as const

export type IBCTokens = Record<string, IbcToken>

const ibcTokens:IBCTokens = {

}

export async function getIBCToken(chain:ChainClient, symbol:Asset.Symbol) {
  const existing = ibcTokens[symbol.code.toString()]
  if (existing) return existing
  const rows = await chain.getTableRows({ code: chain.config.contracts.system, table: "ibctokens", upper_bound: symbol.value, lower_bound: symbol.value, limit: 1, type: IbcToken })
  const row = rows[0]
  if (!row) throwErr(`Can't find row for ${symbol.toString()} on ${chain.config.chain}`)
  ibcTokens[symbol.code.toString()] = row
  return row
}



// export const ibcTokens:IBCTokens = {
//   BOID: {
//     nativeChain: "eos",
//     precision: 4,
//     tokenContract: {
//       eos: "boidcomtoken",
//       telos: "wt.boid",
//       // ux: "ibc.wt.boid",
//       wax: "wt.boid"
//     },
//     wraplockContract: {
//       telos: "wl.tlos.boid",
//       // ux: "ibc.wl.ux",
//       wax: "wl.wax.boid"
//     }
//   },
//   EOS: {
//     nativeChain: "eos",
//     precision: 4,
//     tokenContract: {
//       eos: "eosio.token",
//       telos: "ibc.wt.eos",
//       ux: "ibc.wt.eos",
//       wax: "ibc.wt.eos"
//     },
//     wraplockContract: {
//       telos: "ibc.wl.tlos",
//       ux: "ibc.wl.ux",
//       wax: "ibc.wl.wax"
//     }
//   },
//   TLOS: {
//     nativeChain: "telos",
//     precision: 4,
//     tokenContract: {
//       eos: "ibc.wt.tlos",
//       telos: "eosio.token",
//       ux: "ibc.wt.tlos"
//       // wax: "ibc.wt.tlos"
//     },
//     wraplockContract: {
//       ux: "ibc.wl.ux",
//       eos: "ibc.wl.eos"
//       // wax: "ibc.wl.wax"
//     }
//   },
//   WAX: {
//     nativeChain: "wax",
//     precision: 8,
//     tokenContract: {
//       eos: "ibc.wt.wax",
//       // telos: "ibc.wt.wax",
//       ux: "ibc.wt.wax",
//       wax: "eosio.token"
//     },
//     wraplockContract: {
//       ux: "ibc.wl.ux",
//       eos: "ibc.wl.eos"
//       // telos: "ibc.wl.tlos"
//     }
//   },
//   UX: {
//     nativeChain: "ux",
//     precision: 4,
//     tokenContract: {
//       eos: "ibc.wt.ux",
//       telos: "ibc.wt.ux",
//       wax: "ibc.wt.ux",
//       ux: "eosio.token"
//     },
//     wraplockContract: {
//       telos: "ibc.wl.tlos",
//       eos: "ibc.wl.eos",
//       wax: "ibc.wl.wax"
//     }
//   },
//   UTXRAM: {
//     nativeChain: "ux",
//     precision: 4,
//     tokenContract: {
//       eos: "ibc.wt.ux",
//       telos: "ibc.wt.ux",
//       ux: "eosio.token",
//       wax: "ibc.wt.ux"
//     },

//     wraplockContract: {
//       telos: "ibc.wl.tlos",
//       eos: "ibc.wl.eos",
//       wax: "ibc.wl.wax"
//     }
//   }
// }

