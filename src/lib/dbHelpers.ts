import db from "lib/db"
import { IbcOrder } from "lib/types/antelopex.system.types"
import { ChainKey } from "lib/types/ibc.types"
import { IBCOrder } from "@prisma/client"


export function newIBCOrder(chain:ChainKey, order:IbcOrder) {
  return db.iBCOrder.create({ data: { blockNum: order.block_num.toNumber(), originChain: chain, originTxid: order.trxid.toString() }})
}

export function addIBCOrderError(order:IbcOrder, error:Error) {
  return db.iBCOrder.update({ where: { originTxid: order.trxid.toString() }, data: { relayError: error.toString() }})
}

export function orderRelayed(order:IbcOrder, detinationTxid:string, destinationChain:ChainKey) {
  return db.iBCOrder.update({ where: { originTxid: order.trxid.toString() }, data: { relayed: true, detinationTxid, destinationChain, shouldRetry: false }})
}


export function UpdateOrderError(order:IbcOrder, error:Error) {
  const errMsg = error.toString()
  const parsed = errMsg.split("Error: assertion failure with message: action already proved")
  const errString = parsed[1] || errMsg
  const proved = errMsg.includes("action already proved")
  if (proved) return db.iBCOrder.update({ where: { originTxid: order.trxid.toString() }, data: { relayed: true, shouldRetry: false }})
  else return addIBCOrderError(order, new Error(errString))
}
