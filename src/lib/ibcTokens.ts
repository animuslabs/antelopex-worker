import { Asset, NameType } from "@greymass/eosio"
import { Name } from "@wharfkit/antelope"
import { ChainClient, chainClients } from "lib/eosio"
import { IbcNft, IbcToken } from "lib/types/antelopex.system.types"
import { ChainKey, IbcSymbols, chainNames } from "lib/types/ibc.types"
import { throwErr } from "lib/utils"

export const ibcSymbols = ["EOS", "TLOS", "WAX", "UX", "UTXRAM", "BOID"] as const

export type IBCTokens = Record<string, IbcToken>
export type IBCNfts = Record<string, IbcNft>
export type IBCTokenCache = Record<ChainKey, IBCTokens>
export type IBCNftCache = Record<ChainKey, IBCNfts>

function initIBCTokenCache() {
  let cache:any = {}
  chainNames.forEach(name => cache[name] = {})
  return cache as IBCTokenCache
}
function initIBCNftCache() {
  let cache:any = {}
  chainNames.forEach(name => cache[name] = {})
  return cache as IBCNftCache
}
const ibcTokens:IBCTokenCache = initIBCTokenCache()
const ibcNfts:IBCNftCache = initIBCNftCache()


export async function getIBCToken(chain:ChainClient, symbol:Asset.Symbol) {
  const existing = ibcTokens[chain.name][symbol.code.toString()]
  if (existing) return existing
  const rows = await chain.getTableRows({ code: chain.config.contracts.system, table: "ibctokens", upper_bound: symbol.value, lower_bound: symbol.value, limit: 1, type: IbcToken })
  const row = rows[0]
  if (!row) throwErr(`Can't find row for ${symbol.toString()} on ${chain.config.chain}`)
  ibcTokens[chain.name][symbol.code.toString()] = row
  return row
}
export async function getIBCNft(chain:ChainClient, contract:Name) {
  const existing = ibcNfts[chain.name][contract.toString()]
  if (existing) return existing
  const rows = await chain.getTableRows({ code: chain.config.contracts.system, table: "ibcnfts", upper_bound: contract, lower_bound: contract, limit: 1, type: IbcNft })
  const row = rows[0]
  if (!row) throwErr(`Can't find row for ${contract.toString()} on ${chain.config.chain}`)
  ibcNfts[chain.name][contract.toString()] = row
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

