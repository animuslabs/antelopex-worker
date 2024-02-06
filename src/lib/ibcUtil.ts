import { Action, Asset, Checksum256, NameType, UInt32, UInt64 } from "@greymass/eosio"
import fs from "fs-extra"
import { actions } from "lib/actions"
import { ChainClient, getChainClient } from "lib/eosio"
import { HypAction, getHypClient, hypClients } from "lib/hyp"
import { getIBCToken } from "lib/ibcTokens"
import { ProofData, ActionReceipt, ChainKey, ProofDataResult, GetProofQuery, ProofRequestType, ProofQuery } from "lib/types/ibc.types"
import { Emitxfer } from "lib/types/wraplock.types"
import { throwErr, toObject } from "lib/utils"
import WebSocket from "ws"
import logger from "lib/logger"
import { IbcToken } from "lib/types/antelopex.system.types"
import { Chainschedule, Checkproofd, Heavyproof, Lastproof, Schedulev2 } from "lib/types/ibc.prove.types"
import { EosioConfig } from "lib/env"
const log = logger.getLogger("ibcUtil")

export async function getEmitXferMeta(chain:ChainClient, txId:string, blockNum:number):Promise<GetProofQuery> {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(chain.getProofSocket())
    ws.addEventListener("open", (event) => {
      const query = { type: "getBlockActions", block_to_prove: blockNum }
      ws.send(JSON.stringify(query))
    })

    ws.addEventListener("error", (event) => {
      log.debug(`WebSocket error: ${event.message}`) // DEBUG log
    })

    ws.addEventListener("message", (event:any) => {
      // log.debug(event) // DEBUG log

      const res = JSON.parse(event.data)
      log.debug("Received message from ibc getBlockActions", res) // DEBUG log

      if (res.type === "error") reject(new Error(res.error))
      if (res.type !== "getBlockActions") return
      ws.close()
      const action_receipt = res.txs.filter((t:any) => t[0].transactionId.toUpperCase() === txId.toUpperCase())
      if (action_receipt.length !== 1) throwErr("Action receipt for trx with txId", txId, "not found in block", blockNum, action_receipt)
      const action_data = action_receipt[0].find((a:any) => a.action.name === "emitxfer")
      if (!action_data) throwErr("Action emitxfer not found in transaction")
      log.debug(action_data.action)
      if (!action_data.action.data) action_data.action.data = [0]
      const actionData = Action.from(action_data.action)
      const actionReceipt = action_data.receipt
      const action_receipt_digest = action_data.action_receipt_digest
      resolve({ action: actionData, action_receipt_digest, block_to_prove: blockNum, actionReceipt })
    })
  })
}

export async function getProof(chain:ChainClient, queryData:GetProofQuery, last_proven_block?:number):Promise<ProofData> {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(chain.getProofSocket())
    const type = last_proven_block ? "lightProof" : "heavyProof" // if we don't have last_proven_block then request heavy proof
    ws.addEventListener("open", (event) => {
      // connected to websocket server
      const query:Partial<ProofQuery> = { type, block_to_prove: queryData.block_to_prove }
      if (queryData.action_receipt_digest) query.action_receipt_digest = queryData.action_receipt_digest
      if (type == "lightProof") query.last_proven_block = last_proven_block
      query.action_receipt = queryData.actionReceipt
      let auth_sequence = []
      for (let authSequence of query.action_receipt?.auth_sequence as any) auth_sequence.push(Object.values(authSequence))
      if (query.action_receipt) query.action_receipt.auth_sequence = auth_sequence
      ws.send(JSON.stringify(query))
    })

    // messages from websocket server
    ws.addEventListener("message", (event:any) => {
      const res = JSON.parse(event.data)
      log.debug("Received message from ibc proof server", res) // DEBUG log

      if (res.type === "error") reject(new Error(res.error))
      if (res.type !== "proof") return
      ws.close()
      let typedProof:ProofDataResult = res
      resolve(typedProof.proof)
    })
  })
}

export async function getDestinationChain(tknRow:IbcToken, fromChainName:ChainKey, xferActionContract:NameType):Promise<ChainClient> {
  let nativeChainName = tknRow.native_chain.toString()
  if (nativeChainName === "telos") nativeChainName = "tlos"
  if (fromChainName as string === "telos") fromChainName = "tlos"
  const toNative = nativeChainName != fromChainName
  if (toNative) return getChainClient(nativeChainName as ChainKey)
  else {
    const wlConfig = tknRow.wraplock_contracts.find(el => el.contract.toString() === xferActionContract.toString())
    if (!wlConfig) throwErr("No valid wraplock contract for sym contract", tknRow.symbol.toString(), xferActionContract.toString())
    return getChainClient(wlConfig.destination_chain.toString() as ChainKey)
  }
}

export async function makeXferProveAction(fromChain:ChainClient, toChain:ChainClient, requestData:GetProofQuery, proofData:ProofData, type:ProofRequestType = "heavyProof", block_merkle_root?:string) {
  if (type === "lightProof" && !block_merkle_root) throwErr("Block merkle root required for lightProof")
  const sym = requestData.action.decodeData(Emitxfer).xfer.quantity.quantity.symbol
  if (!proofData.actionproof) throwErr("No action proof found in proofData")
  let auth_sequence = []
  for (let authSequence of requestData.actionReceipt.auth_sequence) auth_sequence.push({ account: authSequence[0], sequence: authSequence[1] })
  requestData.actionReceipt.auth_sequence = auth_sequence
  let data:any = { ...proofData }
  data.actionproof = {
    ...proofData.actionproof,
    action: toObject(requestData.action),
    receipt: { ...requestData.actionReceipt }
  }
  console.log("data:", data)

  let act:Action
  const tknRow = await getIBCToken(fromChain, sym)
  let fromChainName:string = fromChain.name
  if (fromChainName === "tlos") fromChainName = "telos"
  const toNative = tknRow.native_chain.toString() != fromChainName
  // fs.writeJsonSync("../data.json", data)
  if (toNative) {
    // destinationChain = getChainClient(tknRow.native_chain.toString() as ChainKey)
    const destinationTokenRow = await getIBCToken(toChain, sym)
    console.log(JSON.stringify(destinationTokenRow, null, 2))

    const wlContract = destinationTokenRow.wraplock_contracts.find(el => el.destination_chain.toString() === fromChainName)
    console.log(fromChain.name)
    console.log(JSON.stringify(destinationTokenRow, null, 2))
    if (!wlContract) throwErr("No matching wraplock contract found for sym", sym.toString(), fromChainName)
    if (type == "lightProof") {
      data.blockproof.root = block_merkle_root
      act = actions.lockToken.withdrawB(data, wlContract.contract, tknRow.native_chain.toString() as ChainKey)
    } else act = actions.lockToken.withdrawA(data, wlContract.contract, tknRow.native_chain.toString() as ChainKey)
  } else {
    // const wlConfig = tknRow.wraplock_contracts.find(el => el.contract.toString() === contract)
    // if (!wlConfig) throwErr("No valid wraplock contract for sym contract", sym, contract)
    // destinationChain = getChainClient(wlConfig.destination_chain.toString() as ChainKey)
    const destinationTokenRow = await getIBCToken(toChain, sym)
    log.debug(toChain.name, toObject(destinationTokenRow)) // DEBUG log
    // if (type == "lightProof") proofData. = lastBlockProvedRes.block_merkle_root
    if (type == "lightProof") {
      data.blockproof.root = block_merkle_root
      act = actions.wrapToken.issueB(data, destinationTokenRow.token_contract, toChain.name)
    } else act = actions.wrapToken.issueA(data, destinationTokenRow.token_contract, toChain.name)
  }
  return act
}

async function getChainLastProved(chain:ChainClient) {
  const res = await chain.getTableRows({
    code: chain.config.contracts.bridge,
    table: "lastproofs",
    scope: chain.name,
    limit: 1,
    reverse: true,
    show_payer: false,
    json: true,
    type: Lastproof
  })
  return res[0]
}

async function getProducerScheduleBlock(chain:ChainClient, blockNum:number):Promise<UInt32> {
  try {
    const block = await chain.getBlock({ block_num_or_id: blockNum })
    let targetSchedule = block.schedule_version
    log.debug("target_schedule", targetSchedule)

    const lastBlockProvedRes = await getChainLastProved(chain)
    if (!lastBlockProvedRes) throwErr(`No lastBlockProvedRes found for chain ${chain.name}`)
    let minBlock = lastBlockProvedRes.block_height.toNumber() || 2
    log.debug("min_block", minBlock)
    let maxBlock = blockNum

    while (maxBlock - minBlock > 1) {
      blockNum = Math.round((maxBlock + minBlock) / 2)
      const block = await chain.getBlock({ block_num_or_id: blockNum })
      if (block.schedule_version < targetSchedule) {
        minBlock = blockNum
      } else {
        maxBlock = blockNum
      }
    }

    if (blockNum > 337) blockNum -= 337

    let scheduleFound = block.new_producers
    let bCount = 0 // Since header already checked once above

    while (blockNum < maxBlock && !scheduleFound) {
      blockNum++
      bCount++
      const block = await chain.getBlock({ block_num_or_id: blockNum })
      scheduleFound = block.new_producers
    }

    if (!scheduleFound) {
      blockNum -= 337 + bCount
      do {
        blockNum--
        const block = await chain.getBlock({ block_num_or_id: blockNum })
        scheduleFound = block.new_producers
      } while (!scheduleFound)
    }
    return block.block_num
  } catch (error) {
    throwErr("getProducerScheduleBlock", error)
  }
}

export async function getScheduleProofs(sourceChain:ChainClient, destinationChain:ChainClient):Promise<ProofData[]> {
  const info = await sourceChain.getInfo()
  const lib = info.last_irreversible_block_num
  const proofs:ProofData[] = []

  const bridgeScheduleData = (await destinationChain.getTableRows({
    code: destinationChain.config.contracts.bridge,
    table: "schedules",
    scope: sourceChain.name,
    limit: 1,
    reverse: true,
    show_payer: false,
    json: true,
    type: Chainschedule
  }))[0]

  let lastProvenScheduleVersion = bridgeScheduleData?.version
  if (!lastProvenScheduleVersion) throwErr("Missing lastProvenScheduleVersion")
  log.debug("Last proved source schedule:", lastProvenScheduleVersion.toString())

  const sourceSchedule = await sourceChain.getProducerSchedule()
  let scheduleVersion = sourceSchedule.active.version
  log.debug("Source active schedule:", scheduleVersion)

  let scheduleBlock = lib
  while (scheduleVersion > lastProvenScheduleVersion.toNumber()) {
    let blockNum = await getProducerScheduleBlock(sourceChain, scheduleBlock.toNumber())

    const proofQueryData:GetProofQuery = { block_to_prove: blockNum.toNumber() } as GetProofQuery // Simplified, adapt according to actual needs
    const proof = await getProof(sourceChain, proofQueryData) // Assuming getProof function exists and operates similarly to described
    if (!proof) throwErr("proof not found for block", blockNum)

    scheduleVersion = proof.blockproof.blocktoprove.block.header.schedule_version
    scheduleBlock = UInt32.from(blockNum)
    proofs.unshift(proof)
  };

  return proofs
}

export function makeScheduleProofAction(proof:ProofData, destinationConfig:EosioConfig):Action {
  return actions.bridge.checkproofD(Heavyproof.from(proof.blockproof), destinationConfig.chain)
}
