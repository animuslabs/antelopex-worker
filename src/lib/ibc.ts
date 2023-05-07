// import { API, Action, AnyAction, NameType } from "@greymass/eosio"
// import * as hyp from "@proton/hyperion"
// import { ChainClient } from "lib/eosio"
// import { IbcToken } from "lib/types/ibc.types"
// import { pickRand } from "lib/utils"

// const sleep = ms => new Promise(resolve => setTimeout(resolve, ms))

// const arrayToHex = (data) => {
//   let result = ""
//   for (const x of data) result += ("00" + x.toString(16)).slice(-2)
//   return result.toUpperCase()
// }

// interface GetProofParams {
//   type?:string
//   action?:hyp.Action<unknown>,
//   onProgress?:(progress:string) =>{ }
// }

// export class IBCTransfer {
//   emitxferAction = null
//   source:ChainClient
//   destination:ChainClient
//   asset:IbcToken
//   sourceWallet:NameType
//   destinationWallet:NameType
//   constructor(source, destination, sourceWallet, destinationWallet, asset) {
//     this.source = source
//     this.destination = destination
//     this.asset = asset
//     this.sourceWallet = sourceWallet
//     this.destinationWallet = destinationWallet
//   }

//   // async waitForLIB(chain, _tx, packedTx, retry_trx_num_blocks) {
//   //   let tx = JSON.parse(JSON.stringify(_tx))

//   //   const transaction_id = tx.processed.id
//   //   let finished = false
//   //   let delay = 500
//   //   while (!finished) {
//   //     await sleep(delay)
//   //     delay *= 1.1
//   //     delay = Math.min(delay, 5000)

//   //     try {
//   //       console.log("check block")
//   //       const block = await chain.rpc.get_block(tx.processed.block_num)

//   //       const txFound = block.transactions.find(
//   //         (r) => r.trx.id === transaction_id
//   //       )

//   //       if (txFound) {
//   //         //if tx is in block, check relation to retry_trx_num_blocks
//   //         const headInfo = await chain.rpc.get_info()

//   //         console.log("Blocks passed: ~" + (headInfo.head_block_num - tx.processed.block_num) + "/330", "LIB: " + headInfo.last_irreversible_block_num)

//   //         if (
//   //           (!retry_trx_num_blocks &&
//   //             headInfo.last_irreversible_block_num >= tx.processed.block_num) || // passed lib
//   //           (retry_trx_num_blocks &&
//   //             headInfo.head_block_num - tx.processed.block_num >=
//   //               retry_trx_num_blocks) // passed blocks specified
//   //         ) { finished = true }
//   //       } else if (!txFound) {
//   //         //if tx is not in block, resubmit packed tx
//   //         try {
//   //           tx = await chain.rpc.send_transaction(packedTx)
//   //           console.log("after dublicate", tx)

//   //           console.log(
//   //             "tx not found in block (fork/stale block), resubmitted tx",
//   //             tx
//   //           )
//   //         } catch (ex) {
//   //           //handle duplicate tx error, in case it auto got included in next block than reported, check next block and so on
//   //           console.log(ex)
//   //           //TODO verify exception is duplicate tx error
//   //           tx.processed.block_num++
//   //           console.log(
//   //             "exception resubmitting duplicate tx, incremented block number to find tx",
//   //             tx.processed.block_num
//   //           )
//   //         }
//   //       }
//   //     } catch (ex) {
//   //       console.log("lost internet, retrying", ex)
//   //     }
//   //   } // end of while
//   //   if (retry_trx_num_blocks) return tx //return tx if we dont need to worry about correct global action

//   //   return new Promise((resolve, reject) => {
//   //     const ws = new WebSocket(this.source.ibc.proofSocket)
//   //     ws.addEventListener("open", (event) =>
//   //       ws.send(
//   //         JSON.stringify({
//   //           type: "getBlockActions",
//   //           block_to_prove: tx.processed.block_num
//   //         })
//   //       )
//   //     )

//   //     ws.addEventListener("message", (event) => {
//   //       const res = JSON.parse(event.data)
//   //       console.log("res", res)
//   //       const firhoseTx = res.txs.find((r) =>
//   //         r.find((s) => s.transactionId === transaction_id)
//   //       )
//   //       console.log("firhoseTx", firhoseTx)
//   //       const firehoseEmitxfer = firhoseTx.find(
//   //         (r) => r.action.name === "emitxfer"
//   //       )
//   //       console.log("firehoseEmitxfer", firehoseEmitxfer)
//   //       const emitxferAction = tx.processed.action_traces.find(
//   //         (r) => r.act.name === "emitxfer"
//   //       )
//   //       console.log(
//   //         "api emitxferAction receipt",
//   //         JSON.parse(JSON.stringify(emitxferAction.receipt))
//   //       )

//   //       emitxferAction.receipt = firehoseEmitxfer.receipt
//   //       const auth_sequence = []
//   //       for (const auth of emitxferAction.receipt.auth_sequence) { auth_sequence.push([auth.account, auth.sequence]) }
//   //       emitxferAction.receipt.auth_sequence = auth_sequence
//   //       console.log("bp emitxferAction receipt", firehoseEmitxfer.receipt)
//   //       resolve(tx)
//   //     })
//   //   })
//   // }


//   getProof(blockToProve:number, params:GetProofParams = { type: "heavyProof" }) {
//     console.log("get proof txID: ", params?.action?.trx_id)
//     const proofSocket = pickRand(this.source.config.proofSockets)

//     return new Promise((resolve) => {
//       //initialize socket to proof server
//       const ws = new WebSocket(proofSocket)
//       ws.addEventListener("open", (event) => {
//         // connected to websocket server
//         const query = { type: params.type, blockToProve, action_receipt: null }
//         if (params.action) query.action_receipt = params.action.receipts[0] as any
//         ws.send(JSON.stringify(query))
//       })

//       //messages from websocket server
//       ws.addEventListener("message", (event) => {
//         const res = JSON.parse(event.data)
//         //log non-progress messages from ibc server
//         if (res.type !== "progress") { console.log("Received message from ibc proof server", res) }
//         if (res.type == "progress") {
//           if (params.onProgress) params.onProgress(res.progress)
//           console.log("progress", res.progress)
//         }

//         if (res.type !== "proof") return

//         ws.close() // we got the proof so close the socket
//         // TODO implement this
//         let isNative = true
//         let ibctkn:IbcToken

//         //handle issue/withdraw if proving transfer/retire 's emitxfer action, else submit block proof to bridge directly (for schedules)
//         const actionToSubmit = {
//           authorization: [this.destination.config.worker.account + "@" + this.destination.config.worker.permission],
//           name: !params.action
//             ? "checkproofd"
//             : isNative
//               ? "issuea"
//               : "withdrawa",
//           account: !params.action
//             ? this.destination.config.contracts.bridge
//             : isNative
//               ? this.asset.pairedWrapTokenContract
//               : this.asset.wrapLockContract,
//           data: { ...res.proof, prover: this.destinationWallet.name }
//         }

//         console.log("actionToSubmit", actionToSubmit)

//         //if proving an action, add action and formatted receipt to actionproof object
//         if (action) {
//           const auth_sequence = []

//           console.log("1")
//           for (const authSequence of action.receipt.auth_sequence) {
//             auth_sequence.push({
//               account: authSequence[0],
//               sequence: authSequence[1]
//             })
//           }

//           console.log("2")
//           actionToSubmit.data.actionproof = {
//             ...res.proof.actionproof,
//             action: {
//               account: action.act.account,
//               name: action.act.name,
//               authorization: action.act.authorization,
//               data: action.act.hex_data
//             },
//             receipt: { ...action.receipt, auth_sequence }
//           }
//         }
//         console.log("3")
//         resolve(actionToSubmit)
//       })
//     })
//   }

//   async getScheduleProofs(transferBlock) {
//     async function getProducerScheduleBlock(blocknum) {
//       try {
//         let header = await this.source.rpc.get_block(blocknum)
//         const target_schedule = header.schedule_version

//         let min_block = 2
//         //fetch last proved block to use as min block for schedule change search
//         const lastBlockProved = await this.destination.rpc.get_table_rows({
//           code: this.destination.ibc.bridgeContract,
//           table: "lastproofs",
//           scope: this.source.ibc.name,
//           limit: 1,
//           reverse: true,
//           show_payer: false
//         })

//         if (lastBlockProved && lastBlockProved.rows[0]) { min_block = lastBlockProved.rows[0].block_height }

//         let max_block = blocknum

//         //detect active schedule change
//         while (max_block - min_block > 1) {
//           blocknum = Math.round((max_block + min_block) / 2)
//           try {
//             header = await this.source.rpc.get_block(blocknum)
//             if (header.schedule_version < target_schedule) min_block = blocknum
//             else max_block = blocknum
//           } catch (ex) {
//             console.log("Internet connection lost, retrying")
//           }
//         }

//         if (blocknum > 337) blocknum -= 337

//         //search before active schedule change for new_producer_schedule
//         while (
//           blocknum < max_block &&
//           !("new_producer_schedule" in header) &&
//           !header.new_producers
//         ) {
//           try {
//             header = await this.source.rpc.get_block(blocknum)
//             blocknum++
//           } catch (ex) {
//             console.log("Internet connection lost, retrying")
//           }
//         }

//         blocknum = header.block_num
//         return blocknum
//       } catch (ex) {
//         console.log("getProducerScheduleBlock ex", ex)
//         return null
//       }
//     }

//     const proofs = []
//     const bridgeScheduleData = await this.destination.rpc.get_table_rows({
//       code: this.destination.ibc.bridgeContract,
//       table: "schedules",
//       scope: this.source.ibc.name,
//       limit: 1,
//       reverse: true,
//       show_payer: false
//     })

//     console.log("bridgeScheduleData", bridgeScheduleData)

//     let last_proven_schedule_version = 0
//     // if (bridgeScheduleData.rows.length > 0) last_proven_schedule_version = bridgeScheduleData.rows[0].producer_schedule.version;
//     if (bridgeScheduleData.rows.length > 0) { last_proven_schedule_version = bridgeScheduleData.rows[0].version }
//     if (!last_proven_schedule_version) { return console.log("No Schedule Found in Contract!") }

//     console.log("Last proved source schedule:", last_proven_schedule_version)

//     const schedule = await this.source.rpc.get_producer_schedule()

//     let schedule_version = parseInt(schedule.active.version)
//     console.log("Source active schedule:", schedule_version)
//     console.log("Pending schedule:", schedule.pending ? "True" : "False")

//     const head = (await this.source.rpc.get_info()).head_block_num

//     let schedule_block = head + 0

//     console.log("head", head)

//     while (schedule_version > last_proven_schedule_version) {
//       const block_num = await getProducerScheduleBlock(schedule_block)
//       if (!block_num) return //should never occur

//       const proof = await this.getProof({ block_to_prove: block_num })
//       schedule_version =
//         proof.data.blockproof.blocktoprove.block.header.schedule_version
//       schedule_block = block_num
//       proofs.unshift(proof)
//     }

//     // check for pending schedule and prove pending schedule if found;
//     if (schedule.pending) {
//       let newPendingBlockHeader = null
//       let currentBlock = transferBlock + 0

//       while (!newPendingBlockHeader) {
//         const bHeader = await this.source.rpc.get_block(currentBlock)
//         if (bHeader.new_producer_schedule) newPendingBlockHeader = bHeader
//         else currentBlock--
//       }

//       const pendingProof = await this.getProof({
//         block_to_prove: newPendingBlockHeader.block_num
//       })

//       proofs.push(pendingProof) //push pending after proving active
//     }

//     return proofs
//   }
// }
