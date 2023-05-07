
import { Action } from "@greymass/eosio"
import { ChainClient, chainClients, getChainClient } from "lib/eosio"
import { FirehoseClient } from "lib/firehose"
import { HypAction } from "lib/hyp"
import { getIbcToken, getProof, getScheduleProofs, makeBridgeProofAction, makeTransferProofAction } from "lib/ibcUtil"
import logger from "lib/logger"
import { IbcOrder } from "lib/types/antelopex.system.types"
import { ActionTrace } from "lib/types/firehoseTypes"
import { ActionReceipt, ChainKey } from "lib/types/ibc.types"
import { Emitxfer } from "lib/types/wraplock.types"
const log = logger.getLogger("checkOrders")
const pCore = (el:object) => JSON.parse(JSON.stringify(el))


async function handleIBCTransfer(act:HypAction<unknown>) {
  const log = logger.getLogger("handleIBCTransfer")
}

// const fh = new FirehoseClient("telos")

// console.log(Object.keys(fh.client))
// setTimeout(async() => { }, 10000)
try {
  for (const client of Object.values(chainClients)) { // eslint-disable-line no-unreachable-loop
    log.info("client:", client.config.chain)
    const fh = new FirehoseClient(client.config.chain)
    // console.log(fh.client)
    // setTimeout(async() => { }, 10000)

    const conf = client.config
    const orders = await client.getFullTable({ tableName: "ibcorders", contract: conf.contracts.system }, IbcOrder)
    console.log(orders.length)

    for (const order of orders) {
      console.log("checking order:", JSON.stringify(order, null, 2))
      log.info(order.block_num.toString())

      const block = await fh.getFirehoseBlock({
        firehoseOptions: {
          start_block_num: order.block_num.toNumber(),
          stop_block_num: order.block_num.toNumber(),
          fork_steps: ["STEP_IRREVERSIBLE"],
          include_filter_expr: ""
        }
      })
      const trx = block.block.unfilteredTransactionTraces.find(el => el.id == order.trxid.toString())
      if (!trx) {
        log.error("can't find transaction:", order.trxid.toString())
        continue
      }
      const act:ActionTrace|undefined = trx.actionTraces.find(el => el.action.name == "emitxfer")
      if (!act) {
        log.error("can't find action:", order.trxid.toString())
        continue
      }
      // console.log(act)

      const xferAct = Emitxfer.from(JSON.parse(act.action.jsonData))
      const sym = xferAct.xfer.quantity.quantity.symbol
      const ibcToken = getIbcToken(sym)
      let targetChain = Object.entries(ibcToken.nativeWraplockContract).find(el => el[1] === act?.action.account)
      if (!targetChain) {
        log.error("can't find target chain", act.action)
        continue
      }
      let targetChainName = targetChain[0] as ChainKey
      const action_receipt:ActionReceipt = {
        abi_sequence: act.receipt.abiSequence,
        act_digest: act.receipt.digest,
        auth_sequence: act.receipt.authSequence.map(el => { return [el.accountName, el.sequence] }),
        code_sequence: act.receipt.codeSequence,
        global_sequence: act.receipt.globalSequence,
        receiver: act.receipt.receiver,
        recv_sequence: act.receipt.recvSequence
      }
      const destChainClient:ChainClient = getChainClient(targetChainName)
      const scheduleProofs = await getScheduleProofs(client.config.chain, destChainClient.config.chain, order.block_num.toNumber())
      console.log("schedule proofs:", scheduleProofs)

      // const emitxferProof = await getProof(parseInt(act.blockNum), client, destChainClient, action_receipt)
      // if (!emitxferProof || !emitxferProof.actionproof) {
      //   log.error("can't find proof:", order.trxid.toString())
      //   continue
      // }
      // log.info("Action Proof:", JSON.stringify(emitxferProof?.actionproof, null, 2))
      const scheduleProofActions = scheduleProofs.map(el => makeBridgeProofAction(el, client.config.chain, destChainClient.config.chain))
      log.info("Schedule Proof Actions:", JSON.stringify(scheduleProofActions, null, 2))
      // const emitxferProofAction = makeTransferProofAction(act, emitxferProof, ibcToken, client.config.chain, destChainClient.config.chain)
      // // log.info("Emitxfer Proof Action:", JSON.stringify(emitxferProofAction, null, 2))
      // const destinationActions:Action[] = [...scheduleProofActions, emitxferProofAction]
      // // log.info("Destination Actions:", JSON.stringify(destinationActions, null, 2))
      // const signedTrx = await destChainClient.signActions(destinationActions)
      // const result = await destChainClient.pushTrx(signedTrx)
      // log.info("result:", result)
    }

    break
  }
} catch (error) {
  log.error("error:", error)
  // console.log(JSON.stringify(error, null, 2))
}

// const hyp = getHypClient(conf.chain)
//   const trx = await hyp.getTrx(order.trxid.toString())
//   if (!trx) {
//     log.error("can't find transaction:", order.trxid.toString())
//     continue
//   }
//   let act = trx.actions.find(el => el.act.name == "emitxfer")
//   if (act) {
//     const xferAct = Emitxfer.from(act.act.data)
//     const sym = xferAct.xfer.quantity.quantity.symbol
//     const ibcToken = getIbcToken(sym)
//     // log.info(ibcToken)
//     const targetChain = Object.entries(ibcToken.nativeWraplockContract).find(el => el[1] === act?.act.account)
//     if (!targetChain) {
//       log.error("can't find target chain", act.act)
//       continue
//     }
//     const destChainClient:ChainClient = getChainClient[targetChain[0]]
// const



// }




// const proof = await getProof(order.block_num.toNumber(), client, getChainClient())



// console.log(xferAct)
//   }
//   break
// }


// function fn() {
//   return null as unknown as number|undefined
// }

// const result = fn()
// if (!result) console.log("should be narrowed")
// else {
//   let test = result
// }
