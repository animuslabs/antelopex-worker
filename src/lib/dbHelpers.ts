import db from "lib/db"
import { IbcOrder, IbcSpecialOrder } from "lib/types/antelopex.system.types"
import { ChainKey } from "lib/types/ibc.types"
import { IBCOrder, SpecialOrder } from "@prisma/client"


function shouldRetry(errorMsg:string) {
  if (errorMsg.includes("Action emitxfer not found in transaction")) return false
  return true
}

export function newIBCOrder(chain:ChainKey, order:IbcOrder) {
  return db.iBCOrder.create({ data: { blockNum: order.block_num.toNumber(), originChain: chain, originTxid: order.trxid.toString() }})
}
export function newIBCSpecialOrder(chain:ChainKey, order:IbcSpecialOrder) {
  return db.specialOrder.create({ data: { blockNum: order.block_num.toNumber(), originChain: chain, originTxid: order.trxid.toString(), orderId: order.id.value }})
}

export function addIBCOrderError(order:IbcOrder, error:Error) {
  return db.iBCOrder.update({ where: { originTxid: order.trxid.toString() }, data: { relayError: error.toString(), shouldRetry: shouldRetry(error.message) }})
}
export function addIBCSpecialOrderError(order:IbcSpecialOrder, error:Error) {
  return db.specialOrder.update({ where: { originTxid: order.trxid.toString() }, data: { relayError: error.toString(), shouldRetry: shouldRetry(error.message) }})
}

export function orderRelayed(order:IbcOrder, detinationTxid:string, destinationChain:ChainKey) {
  return db.iBCOrder.update({ where: { originTxid: order.trxid.toString() }, data: { relayed: true, detinationTxid, destinationChain, shouldRetry: false }})
}
export function specialOrderRelayed(order:IbcSpecialOrder, detinationTxid:string, destinationChain:ChainKey) {
  return db.specialOrder.update({ where: { originTxid: order.trxid.toString() }, data: { relayed: true, detinationTxid, destinationChain, shouldRetry: false }})
}


export function UpdateOrderError(order:IbcOrder, error:Error) {
  const errMsg = error.toString()
  const parsed = errMsg.split("Error: assertion failure with message: action already proved")
  const errString = parsed[1] || errMsg
  const proved = errMsg.includes("action already proved")
  if (proved) return db.iBCOrder.update({ where: { originTxid: order.trxid.toString() }, data: { relayed: true, shouldRetry: false }})
  else return addIBCOrderError(order, new Error(errString))
}
export function UpdateSpecialOrderError(order:IbcSpecialOrder, error:Error) {
  const errMsg = error.toString()
  const parsed = errMsg.split("Error: assertion failure with message: action already proved")
  const errString = parsed[1] || errMsg
  const proved = errMsg.includes("action already proved")
  if (proved) return db.specialOrder.update({ where: { originTxid: order.trxid.toString() }, data: { relayed: true, shouldRetry: false }})
  else return addIBCSpecialOrderError(order, new Error(errString))
}
