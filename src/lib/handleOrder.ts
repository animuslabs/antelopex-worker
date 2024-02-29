import { Action } from "@greymass/eosio"
import { proveSchedules } from "lib/ proveScheduleChange"
import { UpdateOrderError, UpdateSpecialOrderError, addIBCOrderError, addIBCSpecialOrderError, orderRelayed, specialOrderRelayed } from "lib/dbHelpers"
import { ChainClient } from "lib/eosio"
import { getIBCToken } from "lib/ibcTokens"
import { getDestinationChain, getEmitXferMeta, getProof, makeXferProveAction } from "lib/ibcUtil"
import logger from "lib/logger"
import { IbcOrder, IbcSpecialOrder } from "lib/types/antelopex.system.types"
import { ProofData, ProofRequestType } from "lib/types/ibc.types"
import { Emitxfer } from "lib/types/wraplock.types"
import { throwErr } from "lib/utils"
const log = logger.getLogger("handleSpecialOrder")

export async function handleOrder(order:IbcSpecialOrder|IbcOrder, client:ChainClient) {
  const specialOrder = "id" in order
  try {
    log.debug(`Processing special order: ${order.trxid.toString()}`) // DEBUG log
    const data = await getEmitXferMeta(client, order.trxid.toString(), order.block_num.toNumber())
    const sym = data.action.decodeData(Emitxfer).xfer.quantity.quantity.symbol
    const tknRow = await getIBCToken(client, sym)
    let toChain:ChainClient = await getDestinationChain(tknRow, client.name, data.action.account)
    const lastProvenBlockRows = await toChain.getTableRowsJson({ reverse: true, json: true, code: "ibc.prove", scope: client.name, table: "lastproofs", limit: 1 })
    const lastBlockProvedRes = lastProvenBlockRows[0]
    await proveSchedules(client, toChain).catch(log.error)
    let type:ProofRequestType
    if (!lastBlockProvedRes) type = "heavyProof"
    else if (lastBlockProvedRes.block_height > order.block_num) type = "lightProof"
    else type = "heavyProof"
    let proof:ProofData
    let action:Action
    if (type == "heavyProof") {
      proof = await getProof(client, data)
      action = await makeXferProveAction(client, toChain, data, proof, type)
    } else {
      proof = await getProof(client, data, lastBlockProvedRes.block_height)
      action = await makeXferProveAction(client, toChain, data, proof, type, lastBlockProvedRes.block_merkle_root)
    }
    console.log(JSON.stringify(action, null, 2))
    const result = await toChain.sendAction(action)
    log.debug(`Result for order ${order.trxid.toString()}: ${JSON.stringify(result)}`) // DEBUG log

    if (!result) throwErr("Null result")

    const receipt = result.receipts[0]
    if (!receipt) {
      const error = result.errors[0]?.error
      if (!error) throwErr("Receipt and error fields missing")
      log.error(`Error for order ${order.trxid.toString()}: ${error}`)
      specialOrder ? await UpdateSpecialOrderError(order, new Error(error)) : await UpdateOrderError(order, new Error(error))
      return
    } else {
      const txid = receipt.receipt.id
      log.debug(`Order ${order.trxid.toString()} relayed with transaction ID: ${txid}`) // DEBUG log
      specialOrder ? await specialOrderRelayed(order, txid, toChain.name) : await orderRelayed(order, txid, toChain.name)
    }
  } catch (error:any) {
    log.error(`Exception caught for order ${order.trxid.toString()}: ${error.message}`)
    specialOrder ? await addIBCSpecialOrderError(order, error) : await addIBCOrderError(order, error)
  }
}
