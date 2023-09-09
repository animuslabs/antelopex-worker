// import { Asset, Transaction, TransactionHeaderType } from "@greymass/eosio"
// import { ChainClient } from "lib/eosio"
// import { getHypClient } from "lib/hyp"
// import { ChainKey } from "lib/types/ibc.types"
// import { Xfer } from "lib/types/wraplock.types"
// import { throwErr } from "lib/utils"

// export class IBCTransferUtil {
//   sendSymbol?:Asset.Symbol
//   fromChainClient:ChainClient
//   fromChainKey:ChainKey
//   toChain?:ChainClient
//   fromNative?:boolean
//   xferAct?:Xfer
//   txid?:string
//   constructor(fromChain:ChainClient) {
//     this.fromChainClient = fromChain
//     this.fromChainKey = fromChain.config.chain
//   }

//   proveTransaction(txid:string) {

//   }

//   async getActionData(txid:string) {
//     const trx = await getHypClient(this.fromChainKey).getTrx(txid)
//     if (!trx) throwErr(`Transaction not found in ${this.fromChainKey}: ${txid}`)
//     const act = trx.actions.find(a => a.act.name === "emitxfer")
//     if (!act) throwErr("Could not find action emitxfer action")
//     const actData = act.act.data as any
//     const quantityString:string = actData.xfer.quantity.quantity
//     const sym = Asset.from(quantityString).symbol

//     const data:any = { block_to_prove: act.block_num }

//     if (!quantityString) throwErr("Could not find quantity: " + JSON.stringify(actData, null, 2))
//     let returnData = { data } as any
//     if (sym) returnData.sym = sym
//     return returnData
//   }

//   async getLightProofData() {
//     const toChain = await getToChain(sym, act.act.account, fromChain)
//     const row = await getLastProvenBlockRow({ from: fromChain, to: toChain })
//     data.last_proven_block = row.block_height.toNumber()
//     data.root = row.block_merkle_root.toString()
//   }
// }
